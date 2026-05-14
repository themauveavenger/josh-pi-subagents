/**
 * Agent list formatting - pure functions for unit testing
 */

import type { AgentConfig } from "../agents.ts";

/**
 * Format the user message sent to a subagent.
 * If the agent has a taskTemplate, substitute {task} into it;
 * otherwise use the default "Task: ..." prefix.
 */
export function formatUserMessage(task: string, taskTemplate?: string): string {
  if (taskTemplate) {
    return taskTemplate.replace(/{task}/g, task);
  }
  return `Task: ${task}`;
}

export interface FormattedAgentList {
  text: string;
  remaining: number;
}

/**
 * Format a list of agents for display
 * Shows up to maxItems, with remaining count
 */
export function formatAgentList(
  agents: AgentConfig[],
  maxItems: number
): FormattedAgentList {
  if (agents.length === 0) {
    return { text: "none", remaining: 0 };
  }
  
  const listed = agents.slice(0, maxItems);
  const remaining = agents.length - listed.length;
  
  return {
    text: listed
      .map((a) => `${a.name} (${a.source}): ${a.description}`)
      .join("; "),
    remaining,
  };
}

/**
 * Format available agent names as a quoted list
 */
export function formatAgentNames(agents: AgentConfig[]): string {
  if (agents.length === 0) return "none";
  return agents.map((a) => `"${a.name}"`).join(", ");
}
