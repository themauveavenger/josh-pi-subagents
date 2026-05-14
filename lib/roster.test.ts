/**
 * Unit tests for roster.ts
 * Run with: node --test lib/roster.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatRoster } from './roster.ts';
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

describe('formatRoster', () => {
  it('returns empty string for empty agent list', () => {
    const result = formatRoster([]);

    assert.equal(result, '');
  });

  it('formats a single agent with name, source, and description', () => {
    const agents = [createAgent('wedge', 'user', 'Exploration agent')];

    const result = formatRoster(agents);

    assert.ok(result.includes('## Available Subagents'));
    assert.ok(result.includes('- wedge (user): Exploration agent'));
    assert.ok(result.includes('delegate'));
  });

  it('formats multiple agents as separate bullet lines', () => {
    const agents = [
      createAgent('wedge', 'user', 'Exploration agent'),
      createAgent('coder', 'project', 'Implementation specialist')
    ];

    const result = formatRoster(agents);

    assert.ok(result.includes('- wedge (user): Exploration agent'));
    assert.ok(result.includes('- coder (project): Implementation specialist'));

    const lines = result.split('\n');
    const bulletLines = lines.filter(l => l.trimStart().startsWith('- '));
    assert.equal(bulletLines.length, 2);
  });

  it('includes the header and footer instructions', () => {
    const agents = [createAgent('wedge', 'user', 'Exploration agent')];

    const result = formatRoster(agents);

    assert.ok(result.includes('## Available Subagents'));
    assert.ok(result.includes('The following subagents are available via the `delegate` tool:'));
    assert.ok(result.includes('Do not guess agent names'));
  });

  it('handles agents with special characters in descriptions', () => {
    const agents = [
      createAgent('test', 'user', 'Does x, y; and z: all of them')
    ];

    const result = formatRoster(agents);

    assert.ok(result.includes('- test (user): Does x, y; and z: all of them'));
  });

  it('includes agents from both user and project sources', () => {
    const agents = [
      createAgent('global-agent', 'user', 'Available everywhere'),
      createAgent('local-agent', 'project', 'Project-specific')
    ];

    const result = formatRoster(agents);

    assert.ok(result.includes('(user)'));
    assert.ok(result.includes('(project)'));
  });
});
