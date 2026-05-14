/**
 * Unit tests for parser.ts
 * Run with: node --test lib/parser.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  parseFrontmatter,
  parseAgentContent,
  getAgentNameFromFile,
} from "./parser.ts";

describe("parseFrontmatter", () => {
  it("parses basic frontmatter", () => {
    const content = `---
name: researcher
description: A research agent
---
You are a research specialist.`;

    const result = parseFrontmatter(content);

    assert.equal(result.frontmatter.name, "researcher");
    assert.equal(result.frontmatter.description, "A research agent");
    assert.equal(result.body, "You are a research specialist.");
  });

  it("parses frontmatter with CRLF line endings", () => {
    const content = `---\r\nname: researcher\r\ndescription: A research agent\r\n---\r\nYou are a research specialist.`;

    const result = parseFrontmatter(content);

    assert.equal(result.frontmatter.name, "researcher");
    assert.equal(result.frontmatter.description, "A research agent");
    assert.equal(result.body, "You are a research specialist.");
  });

  it("returns empty frontmatter when no delimiters", () => {
    const content = "Just some markdown without frontmatter.";

    const result = parseFrontmatter(content);

    assert.deepEqual(result.frontmatter, {});
    assert.equal(result.body, content);
  });

  it("returns empty frontmatter when frontmatter is unclosed", () => {
    const content = `---
name: researcher
This frontmatter never closes.`;

    const result = parseFrontmatter(content);

    // Should not parse unclosed frontmatter
    assert.deepEqual(result.frontmatter, {});
  });

  it("parses frontmatter with quoted colons in values", () => {
    // Values with colons must be quoted in YAML
    const content = `---
name: test
description: "URL: https://example.com"
---
Body here.`;

    const result = parseFrontmatter(content);

    assert.equal(result.frontmatter.name, "test");
    assert.equal(result.frontmatter.description, "URL: https://example.com");
  });

  it("handles null frontmatter values as undefined", () => {
    // In YAML, empty values are null, not empty string
    const content = `---
name: test
empty:
---
Body.`;

    const result = parseFrontmatter(content);

    assert.equal(result.frontmatter.name, "test");
    assert.equal(result.frontmatter.empty, undefined);
  });

  it("handles explicit empty string values", () => {
    // Explicitly quoted empty string
    const content = `---
name: test
empty: ""
---
Body.`;

    const result = parseFrontmatter(content);

    assert.equal(result.frontmatter.name, "test");
    assert.equal(result.frontmatter.empty, "");
  });
});

describe("parseAgentContent", () => {
  it("parses valid agent definition", () => {
    const content = `---
name: researcher
description: A research agent
model: claude-haiku-4-5
tools: read, grep, find
---
You are a research specialist.`;

    const result = parseAgentContent(content, "researcher.md");

    assert.notEqual(result, null);
    assert.equal(result?.name, "researcher");
    assert.equal(result?.description, "A research agent");
    assert.equal(result?.model, "claude-haiku-4-5");
    assert.deepEqual(result?.tools, ["read", "grep", "find"]);
    assert.equal(result?.systemPrompt, "You are a research specialist.");
  });

  it("returns null for missing name", () => {
    const content = `---
description: Missing name field
---
Body.`;

    const result = parseAgentContent(content, "invalid.md");

    assert.equal(result, null);
  });

  it("returns null for missing description", () => {
    const content = `---
name: unnamed
---
Body.`;

    const result = parseAgentContent(content, "invalid.md");

    assert.equal(result, null);
  });

  it("handles optional tools field", () => {
    const content = `---
name: simple
description: Simple agent without tools
---
Just a prompt.`;

    const result = parseAgentContent(content, "simple.md");

    assert.notEqual(result, null);
    assert.equal(result?.tools, undefined);
    assert.equal(result?.model, undefined);
  });

  it("handles empty tools string", () => {
    const content = `---
name: notools
description: Agent with empty tools
tools:
---
Body.`;

    const result = parseAgentContent(content, "notools.md");

    assert.notEqual(result, null);
    assert.equal(result?.tools, undefined);
  });

  it("trims whitespace from tools", () => {
    const content = `---
name: test
description: Test agent
tools:  read  ,  grep , find  
---
Body.`;

    const result = parseAgentContent(content, "test.md");

    assert.deepEqual(result?.tools, ["read", "grep", "find"]);
  });

  it("trims whitespace from system prompt", () => {
    const content = `---
name: test
description: Test
---
  
  Prompt with surrounding whitespace  
  `;

    const result = parseAgentContent(content, "test.md");

    assert.equal(result?.systemPrompt, "Prompt with surrounding whitespace");
  });
});

describe("getAgentNameFromFile", () => {
  it("extracts name from simple filename", () => {
    assert.equal(getAgentNameFromFile("researcher.md"), "researcher");
  });

  it("extracts name from path", () => {
    assert.equal(
      getAgentNameFromFile("/home/user/.pi/agent/agents/worker.md"),
      "worker"
    );
  });

  it("extracts name from Windows path", () => {
    assert.equal(
      getAgentNameFromFile("C:\\Users\\user\\.pi\\agents\\reviewer.md"),
      "reviewer"
    );
  });

  it("handles filenames with dots", () => {
    assert.equal(getAgentNameFromFile("my.agent.name.md"), "my.agent.name");
  });

  it("returns empty string for empty input", () => {
    assert.equal(getAgentNameFromFile(""), "");
  });
});