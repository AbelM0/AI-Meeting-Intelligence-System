/**
 * Small transcript cases for manual provider evaluation and future mocked tests.
 * These fixtures intentionally exercise conservative extraction rules without
 * requiring a live DeepSeek key in CI.
 */
export const MEETING_INTELLIGENCE_FIXTURES = [
  {
    name: 'clear action with relative due date',
    transcript: "I'll finish the API migration by Friday.",
    expected: { decisions: 0, actionItems: 1, owner: null, dueDate: 'Friday' },
  },
  {
    name: 'suggestion only',
    transcript: 'Maybe we should redesign the dashboard.',
    expected: { decisions: 0, actionItems: 0 },
  },
  {
    name: 'explicit decision',
    transcript: "Okay, we've agreed to launch on August 22.",
    expected: { decisions: 1, actionItems: 0 },
  },
  {
    name: 'unknown owner',
    transcript: 'We need to update the documentation before launch.',
    expected: { decisions: 0, actionItems: 1, owner: null },
  },
  {
    name: 'cancelled action',
    transcript:
      "Sarah will prepare the report. Actually, cancel that. We don't need the report anymore.",
    expected: { decisions: 0, actionItems: 0 },
  },
  {
    name: 'explicit reassignment',
    transcript: "Sarah will prepare the report. John: I'll take that instead.",
    expected: { decisions: 0, actionItems: 1, owner: 'John' },
  },
] as const;
