/**
 * Unit tests for formatter.ts
 * Run with: node --test lib/formatter.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatAgentList,
  formatAgentNames,
  formatUserMessage
} from './formatter.ts';
import type { AgentConfig } from '../agents.ts';

function createAgent(
  name: string,
  source: 'user' | 'project',
  description: string,
  overrides?: Partial<AgentConfig>
): AgentConfig {
  return {
    name,
    description,
    source,
    systemPrompt: '',
    filePath: `/agents/${name}.md`,
    ...overrides
  };
}

describe('formatAgentList', () => {
  it('returns \'none\' for empty array', () => {
    const result = formatAgentList([], 5);

    assert.equal(result.text, 'none');
    assert.equal(result.remaining, 0);
  });

  it('formats single agent', () => {
    const agents = [createAgent('researcher', 'user', 'Finds information')];

    const result = formatAgentList(agents, 5);

    assert.equal(result.text, 'researcher (user): Finds information');
    assert.equal(result.remaining, 0);
  });

  it('formats multiple agents joined by semicolon', () => {
    const agents = [
      createAgent('researcher', 'user', 'Finds information'),
      createAgent('worker', 'project', 'Does work')
    ];

    const result = formatAgentList(agents, 5);

    assert.equal(
      result.text,
      'researcher (user): Finds information; worker (project): Does work'
    );
    assert.equal(result.remaining, 0);
  });

  it('limits to maxItems and reports remaining', () => {
    const agents = [
      createAgent('agent-a', 'user', 'First agent'),
      createAgent('agent-b', 'user', 'Second agent'),
      createAgent('agent-c', 'user', 'Third agent')
    ];

    const result = formatAgentList(agents, 2);

    assert.ok(result.text.includes('agent-a'));
    assert.ok(result.text.includes('agent-b'));
    assert.ok(!result.text.includes('agent-c'));
    assert.equal(result.remaining, 1);
  });

  it('handles maxItems of 0', () => {
    const agents = [createAgent('a', 'user', 'First')];

    const result = formatAgentList(agents, 0);

    assert.equal(result.text, '');
    assert.equal(result.remaining, 1);
  });

  it('handles agents with special characters in descriptions', () => {
    const agents = [
      createAgent('test', 'user', 'Description: with; semicolons')
    ];

    const result = formatAgentList(agents, 5);

    assert.ok(result.text.includes('Description: with; semicolons'));
  });
});

describe('formatAgentNames', () => {
  it('returns \'none\' for empty array', () => {
    assert.equal(formatAgentNames([]), 'none');
  });

  it('formats single name with quotes', () => {
    const agents = [createAgent('researcher', 'user', '')];

    assert.equal(formatAgentNames(agents), '"researcher"');
  });

  it('formats multiple names comma-separated', () => {
    const agents = [
      createAgent('researcher', 'user', ''),
      createAgent('worker', 'user', ''),
      createAgent('reviewer', 'project', '')
    ];

    assert.equal(
      formatAgentNames(agents),
      '"researcher", "worker", "reviewer"'
    );
  });
});

describe('formatUserMessage', () => {
  it('prefixes with \'Task:\' when no template provided', () => {
    assert.equal(formatUserMessage('find bugs'), 'Task: find bugs');
  });

  it('prefixes with \'Task:\' when template is undefined', () => {
    assert.equal(formatUserMessage('find bugs', undefined), 'Task: find bugs');
  });

  it('substitutes {task} in template', () => {
    const template = 'Please research: {task}\n\nCite your sources.';
    assert.equal(
      formatUserMessage('famous inventors of the 1900s', template),
      'Please research: famous inventors of the 1900s\n\nCite your sources.'
    );
  });

  it('replaces all occurrences of {task}', () => {
    const template = 'First: {task}. Again: {task}.';
    assert.equal(formatUserMessage('search', template), 'First: search. Again: search.');
  });

  it('returns template verbatim when it has no {task} placeholder', () => {
    const template = 'Do your thing.';
    assert.equal(formatUserMessage('ignored task', template), 'Do your thing.');
  });

  it('falls back to \'Task:\' prefix for empty template', () => {
    assert.equal(formatUserMessage('do stuff', ''), 'Task: do stuff');
  });
});
