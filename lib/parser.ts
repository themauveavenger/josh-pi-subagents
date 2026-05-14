/**
 * Agent content parsing - pure functions for unit testing
 */

import YAML from 'yaml';

export interface RawFrontmatter {
  name?: string;
  description?: string;
  model?: string;
  tools?: string;
  [key: string]: string | undefined;
}

export interface ParsedAgent {
  name: string;
  description: string;
  model?: string;
  tools?: string[];
  taskTemplate?: string;
  systemPrompt: string;
}

/**
 * Parse YAML frontmatter from markdown content
 * Uses the 'yaml' package for proper YAML parsing
 */
export function parseFrontmatter(content: string): { frontmatter: RawFrontmatter; body: string } {
  // Check for frontmatter delimiters
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    return { frontmatter: {}, body: content };
  }

  const endMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!endMatch) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = endMatch[1];
  const bodyStart = endMatch[0].length;
  const body = content.slice(bodyStart);

  // Parse YAML frontmatter using the yaml package
  let parsed: Record<string, unknown>;
  try {
    parsed = YAML.parse(frontmatterText) ?? {};
  }
  catch {
    parsed = {};
  }

  // Convert to RawFrontmatter (string values only)
  const frontmatter: RawFrontmatter = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string') {
      frontmatter[key] = value;
    }
    else if (value !== null && value !== undefined) {
      // Coerce non-string values to string for backwards compatibility
      frontmatter[key] = String(value);
    }
  }

  return { frontmatter, body };
}

/**
 * Parse agent content into a structured config
 * Returns null if required fields are missing
 */
export function parseAgentContent(
  content: string,
  fileName: string
): ParsedAgent | null {
  const { frontmatter, body } = parseFrontmatter(content);

  if (!frontmatter.name || !frontmatter.description) {
    return null;
  }

  const tools = frontmatter.tools
    ?.split(',')
    .map(t => t.trim())
    .filter(Boolean);

  return {
    name: frontmatter.name,
    description: frontmatter.description,
    model: frontmatter.model,
    tools: tools?.length ? tools : undefined,
    taskTemplate: frontmatter.taskTemplate,
    systemPrompt: body.trim()
  };
}

/**
 * Extract the file name without extension for agent naming
 */
export function getAgentNameFromFile(filePath: string): string {
  const baseName = filePath.split(/[/\\]/).pop() || '';
  return baseName.replace(/\.md$/i, '');
}
