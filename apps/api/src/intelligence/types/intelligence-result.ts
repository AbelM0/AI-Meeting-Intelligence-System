import type {
  ActionItemInput,
  DecisionInput,
  MeetingSummaryInput,
} from '@meeting-intelligence/schemas';

export type MeetingSummaryResult = MeetingSummaryInput;
export type DecisionResult = DecisionInput;
export type ActionItemResult = ActionItemInput;

export type MeetingIntelligenceResult = {
  summary: MeetingSummaryResult;
  decisions: DecisionResult[];
  actionItems: ActionItemResult[];
  model: string;
  promptVersion: string;
  generatedAt: Date;
};

export const MEETING_INTELLIGENCE_PROMPT_VERSION = 'v2';

export const INTELLIGENCE_STAGES = {
  SUMMARY: 'ANALYZING_SUMMARY',
  DECISIONS: 'FINDING_DECISIONS',
  ACTION_ITEMS: 'EXTRACTING_ACTION_ITEMS',
  PERSISTING: 'PERSISTING_INTELLIGENCE',
} as const;

export type IntelligenceStage = (typeof INTELLIGENCE_STAGES)[keyof typeof INTELLIGENCE_STAGES];
