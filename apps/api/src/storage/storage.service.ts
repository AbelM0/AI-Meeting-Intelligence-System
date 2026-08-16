import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AudioUploadAuthorization } from '@meeting-intelligence/types';

export type StoredObjectMetadata = {
  size: number | null;
  contentType: string | null;
};

@Injectable()
export class StorageService {
  private client: SupabaseClient | null = null;
  private bucketVerified: Promise<void> | null = null;

  constructor(private readonly config: ConfigService) {}

  get bucket(): string {
    return (
      this.config.get<string>('SUPABASE_STORAGE_BUCKET') ||
      this.config.get<string>('SUPABASE_AUDIO_BUCKET', 'meeting-audio')
    );
  }

  async createSignedUpload(path: string): Promise<AudioUploadAuthorization> {
    await this.verifyPrivateBucket();
    const { data, error } = await this.getClient()
      .storage.from(this.bucket)
      .createSignedUploadUrl(path, { upsert: false });

    if (error) {
      throw new ServiceUnavailableException('Unable to authorize the audio upload.');
    }

    return {
      bucket: this.bucket,
      path: data.path,
      token: data.token,
    };
  }

  async createSignedReadUrl(path: string, expiresInSeconds = 300): Promise<string> {
    await this.verifyPrivateBucket();
    const { data, error } = await this.getClient()
      .storage.from(this.bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new ServiceUnavailableException('Unable to retrieve the private audio recording.');
    }

    return data.signedUrl;
  }

  async getObjectMetadata(path: string): Promise<StoredObjectMetadata> {
    await this.verifyPrivateBucket();
    const { data, error } = await this.getClient().storage.from(this.bucket).info(path);

    if (error || !data) {
      throw new BadRequestException('The uploaded audio object could not be verified.');
    }

    return {
      size: data.size ?? null,
      contentType: data.contentType ?? null,
    };
  }

  async removeObject(path: string): Promise<void> {
    const { error } = await this.getClient().storage.from(this.bucket).remove([path]);

    if (error) {
      throw new ServiceUnavailableException('Unable to remove the stored audio object.');
    }
  }

  async cleanupAbandonedUploads(
    folder: string,
    keepPath: string | null,
    olderThan: Date,
  ): Promise<number> {
    await this.verifyPrivateBucket();
    const { data, error } = await this.getClient()
      .storage.from(this.bucket)
      .list(folder, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'asc' },
      });
    if (error) throw new ServiceUnavailableException('Unable to inspect abandoned audio uploads.');
    const paths = (data ?? [])
      .filter((object) => {
        const path = `${folder}/${object.name}`;
        const createdAt = object.created_at ? new Date(object.created_at) : null;
        return (
          path !== keepPath &&
          createdAt !== null &&
          !Number.isNaN(createdAt.getTime()) &&
          createdAt < olderThan
        );
      })
      .map((object) => `${folder}/${object.name}`);
    if (paths.length === 0) return 0;
    const { error: removeError } = await this.getClient().storage.from(this.bucket).remove(paths);
    if (removeError)
      throw new ServiceUnavailableException('Unable to clean abandoned audio uploads.');
    return paths.length;
  }

  private getClient(): SupabaseClient {
    if (this.client) return this.client;

    const url = this.config.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !serviceRoleKey) {
      throw new InternalServerErrorException('Supabase storage is not configured.');
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: this.timeoutFetch },
    });
    return this.client;
  }

  private readonly timeoutFetch: typeof fetch = async (input, init) => {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error('Supabase request timed out.')),
      this.config.get<number>('SUPABASE_TIMEOUT_MS', 15_000),
    );
    const sourceSignal = init?.signal;
    const abortFromSource = () => controller.abort(sourceSignal?.reason);
    sourceSignal?.addEventListener('abort', abortFromSource, { once: true });

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
      sourceSignal?.removeEventListener('abort', abortFromSource);
    }
  };

  private async verifyPrivateBucket(): Promise<void> {
    this.bucketVerified ??= this.checkPrivateBucket();

    try {
      await this.bucketVerified;
    } catch (error) {
      this.bucketVerified = null;
      throw error;
    }
  }

  private async checkPrivateBucket(): Promise<void> {
    const { data, error } = await this.getClient().storage.getBucket(this.bucket);

    if (error || !data) {
      throw new ServiceUnavailableException('The audio storage bucket is unavailable.');
    }

    if (data.public) {
      throw new InternalServerErrorException('The audio storage bucket must be private.');
    }
  }
}
