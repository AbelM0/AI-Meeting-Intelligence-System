import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ActionItemPriority,
  ActionItemStatus,
  Prisma,
  type ActionItem as ActionItemRecord,
  type Decision as DecisionRecord,
} from '@meeting-intelligence/database';
import {
  actionItemsSchema,
  actionItemStatusSchema,
  decisionsSchema,
  meetingSummarySchema,
  type UpdateActionItemInput,
} from '@meeting-intelligence/schemas';
import type { ActionItem, Decision, MeetingIntelligence } from '@meeting-intelligence/types';
import { ZodError, type ZodType } from 'zod';
import { PrismaService } from '../database/prisma.service';
import { DeepSeekProvider, DeepSeekProviderError } from './providers/deepseek.provider';
import { buildActionItemsPrompt, ACTION_ITEMS_SYSTEM_PROMPT } from './prompts/action-items.prompt';
import { buildDecisionsPrompt, DECISIONS_SYSTEM_PROMPT } from './prompts/decisions.prompt';
import { buildSummaryPrompt, SUMMARY_SYSTEM_PROMPT } from './prompts/summary.prompt';
import {
  INTELLIGENCE_STAGES,
  MEETING_INTELLIGENCE_PROMPT_VERSION,
  type IntelligenceStage,
  type MeetingIntelligenceResult,
} from './types/intelligence-result';
import {
  estimateTranscriptTokens,
  formatTimestampedTranscript,
  type TimestampedTranscript,
} from './utils/format-timestamped-transcript';

type IntelligenceProgressCallback = (
  stage: IntelligenceStage,
  progress: number,
) => Promise<void> | void;

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deepseek: DeepSeekProvider,
    private readonly config: ConfigService,
  ) {}

  async analyzeTranscript(
    meetingId: string,
    transcript: TimestampedTranscript,
    onProgress?: IntelligenceProgressCallback,
  ): Promise<MeetingIntelligenceResult> {
    const timestampedTranscript = formatTimestampedTranscript(transcript);
    const estimatedTokens = estimateTranscriptTokens(timestampedTranscript);
    const maxTokens = this.maxTranscriptTokens;

    if (estimatedTokens > maxTokens) {
      throw new DeepSeekProviderError(
        `This transcript is too large for the configured single-pass analysis limit (${maxTokens} estimated tokens).`,
        'invalid_output',
        false,
      );
    }

    const startedAt = Date.now();
    this.logger.log(
      `Meeting intelligence started meetingId=${meetingId} model=${this.deepseek.modelName} promptVersion=${MEETING_INTELLIGENCE_PROMPT_VERSION} estimatedTokens=${estimatedTokens}`,
    );

    await onProgress?.(INTELLIGENCE_STAGES.SUMMARY, 78);
    const summary = await this.generateValidated(
      'summary',
      SUMMARY_SYSTEM_PROMPT,
      buildSummaryPrompt(timestampedTranscript),
      meetingSummarySchema,
    );

    await onProgress?.(INTELLIGENCE_STAGES.DECISIONS, 85);
    const decisionsResult = await this.generateValidated(
      'decisions',
      DECISIONS_SYSTEM_PROMPT,
      buildDecisionsPrompt(timestampedTranscript),
      decisionsSchema,
    );

    await onProgress?.(INTELLIGENCE_STAGES.ACTION_ITEMS, 92);
    const actionItemsResult = await this.generateValidated(
      'action-items',
      ACTION_ITEMS_SYSTEM_PROMPT,
      buildActionItemsPrompt(timestampedTranscript),
      actionItemsSchema,
    );

    const result: MeetingIntelligenceResult = {
      summary,
      decisions: decisionsResult.decisions,
      actionItems: actionItemsResult.actionItems,
      model: this.deepseek.modelName,
      promptVersion: MEETING_INTELLIGENCE_PROMPT_VERSION,
      generatedAt: new Date(),
    };

    this.logger.log(
      `Meeting intelligence completed meetingId=${meetingId} model=${result.model} promptVersion=${result.promptVersion} durationMs=${Date.now() - startedAt} decisions=${result.decisions.length} actionItems=${result.actionItems.length}`,
    );
    return result;
  }

  async persistIntelligence(meetingId: string, result: MeetingIntelligenceResult): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.meetingSummary.upsert({
        where: { meetingId },
        create: {
          meetingId,
          overview: result.summary.overview,
          keyTopics: result.summary.keyTopics,
          outcomes: result.summary.outcomes,
          unresolvedIssues: result.summary.unresolvedIssues,
          model: result.model,
          promptVersion: result.promptVersion,
          generatedAt: result.generatedAt,
        },
        update: {
          overview: result.summary.overview,
          keyTopics: result.summary.keyTopics,
          outcomes: result.summary.outcomes,
          unresolvedIssues: result.summary.unresolvedIssues,
          model: result.model,
          promptVersion: result.promptVersion,
          generatedAt: result.generatedAt,
        },
      });

      await transaction.decision.deleteMany({ where: { meetingId } });
      if (result.decisions.length > 0) {
        await transaction.decision.createMany({
          data: result.decisions.map((decision) => ({ meetingId, ...decision })),
        });
      }

      await transaction.actionItem.deleteMany({ where: { meetingId } });
      if (result.actionItems.length > 0) {
        await transaction.actionItem.createMany({
          data: result.actionItems.map((actionItem) => ({
            meetingId,
            task: actionItem.task,
            owner: actionItem.owner,
            dueDate: actionItem.dueDate,
            priority: ActionItemPriority[actionItem.priority],
            evidence: actionItem.evidence,
            sourceStartTime: actionItem.sourceStartTime,
          })),
        });
      }
    });
  }

  async getMeetingIntelligence(meetingId: string): Promise<MeetingIntelligence> {
    const stored = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        summary: true,
        decisions: true,
        actionItems: true,
      },
    });

    if (!stored) throw new NotFoundException('Meeting not found.');
    if (!stored.summary) {
      throw new NotFoundException('Meeting intelligence is not available yet.');
    }

    const summary = meetingSummarySchema.safeParse({
      overview: stored.summary.overview,
      keyTopics: stored.summary.keyTopics,
      outcomes: stored.summary.outcomes,
      unresolvedIssues: stored.summary.unresolvedIssues,
    });

    if (!summary.success) {
      this.logger.error(
        `Stored meeting intelligence failed validation meetingId=${meetingId} resource=summary`,
      );
      throw new InternalServerErrorException('Stored meeting intelligence is invalid.');
    }

    return {
      summary: summary.data,
      decisions: stored.decisions.sort(compareDecisions).map(toDecisionResponse),
      actionItems: stored.actionItems.sort(compareActionItems).map(toActionItemResponse),
    };
  }

  async updateActionItemStatus(id: string, input: UpdateActionItemInput): Promise<ActionItem> {
    const parsed = actionItemStatusSchema.safeParse(input.status);
    if (!parsed.success) {
      throw new InternalServerErrorException('Invalid action item status.');
    }

    try {
      const actionItem = await this.prisma.actionItem.update({
        where: { id },
        data: { status: ActionItemStatus[parsed.data] },
      });
      return toActionItemResponse(actionItem);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Action item not found.');
      }
      throw error;
    }
  }

  private async generateValidated<T>(
    operation: string,
    systemPrompt: string,
    userPrompt: string,
    schema: ZodType<T>,
  ): Promise<T> {
    const response = await this.deepseek.completeJson(operation, systemPrompt, userPrompt);
    const firstAttempt = this.parseResponse(response, schema);
    if (firstAttempt.success) return firstAttempt.data;

    this.logValidationFailure(operation, firstAttempt.error);
    const repairPrompt = `${userPrompt}

Your previous response did not pass application validation. Return one corrected JSON object only.
Validation issue paths: ${this.validationIssuePaths(firstAttempt.error)}
Previous response to correct:
${response.slice(0, 16_000)}`;
    const repairedResponse = await this.deepseek.completeJson(
      operation,
      `${systemPrompt}\nThis is one controlled correction attempt. Preserve the transcript-grounded rules exactly.`,
      repairPrompt,
    );
    const repairedAttempt = this.parseResponse(repairedResponse, schema);
    if (repairedAttempt.success) return repairedAttempt.data;

    this.logValidationFailure(operation, repairedAttempt.error);
    throw new DeepSeekProviderError(
      'DeepSeek returned meeting intelligence that did not match the required schema.',
      'invalid_output',
      true,
    );
  }

  private parseResponse<T>(response: string, schema: ZodType<T>) {
    try {
      const parsedJson: unknown = JSON.parse(response);
      return schema.safeParse(parsedJson);
    } catch {
      return {
        success: false as const,
        error: new ZodError([
          {
            code: 'custom',
            path: [],
            message: 'Response was not valid JSON.',
          },
        ]),
      };
    }
  }

  private logValidationFailure(operation: string, error: ZodError): void {
    this.logger.warn(
      `DeepSeek output validation failed operation=${operation} issuePaths=${this.validationIssuePaths(error)}`,
    );
  }

  private validationIssuePaths(error: ZodError): string {
    return error.issues
      .slice(0, 8)
      .map((issue) => (issue.path.length > 0 ? issue.path.join('.') : 'root'))
      .join(',');
  }

  private get maxTranscriptTokens(): number {
    const configured = Number(this.configuredMaxTranscriptTokens);
    return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 100_000;
  }

  private get configuredMaxTranscriptTokens(): string {
    return this.config.get<string>('DEEPSEEK_MAX_TRANSCRIPT_TOKENS', '100000');
  }
}

function compareByTimestamp(
  left: { sourceStartTime: number | null; id: string },
  right: { sourceStartTime: number | null; id: string },
): number {
  if (left.sourceStartTime === null && right.sourceStartTime !== null) return 1;
  if (left.sourceStartTime !== null && right.sourceStartTime === null) return -1;
  if (left.sourceStartTime !== null && right.sourceStartTime !== null) {
    const timestampDifference = left.sourceStartTime - right.sourceStartTime;
    if (timestampDifference !== 0) return timestampDifference;
  }
  return left.id.localeCompare(right.id);
}

function compareDecisions(left: DecisionRecord, right: DecisionRecord): number {
  const timestampOrder = compareByTimestamp(left, right);
  return timestampOrder !== 0 ? timestampOrder : left.decision.localeCompare(right.decision);
}

function compareActionItems(left: ActionItemRecord, right: ActionItemRecord): number {
  const timestampOrder = compareByTimestamp(left, right);
  return timestampOrder !== 0 ? timestampOrder : left.task.localeCompare(right.task);
}

function toDecisionResponse(decision: DecisionRecord): Decision {
  return {
    id: decision.id,
    decision: decision.decision,
    context: decision.context,
    evidence: decision.evidence,
    sourceStartTime: decision.sourceStartTime,
  };
}

function toActionItemResponse(actionItem: ActionItemRecord): ActionItem {
  return {
    id: actionItem.id,
    task: actionItem.task,
    owner: actionItem.owner,
    dueDate: actionItem.dueDate,
    priority: actionItem.priority,
    status: actionItem.status,
    evidence: actionItem.evidence,
    sourceStartTime: actionItem.sourceStartTime,
  };
}
