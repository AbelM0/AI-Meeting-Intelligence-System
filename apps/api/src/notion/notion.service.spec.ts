import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { NotionService } from './notion.service';

type BlockBuilder = {
  actionItemBlock(item: {
    task: string;
    owner: string | null;
    dueDate: string | null;
    priority: string;
    status: string;
  }): Record<string, unknown>;
  richText(value: string): Array<{ type: 'text'; text: { content: string } }>;
  blockBatches(blocks: Array<Record<string, unknown>>): Array<Array<Record<string, unknown>>>;
};

function builder(): BlockBuilder {
  return Object.create(NotionService.prototype) as BlockBuilder;
}

void test('maps a completed action item to a checked Notion block with operational details', () => {
  const block = builder().actionItemBlock({
    task: 'Send the launch brief',
    owner: 'Maya',
    dueDate: 'Friday',
    priority: 'HIGH',
    status: 'COMPLETED',
  });
  const todo = block.to_do as {
    checked: boolean;
    children: Array<Record<string, Record<string, Array<{ text: { content: string } }>>>>;
  };

  assert.equal(todo.checked, true);
  assert.match(todo.children[0].paragraph.rich_text[0].text.content, /Owner: Maya/);
  assert.match(todo.children[0].paragraph.rich_text[0].text.content, /Due: Friday/);
  assert.match(todo.children[0].paragraph.rich_text[0].text.content, /Priority: High/);
  assert.equal(todo.children.length, 1);
  assert.equal(JSON.stringify(block).includes('Evidence'), false);
});

void test('uses explicit fallbacks for nullable action item metadata', () => {
  const block = builder().actionItemBlock({
    task: 'Confirm the venue',
    owner: null,
    dueDate: null,
    priority: 'LOW',
    status: 'OPEN',
  });
  const todo = block.to_do as {
    checked: boolean;
    children: Array<Record<string, Record<string, Array<{ text: { content: string } }>>>>;
  };

  assert.equal(todo.checked, false);
  assert.match(todo.children[0].paragraph.rich_text[0].text.content, /Owner: Unassigned/);
  assert.match(todo.children[0].paragraph.rich_text[0].text.content, /Due: No due date/);
});

void test('chunks blocks and rich text within Notion request limits', () => {
  const notionBuilder = builder();
  const blocks = Array.from({ length: 101 }, (_, index) => ({ index }));
  const batches = notionBuilder.blockBatches(blocks);
  const richText = notionBuilder.richText(`${'a'.repeat(1_999)}😀b`);

  assert.deepEqual(
    batches.map((batch) => batch.length),
    [100, 1],
  );
  assert.equal(richText.length, 2);
  assert.equal(richText.map((part) => part.text.content).join(''), `${'a'.repeat(1_999)}😀b`);
});
