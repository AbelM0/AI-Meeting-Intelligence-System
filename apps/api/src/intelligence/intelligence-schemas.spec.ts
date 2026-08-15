import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  actionItemsSchema,
  decisionsSchema,
  meetingSummarySchema,
  updateActionItemSchema,
} from '@meeting-intelligence/schemas';

void test('accepts valid summary, decisions, and empty action items', () => {
  assert.equal(
    meetingSummarySchema.safeParse({
      overview: 'The team reviewed the release plan.',
      keyTopics: ['Release plan'],
      outcomes: [],
      unresolvedIssues: [],
    }).success,
    true,
  );
  assert.equal(
    decisionsSchema.safeParse({
      decisions: [
        {
          decision: 'Launch on August 22.',
          context: null,
          evidence: "We've agreed to launch on August 22.",
          sourceStartTime: 1924,
        },
      ],
    }).success,
    true,
  );
  assert.equal(actionItemsSchema.safeParse({ actionItems: [] }).success, true);
});

void test('accepts nullable action item fields and rejects unsupported values', () => {
  assert.equal(
    actionItemsSchema.safeParse({
      actionItems: [
        {
          task: 'Fix the refresh-token issue',
          owner: null,
          dueDate: null,
          priority: 'MEDIUM',
          evidence: "I'll fix the refresh-token issue.",
          sourceStartTime: 31,
        },
      ],
    }).success,
    true,
  );
  assert.equal(
    actionItemsSchema.safeParse({
      actionItems: [
        {
          task: 'Invalid priority',
          owner: null,
          dueDate: null,
          priority: 'CRITICAL',
          evidence: 'Evidence',
          sourceStartTime: -1,
        },
      ],
    }).success,
    false,
  );
  assert.equal(meetingSummarySchema.safeParse({ overview: 'Missing arrays' }).success, false);
  assert.equal(actionItemsSchema.safeParse({ actionItems: 'not-an-array' }).success, false);
  assert.equal(updateActionItemSchema.safeParse({ status: 'BLOCKED' }).success, false);
});
