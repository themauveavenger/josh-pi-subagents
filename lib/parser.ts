/**
 * Agent content parsing - pure functions for unit testing
 */

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
  systemPrompt: string;
}

/**
 * Parse YAML frontmatter from markdown content
 * Simple parser - handles basic key: value format
 */
export function parseFrontmatter(content: string): { frontmatter: RawFrontmatter; body: string } {
  const frontmatter: RawFrontmatter = {};
  
  // Check for frontmatter delimiters
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    return { frontmatter, body: content };
  }
  
  const endMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!endMatch) {
    return { frontmatter, body: content };
  }
  
  const frontmatterText = endMatch[1];
  const bodyStart = endMatch[0].length;
  const body = content.slice(bodyStart);
  
  // Parse simple key: value pairs
  for (const line of frontmatterText.split(/\r?\n/)) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    
    if (key && value !== undefined) {
      frontmatter[key] = value;
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
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  
  return {
    name: frontmatter.name,
    description: frontmatter.description,
    model: frontmatter.model,
    tools: tools?.length ? tools : undefined,
    systemPrompt: body.trim(),
  };
}

/**
 * Extract the file name without extension for agent naming
 */
export function getAgentNameFromFile(filePath: string): string {
  const baseName = filePath.split(/[/\\]/).pop() || "";
  return baseName.replace(/\.md$/i, "");
}