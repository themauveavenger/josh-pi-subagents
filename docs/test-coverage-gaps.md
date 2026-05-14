# Test Coverage Gaps — Sad Path Analysis

> Generated from unit test review on 2026-05-14

## Overview

4 test files, 68 tests total. Happy path coverage is solid. Sad path coverage has gaps primarily around **defensive input validation**.

## File-by-File Gaps

### `lib/formatter.test.ts` (22 tests)

- No tests for `null`/`undefined` agent input
- No tests for negative `maxItems` values
- No tests for invalid agent objects (missing required fields)

### `lib/parser.test.ts` (18 tests)

- No tests for malformed YAML syntax (invalid keys, wrong indentation)
- No tests for wrong types (e.g., `name` as number instead of string)
- No tests for empty string input to `parseAgentContent`
- No tests for `getAgentNameFromFile` with `null`/`undefined`

### `lib/path-utils.test.ts` (22 tests)

- No tests for `null`/`undefined` path inputs
- No tests for paths with `..` components (path traversal)
- No tests for permission/access errors
- No tests for maximum path depth or cycle prevention
- No tests for extremely long paths

### `lib/roster.test.ts` (6 tests)

- No tests for `null`/`undefined` in agent list
- No tests for duplicate agent names
- No tests for agents with missing required fields
- No tests for empty/whitespace-only agent names

## Cross-Cutting Gaps

| Category | Missing |
|----------|---------|
| **Null/undefined inputs** | All 4 files lack tests for `null`/`undefined` arguments |
| **Type validation** | No tests for wrong types (number where string expected, etc.) |
| **Malformed data** | parser missing invalid YAML; roster missing malformed agents |
| **Boundary conditions** | Negative numbers, empty strings in unexpected positions |
| **Path security** | No `..` path traversal, symlink loops, or max depth tests |