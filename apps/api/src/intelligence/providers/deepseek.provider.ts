import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash';
export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

export type DeepSeekFailureCategory =
  'authentication' | 'rate_limit' | 'provider' | 'network' | 'empty_response' | 'invalid_output';

export class DeepSeekProviderError extends Error {
  constructor(
    message: string,
    readonly category: DeepSeekFailureCategory,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'DeepSeekProviderError';
  }
}

@Injectable()
export class DeepSeekProvider {
  private readonly logger = new Logger(DeepSeekProvider.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.getOrThrow<string>('DEEPSEEK_API_KEY').trim();
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is required to initialize meeting intelligence.');
    }

    this.model = config.get<string>('DEEPSEEK_MODEL')?.trim() || DEFAULT_DEEPSEEK_MODEL;
    const baseURL = config.get<string>('DEEPSEEK_BASE_URL')?.trim() || DEFAULT_DEEPSEEK_BASE_URL;
    this.client = new OpenAI({
      apiKey,
      baseURL,
      timeout: config.get<number>('DEEPSEEK_TIMEOUT_MS', 120_000),
      maxRetries: 0,
    });
  }

  get modelName(): string {
    return this.model;
  }

  async completeJson(operation: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const startedAt = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      const content = response.choices[0]?.message?.content;

      if (typeof content !== 'string' || content.trim().length === 0) {
        throw new DeepSeekProviderError(
          'DeepSeek returned an empty response.',
          'empty_response',
          true,
        );
      }

      this.logger.log(
        `DeepSeek request completed operation=${operation} model=${this.model} durationMs=${Date.now() - startedAt}`,
      );
      return content;
    } catch (error) {
      const mappedError = this.mapError(error);
      this.logger.warn(
        `DeepSeek request failed operation=${operation} model=${this.model} category=${mappedError.category} retryable=${mappedError.retryable} durationMs=${Date.now() - startedAt}`,
      );
      throw mappedError;
    }
  }

  private mapError(error: unknown): DeepSeekProviderError {
    if (error instanceof DeepSeekProviderError) return error;

    const status = this.statusOf(error);
    if (status === 401 || status === 403) {
      return new DeepSeekProviderError(
        'Meeting intelligence authentication is not configured correctly.',
        'authentication',
        false,
      );
    }
    if (status === 400 || status === 404) {
      return new DeepSeekProviderError(
        'The configured DeepSeek model or request format was rejected.',
        'provider',
        false,
      );
    }
    if (status === 429) {
      return new DeepSeekProviderError(
        'Meeting intelligence is temporarily rate limited and will retry automatically.',
        'rate_limit',
        true,
      );
    }
    if (typeof status === 'number' && status >= 500) {
      return new DeepSeekProviderError(
        'The meeting intelligence provider is temporarily unavailable.',
        'provider',
        true,
      );
    }

    const code = this.codeOf(error);
    if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ECONNREFUSED') {
      return new DeepSeekProviderError(
        'The meeting intelligence provider could not be reached.',
        'network',
        true,
      );
    }

    return new DeepSeekProviderError(
      'Meeting intelligence failed. Retry processing when the service is available.',
      'network',
      true,
    );
  }

  private statusOf(error: unknown): number | null {
    if (typeof error !== 'object' || error === null || !('status' in error)) return null;
    const status = Number(error.status);
    return Number.isFinite(status) ? status : null;
  }

  private codeOf(error: unknown): string | null {
    if (typeof error !== 'object' || error === null || !('code' in error)) return null;
    return typeof error.code === 'string' ? error.code : null;
  }
}
