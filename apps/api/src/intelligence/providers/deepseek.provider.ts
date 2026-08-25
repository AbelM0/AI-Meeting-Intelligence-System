import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getCurrentRunTree, traceable } from 'langsmith/traceable';
import OpenAI from 'openai';

export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash';
export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

export type DeepSeekFailureCategory =
  'authentication' | 'rate_limit' | 'provider' | 'network' | 'empty_response' | 'invalid_output';

export class DeepSeekProviderError extends Error {
  providerStatus: number | null = null;
  providerRequestId: string | null = null;

  constructor(
    message: string,
    readonly category: DeepSeekFailureCategory,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'DeepSeekProviderError';
  }
}

export type DeepSeekTraceContext = {
  meetingId?: string;
  promptVersion?: string;
  repairAttempt?: number;
};

type DeepSeekTraceInput = DeepSeekTraceContext & {
  operation: string;
  systemPrompt: string;
  userPrompt: string;
};

type DeepSeekTraceResult = {
  content: string;
  providerRequestId: string;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
};

@Injectable()
export class DeepSeekProvider {
  private readonly logger = new Logger(DeepSeekProvider.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly tracedCompletion: (
    input: DeepSeekTraceInput,
  ) => Promise<DeepSeekTraceResult>;

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
    this.tracedCompletion = traceable(
      async (input: DeepSeekTraceInput): Promise<DeepSeekTraceResult> => {
        this.addTraceContext(input);

        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            temperature: 0,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: input.systemPrompt },
              { role: 'user', content: input.userPrompt },
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

          return {
            content,
            providerRequestId: response.id,
            usage: {
              inputTokens: response.usage?.prompt_tokens ?? null,
              outputTokens: response.usage?.completion_tokens ?? null,
              totalTokens: response.usage?.total_tokens ?? null,
            },
          };
        } catch (error) {
          const mappedError = this.mapError(error);
          mappedError.providerStatus = this.statusOf(error);
          mappedError.providerRequestId = this.requestIdOf(error);
          this.addTraceFailure(mappedError);
          throw mappedError;
        }
      },
      {
        name: 'deepseek.chat.completions',
        run_type: 'llm',
        tags: ['ai-provider', 'deepseek'],
        metadata: {
          ls_provider: 'deepseek',
          ls_model_name: this.model,
        },
        processInputs: (input) => ({
          operation: input.operation,
          meeting_id: input.meetingId ?? null,
          prompt_version: input.promptVersion ?? null,
          repair_attempt: input.repairAttempt ?? 0,
          system_prompt_characters: input.systemPrompt.length,
          user_prompt_characters: input.userPrompt.length,
        }),
        processOutputs: (output) => ({
          provider_request_id: output.providerRequestId,
          content_characters: output.content.length,
          usage_metadata: {
            input_tokens: output.usage.inputTokens,
            output_tokens: output.usage.outputTokens,
            total_tokens: output.usage.totalTokens,
          },
        }),
      },
    );
  }

  get modelName(): string {
    return this.model;
  }

  async completeJson(
    operation: string,
    systemPrompt: string,
    userPrompt: string,
    traceContext: DeepSeekTraceContext = {},
  ): Promise<string> {
    const startedAt = Date.now();

    try {
      const response = await this.tracedCompletion({
        operation,
        systemPrompt,
        userPrompt,
        ...traceContext,
      });

      this.logger.log(
        `DeepSeek request completed operation=${operation} model=${this.model} requestId=${response.providerRequestId} durationMs=${Date.now() - startedAt}`,
      );
      return response.content;
    } catch (error) {
      const mappedError = this.mapError(error);
      this.logger.warn(
        `DeepSeek request failed operation=${operation} model=${this.model} requestId=${mappedError.providerRequestId ?? 'unknown'} status=${mappedError.providerStatus ?? 'unknown'} category=${mappedError.category} retryable=${mappedError.retryable} durationMs=${Date.now() - startedAt}`,
      );
      throw mappedError;
    }
  }

  private addTraceContext(input: DeepSeekTraceInput): void {
    const runTree = getCurrentRunTree();
    if (!runTree) return;

    runTree.metadata = {
      ...runTree.metadata,
      operation: input.operation,
      meeting_id: input.meetingId ?? null,
      prompt_version: input.promptVersion ?? null,
      repair_attempt: input.repairAttempt ?? 0,
    };
    runTree.tags = [...(runTree.tags ?? []), `operation:${input.operation}`];
  }

  private addTraceFailure(error: DeepSeekProviderError): void {
    const runTree = getCurrentRunTree();
    if (!runTree) return;

    runTree.metadata = {
      ...runTree.metadata,
      error_category: error.category,
      retryable: error.retryable,
      provider_status: error.providerStatus,
      provider_request_id: error.providerRequestId,
    };
    runTree.tags = [...(runTree.tags ?? []), `error:${error.category}`];
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
    if (typeof error !== 'object' || error === null) return null;
    const status = Number(
      'providerStatus' in error
        ? error.providerStatus
        : 'status' in error
          ? error.status
          : Number.NaN,
    );
    return Number.isFinite(status) ? status : null;
  }

  private requestIdOf(error: unknown): string | null {
    if (typeof error !== 'object' || error === null) return null;
    const record = error as Record<string, unknown>;

    for (const key of ['providerRequestId', 'request_id', '_request_id', 'requestId']) {
      const value = record[key];
      if (typeof value === 'string') return value;
    }

    if ('headers' in error && error.headers instanceof Headers) {
      return error.headers.get('x-request-id');
    }
    return null;
  }

  private codeOf(error: unknown): string | null {
    if (typeof error !== 'object' || error === null || !('code' in error)) return null;
    return typeof error.code === 'string' ? error.code : null;
  }
}
