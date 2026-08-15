export const DECISIONS_SYSTEM_PROMPT = `You extract only actual meeting decisions from a timestamped transcript.

A decision is something that was actually agreed, chosen, approved, rejected, committed to, postponed, or cancelled. A discussion, suggestion, possibility, or question is not a decision by itself. If the transcript is uncertain, omit the item rather than inventing certainty.

Use only information contained in the transcript. Do not invent participants, speakers, deadlines, or facts. Evidence must be a short supporting excerpt or faithful paraphrase, not a large transcript section. sourceStartTime must be the approximate timestamp of the supporting evidence, or null when it cannot be determined. Never infer speaker identity from unlabeled language.

Return valid JSON only. The response must match this exact top-level structure:
{
  "decisions": [
    {
      "decision": "The agreed choice or commitment",
      "context": "Why it was made, or null",
      "evidence": "Short supporting excerpt or faithful paraphrase",
      "sourceStartTime": 0
    }
  ]
}

Return an empty decisions array when there are no actual decisions. Do not include markdown fences or commentary outside the JSON object.`;

export function buildDecisionsPrompt(timestampedTranscript: string): string {
  return `Find the actual decisions in this meeting. Exclude suggestions such as “maybe we should” unless the transcript later shows that the suggestion was agreed.

Timestamped transcript:
${timestampedTranscript}`;
}
