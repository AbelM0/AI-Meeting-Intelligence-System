import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { IntelligenceService } from './intelligence.service';

class StubDeepSeekProvider {
  readonly modelName = 'deepseek-v4-flash';
  readonly calls: string[] = [];

  constructor(private readonly responses: Record<string, string[]>) {}

  completeJson(operation: string): Promise<string> {
    this.calls.push(operation);
    const response = this.responses[operation]?.shift();
    if (!response) throw new Error(`No fixture response for ${operation}.`);
    return Promise.resolve(response);
  }
}

function createService(provider: StubDeepSeekProvider): IntelligenceService {
  return new IntelligenceService(
    {} as never,
    provider as never,
    new ConfigService({ DEEPSEEK_MAX_TRANSCRIPT_TOKENS: '100000' }),
  );
}

const validDecisions = JSON.stringify({ decisions: [] });
const validActionItems = JSON.stringify({ actionItems: [] });

void test('repairs one schema-invalid response and continues through all analysis stages', async () => {
  const provider = new StubDeepSeekProvider({
    summary: [
      JSON.stringify({ keyTopics: [], outcomes: [], unresolvedIssues: [] }),
      JSON.stringify({
        overview: 'The team reviewed authentication.',
        keyTopics: ['Authentication'],
        outcomes: [],
        unresolvedIssues: [],
      }),
    ],
    decisions: [validDecisions],
    'action-items': [validActionItems],
  });
  const stages: string[] = [];

  const result = await createService(provider).analyzeTranscript(
    'fixture-meeting',
    {
      fullText: "I'll fix the refresh issue by Friday.",
      segments: [{ startTime: 28, text: "I'll fix the refresh issue by Friday." }],
    },
    (stage) => {
      stages.push(stage);
    },
  );

  assert.equal(result.summary.overview, 'The team reviewed authentication.');
  assert.deepEqual(stages, ['ANALYZING_SUMMARY', 'FINDING_DECISIONS', 'EXTRACTING_ACTION_ITEMS']);
  assert.deepEqual(provider.calls, ['summary', 'summary', 'decisions', 'action-items']);
});

void test('rejects output that remains invalid after the one repair attempt', async () => {
  const provider = new StubDeepSeekProvider({
    summary: [JSON.stringify({}), JSON.stringify({})],
    decisions: [validDecisions],
    'action-items': [validActionItems],
  });

  await assert.rejects(
    () =>
      createService(provider).analyzeTranscript('fixture-meeting', {
        fullText: 'A transcript.',
        segments: [{ startTime: 0, text: 'A transcript.' }],
      }),
    /did not match the required schema/,
  );
  assert.deepEqual(provider.calls, ['summary', 'summary']);
});
