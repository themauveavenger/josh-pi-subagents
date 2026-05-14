/**
 * Agent roster formatting - pure functions for unit testing
 */

import type { AgentConfig } from "../agents.ts";

/**
 * Format an agent roster for injection into the system prompt.
 * Returns an empty string if no agents are available.
 */
export function formatRoster(agents: AgentConfig[]): string {
  if (agents.length === 0) return "";

  const lines = agents
    .map((a) => `  - ${a.name} (${a.source}): ${a.description}`)
    .join("\n");

  return [
    "",
    "## Available Subagents",
    "",
    "The following subagents are available via the `delegate` tool:",
    lines,
    "",
    "Use `delegate` with the agent name and a task description. Do not guess agent names — use only the names listed above.",
  ].join("\n");
}