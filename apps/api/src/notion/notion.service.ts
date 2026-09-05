import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { type AxiosRequestConfig } from 'axios';
import { createHash, randomBytes } from 'node:crypto';
import type { NotionConnection } from '@meeting-intelligence/database';
import type { NotionPageQueryInput } from '@meeting-intelligence/schemas';
import type {
  NotionConnectionStatus,
  NotionExportResult,
  NotionOAuthStart,
  NotionPageListResponse,
} from '@meeting-intelligence/types';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../database/prisma.service';
import { NotionTokenCipherService } from './notion-token-cipher.service';

const NOTION_API_BASE_URL = 'https://api.notion.com/v1';
const NOTION_API_VERSION = '2026-03-11';
const OAUTH_STATE_LIFETIME_MS = 10 * 60 * 1_000;
const NOTION_PAGE_SIZE = 50;
const NOTION_BLOCK_BATCH_SIZE = 100;
const NOTION_PAYLOAD_TARGET_BYTES = 450_000;
const NOTION_RICH_TEXT_LIMIT = 2_000;
const NOTION_MAX_RICH_TEXT_PARTS = 100;

type OAuthTokenResponse = {
  access_token: string;
  refresh_token: string;
  bot_id: string;
  workspace_id: string;
  workspace_name: string | null;
  workspace_icon: string | null;
};

type NotionPage = {
  object: 'page';
  id: string;
  url: string;
  in_trash?: boolean;
  is_archived?: boolean;
  properties?: Record<string, unknown>;
};

type NotionSearchResponse = {
  results: Array<NotionPage | { object: string }>;
  next_cursor: string | null;
};

type NotionBlock = Record<string, unknown>;

@Injectable()
export class NotionService {
  private readonly logger = new Logger(NotionService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly frontendUrl: string;
  private readonly timeout: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: NotionTokenCipherService,
    config: ConfigService,
  ) {
    this.clientId = config.getOrThrow<string>('NOTION_CLIENT_ID');
    this.clientSecret = config.getOrThrow<string>('NOTION_CLIENT_SECRET');
    this.redirectUri = config.getOrThrow<string>('NOTION_REDIRECT_URI');
    this.frontendUrl = config
      .getOrThrow<string>('FRONTEND_URL')
      .split(',')[0]
      .trim()
      .replace(/\/$/, '');
    this.timeout = config.get<number>('NOTION_TIMEOUT_MS', 15_000);
  }

  async status(userId: string): Promise<NotionConnectionStatus> {
    const connection = await this.prisma.notionConnection.findUnique({ where: { userId } });
    return connection
      ? {
          connected: true,
          workspaceId: connection.workspaceId,
          workspaceName: connection.workspaceName,
          workspaceIcon: connection.workspaceIcon,
        }
      : { connected: false };
  }

  async startOAuth(userId: string, meetingId: string): Promise<NotionOAuthStart> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: { id: true },
    });
    if (!meeting)
      throw new AppError('MEETING_NOT_FOUND', 'Meeting not found.', HttpStatus.NOT_FOUND);

    const state = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.notionOAuthState.deleteMany({
        where: { userId, expiresAt: { lt: new Date() } },
      }),
      this.prisma.notionOAuthState.create({
        data: {
          stateHash: this.hashState(state),
          userId,
          meetingId,
          expiresAt: new Date(Date.now() + OAUTH_STATE_LIFETIME_MS),
        },
      }),
    ]);

    const authorizationUrl = new URL(`${NOTION_API_BASE_URL}/oauth/authorize`);
    authorizationUrl.searchParams.set('owner', 'user');
    authorizationUrl.searchParams.set('client_id', this.clientId);
    authorizationUrl.searchParams.set('redirect_uri', this.redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('state', state);
    return { authorizationUrl: authorizationUrl.toString() };
  }

  async completeOAuth(input: { code?: string; state?: string; error?: string }): Promise<string> {
    if (!input.state || !/^[A-Za-z0-9_-]{40,128}$/.test(input.state)) {
      return `${this.frontendUrl}/meetings?notion=invalid_state`;
    }

    const stateHash = this.hashState(input.state);
    const oauthState = await this.prisma.notionOAuthState.findUnique({ where: { stateHash } });
    if (!oauthState) return `${this.frontendUrl}/meetings?notion=invalid_state`;

    const consumed = await this.prisma.notionOAuthState.deleteMany({ where: { stateHash } });
    if (consumed.count !== 1) return `${this.frontendUrl}/meetings?notion=invalid_state`;
    const returnUrl = `${this.frontendUrl}/meetings/${oauthState.meetingId}`;
    if (oauthState.expiresAt.getTime() <= Date.now()) return `${returnUrl}?notion=expired`;
    if (input.error) {
      return `${returnUrl}?notion=${input.error === 'access_denied' ? 'cancelled' : 'failed'}`;
    }
    if (!input.code) return `${returnUrl}?notion=failed`;

    try {
      const tokens = await this.exchangeAuthorizationCode(input.code);
      const existing = await this.prisma.notionConnection.findUnique({
        where: { userId: oauthState.userId },
      });
      if (existing) await this.revokeBestEffort(existing);

      await this.prisma.notionConnection.upsert({
        where: { userId: oauthState.userId },
        create: {
          userId: oauthState.userId,
          workspaceId: tokens.workspace_id,
          workspaceName: tokens.workspace_name,
          workspaceIcon: tokens.workspace_icon,
          botId: tokens.bot_id,
          encryptedAccessToken: this.cipher.encrypt(tokens.access_token),
          encryptedRefreshToken: this.cipher.encrypt(tokens.refresh_token),
        },
        update: {
          workspaceId: tokens.workspace_id,
          workspaceName: tokens.workspace_name,
          workspaceIcon: tokens.workspace_icon,
          botId: tokens.bot_id,
          encryptedAccessToken: this.cipher.encrypt(tokens.access_token),
          encryptedRefreshToken: this.cipher.encrypt(tokens.refresh_token),
        },
      });
      return `${returnUrl}?notion=connected`;
    } catch (error) {
      this.logger.warn(`Notion OAuth completion failed error=${this.errorName(error)}`);
      return `${returnUrl}?notion=failed`;
    }
  }

  async listPages(userId: string, query: NotionPageQueryInput): Promise<NotionPageListResponse> {
    try {
      const result = await this.withConnection(userId, (accessToken) =>
        this.notionRequest<NotionSearchResponse>({
          method: 'POST',
          url: `${NOTION_API_BASE_URL}/search`,
          headers: this.apiHeaders(accessToken),
          data: {
            page_size: NOTION_PAGE_SIZE,
            filter: { property: 'object', value: 'page' },
            sort: { direction: 'descending', timestamp: 'last_edited_time' },
            ...(query.query ? { query: query.query } : {}),
            ...(query.cursor ? { start_cursor: query.cursor } : {}),
          },
        }),
      );
      return {
        items: result.results
          .filter((page): page is NotionPage => page.object === 'page')
          .filter((page) => !page.in_trash && !page.is_archived)
          .map((page) => ({ id: page.id, title: this.pageTitle(page), url: page.url })),
        nextCursor: result.next_cursor,
      };
    } catch (error) {
      throw this.toAppError(error, 'Notion pages could not be loaded.');
    }
  }

  async disconnect(userId: string): Promise<void> {
    const connection = await this.prisma.notionConnection.findUnique({ where: { userId } });
    if (!connection) return;
    try {
      await this.revokeToken(this.cipher.decrypt(connection.encryptedAccessToken));
      await this.prisma.notionConnection.delete({ where: { userId } });
    } catch (error) {
      throw this.toAppError(error, 'Notion could not be disconnected. Try again.');
    }
  }

  async exportActionItems(
    userId: string,
    meetingId: string,
    parentPageId: string,
  ): Promise<NotionExportResult> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: {
        title: true,
        actionItems: true,
      },
    });
    if (!meeting)
      throw new AppError('MEETING_NOT_FOUND', 'Meeting not found.', HttpStatus.NOT_FOUND);
    if (meeting.actionItems.length === 0) {
      throw new AppError(
        'NO_ACTION_ITEMS',
        'This meeting has no action items to export.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const title = `${meeting.title} - Action items`;
    let page: { id: string; url: string } | null = null;
    try {
      page = await this.withConnection(userId, (accessToken) =>
        this.notionRequest<{ id: string; url: string }>({
          method: 'POST',
          url: `${NOTION_API_BASE_URL}/pages`,
          headers: this.apiHeaders(accessToken),
          data: {
            parent: { type: 'page_id', page_id: parentPageId },
            properties: { title: { title: this.richText(title) } },
          },
        }),
      );

      const blocks = meeting.actionItems
        .sort(compareActionItems)
        .map((item) => this.actionItemBlock(item));
      for (const children of this.blockBatches(blocks)) {
        await this.withConnection(userId, (accessToken) =>
          this.notionRequest({
            method: 'PATCH',
            url: `${NOTION_API_BASE_URL}/blocks/${page?.id}/children`,
            headers: this.apiHeaders(accessToken),
            data: { children },
          }),
        );
      }
      return { pageId: page.id, pageTitle: title, url: page.url };
    } catch (error) {
      if (page) await this.trashPageBestEffort(userId, page.id);
      throw this.toAppError(error, 'Action items could not be exported to Notion.');
    }
  }

  private async withConnection<T>(
    userId: string,
    operation: (accessToken: string) => Promise<T>,
  ): Promise<T> {
    const connection = await this.prisma.notionConnection.findUnique({ where: { userId } });
    if (!connection) {
      throw new AppError(
        'NOTION_NOT_CONNECTED',
        'Connect a Notion workspace before exporting.',
        HttpStatus.CONFLICT,
      );
    }
    try {
      return await operation(this.cipher.decrypt(connection.encryptedAccessToken));
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== HttpStatus.UNAUTHORIZED) {
        throw error;
      }
    }

    let refreshed: OAuthTokenResponse;
    try {
      refreshed = await this.refreshAccessToken(
        this.cipher.decrypt(connection.encryptedRefreshToken),
      );
      await this.prisma.notionConnection.update({
        where: { userId },
        data: {
          encryptedAccessToken: this.cipher.encrypt(refreshed.access_token),
          encryptedRefreshToken: this.cipher.encrypt(refreshed.refresh_token),
        },
      });
    } catch {
      await this.prisma.notionConnection.deleteMany({ where: { userId } });
      throw new AppError(
        'NOTION_RECONNECT_REQUIRED',
        'Your Notion connection expired. Reconnect it and try again.',
        HttpStatus.CONFLICT,
      );
    }
    return operation(refreshed.access_token);
  }

  private async exchangeAuthorizationCode(code: string): Promise<OAuthTokenResponse> {
    const result = await this.notionRequest<unknown>({
      method: 'POST',
      url: `${NOTION_API_BASE_URL}/oauth/token`,
      headers: this.oauthHeaders(),
      data: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      },
    });
    return this.tokenResponse(result);
  }

  private async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const result = await this.notionRequest<unknown>({
      method: 'POST',
      url: `${NOTION_API_BASE_URL}/oauth/token`,
      headers: this.oauthHeaders(),
      data: { grant_type: 'refresh_token', refresh_token: refreshToken },
    });
    return this.tokenResponse(result);
  }

  private async revokeToken(accessToken: string): Promise<void> {
    await this.notionRequest({
      method: 'POST',
      url: `${NOTION_API_BASE_URL}/oauth/revoke`,
      headers: this.oauthHeaders(),
      data: { token: accessToken },
    });
  }

  private async revokeBestEffort(connection: NotionConnection): Promise<void> {
    try {
      await this.revokeToken(this.cipher.decrypt(connection.encryptedAccessToken));
    } catch (error) {
      this.logger.warn(
        `Previous Notion connection could not be revoked workspaceId=${connection.workspaceId} error=${this.errorName(error)}`,
      );
    }
  }

  private async trashPageBestEffort(userId: string, pageId: string): Promise<void> {
    try {
      await this.withConnection(userId, (accessToken) =>
        this.notionRequest({
          method: 'PATCH',
          url: `${NOTION_API_BASE_URL}/pages/${pageId}`,
          headers: this.apiHeaders(accessToken),
          data: { in_trash: true },
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Partial Notion export cleanup failed pageId=${pageId} error=${this.errorName(error)}`,
      );
    }
  }

  private async notionRequest<T>(request: AxiosRequestConfig): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await axios.request<T>({ timeout: this.timeout, ...request });
        return response.data;
      } catch (error) {
        if (
          !axios.isAxiosError(error) ||
          !this.isRetryable(error.response?.status) ||
          attempt === 2
        ) {
          throw error;
        }
        const retryAfter = Number(error.response?.headers['retry-after']);
        const delay =
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : 300 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Notion request retry loop ended unexpectedly.');
  }

  private actionItemBlock(item: {
    task: string;
    owner: string | null;
    dueDate: string | null;
    priority: string;
    status: string;
  }): NotionBlock {
    const status = this.humanize(item.status);
    const metadata = [
      `Owner: ${item.owner ?? 'Unassigned'}`,
      `Due: ${item.dueDate ?? 'No due date'}`,
      `Priority: ${this.humanize(item.priority)}`,
      `Status: ${status}`,
    ].join(' | ');
    return {
      object: 'block',
      type: 'to_do',
      to_do: {
        rich_text: this.richText(item.task),
        checked: item.status === 'COMPLETED',
        color: 'default',
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: this.richText(metadata), color: 'default' },
          },
        ],
      },
    };
  }

  private richText(value: string): Array<{ type: 'text'; text: { content: string } }> {
    const parts: Array<{ type: 'text'; text: { content: string } }> = [];
    const characters = Array.from(value);
    for (let index = 0; index < characters.length; index += NOTION_RICH_TEXT_LIMIT) {
      parts.push({
        type: 'text',
        text: { content: characters.slice(index, index + NOTION_RICH_TEXT_LIMIT).join('') },
      });
    }
    if (parts.length > NOTION_MAX_RICH_TEXT_PARTS) {
      throw new AppError(
        'NOTION_CONTENT_TOO_LONG',
        'An action item contains more text than Notion can accept.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return parts.length ? parts : [{ type: 'text', text: { content: '' } }];
  }

  private blockBatches(blocks: NotionBlock[]): NotionBlock[][] {
    const batches: NotionBlock[][] = [];
    let current: NotionBlock[] = [];
    let currentBytes = 0;
    for (const block of blocks) {
      const blockBytes = Buffer.byteLength(JSON.stringify(block), 'utf8');
      if (blockBytes > NOTION_PAYLOAD_TARGET_BYTES) {
        throw new AppError(
          'NOTION_CONTENT_TOO_LONG',
          'An action item contains more text than Notion can accept.',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        current.length >= NOTION_BLOCK_BATCH_SIZE ||
        (current.length > 0 && currentBytes + blockBytes > NOTION_PAYLOAD_TARGET_BYTES)
      ) {
        batches.push(current);
        current = [];
        currentBytes = 0;
      }
      current.push(block);
      currentBytes += blockBytes;
    }
    if (current.length > 0) batches.push(current);
    return batches;
  }

  private pageTitle(page: NotionPage): string {
    const properties = Object.values(page.properties ?? {});
    for (const property of properties) {
      if (!property || typeof property !== 'object') continue;
      const candidate = property as { type?: unknown; title?: unknown };
      if (candidate.type !== 'title' || !Array.isArray(candidate.title)) continue;
      const title = (candidate.title as unknown[])
        .map((part: unknown) => {
          if (!part || typeof part !== 'object') return '';
          const richText = part as { plain_text?: unknown };
          return typeof richText.plain_text === 'string' ? richText.plain_text : '';
        })
        .join('')
        .trim();
      if (title) return title;
    }
    return 'Untitled page';
  }

  private tokenResponse(value: unknown): OAuthTokenResponse {
    if (!value || typeof value !== 'object') throw new Error('Invalid Notion token response.');
    const token = value as Partial<OAuthTokenResponse>;
    for (const key of ['access_token', 'refresh_token', 'bot_id', 'workspace_id'] as const) {
      if (typeof token[key] !== 'string' || !token[key])
        throw new Error('Invalid Notion token response.');
    }
    return {
      access_token: token.access_token!,
      refresh_token: token.refresh_token!,
      bot_id: token.bot_id!,
      workspace_id: token.workspace_id!,
      workspace_name: typeof token.workspace_name === 'string' ? token.workspace_name : null,
      workspace_icon: typeof token.workspace_icon === 'string' ? token.workspace_icon : null,
    };
  }

  private apiHeaders(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_API_VERSION,
    };
  }

  private oauthHeaders(): Record<string, string> {
    return {
      Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_API_VERSION,
    };
  }

  private hashState(state: string): string {
    return createHash('sha256').update(state).digest('hex');
  }

  private isRetryable(status: number | undefined): boolean {
    return status === 409 || status === 429 || (status !== undefined && status >= 500);
  }

  private humanize(value: string): string {
    const lower = value.toLowerCase().replace(/_/g, ' ');
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  private toAppError(error: unknown, fallback: string): AppError {
    if (error instanceof AppError) return error;
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === HttpStatus.FORBIDDEN || status === HttpStatus.NOT_FOUND) {
        return new AppError(
          'NOTION_DESTINATION_UNAVAILABLE',
          'Notion cannot access that page. Choose another page or reconnect and grant access.',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        return new AppError(
          'NOTION_RATE_LIMITED',
          'Notion is busy. Wait a moment and try again.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }
    this.logger.error(`Notion request failed error=${this.errorName(error)}`);
    return new AppError('NOTION_UNAVAILABLE', fallback, HttpStatus.BAD_GATEWAY);
  }

  private errorName(error: unknown): string {
    return error instanceof Error ? error.name : 'UnknownError';
  }
}

function compareActionItems(
  left: { sourceStartTime: number | null; id: string },
  right: { sourceStartTime: number | null; id: string },
): number {
  if (left.sourceStartTime === null && right.sourceStartTime !== null) return 1;
  if (left.sourceStartTime !== null && right.sourceStartTime === null) return -1;
  if (left.sourceStartTime !== null && right.sourceStartTime !== null) {
    const difference = left.sourceStartTime - right.sourceStartTime;
    if (difference !== 0) return difference;
  }
  return left.id.localeCompare(right.id);
}
