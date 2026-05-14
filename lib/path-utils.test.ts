/**
 * Unit tests for path-utils.ts
 * Run with: node --test lib/path-utils.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  findNearestProjectAgentsDir,
  normalizePath,
  dirname,
  joinPath
} from './path-utils.ts';

describe('findNearestProjectAgentsDir', () => {
  it('finds directory at current level', () => {
    const exists = (p: string) => p === '/project/.pi/agents';

    const result = findNearestProjectAgentsDir('/project', exists);

    assert.equal(result, '/project/.pi/agents');
  });

  it('finds directory at parent level', () => {
    const exists = (p: string) =>
      p === '/project/.pi/agents' || p === '/project/src/.pi/agents';

    const result = findNearestProjectAgentsDir('/project/src/components', exists);

    assert.equal(result, '/project/src/.pi/agents');
  });

  it('finds directory at grandparent level', () => {
    const exists = (p: string) => p === '/home/user/.pi/agents';

    const result = findNearestProjectAgentsDir('/home/user/project/src', exists);

    assert.equal(result, '/home/user/.pi/agents');
  });

  it('returns null when no directory found', () => {
    const exists = () => false;

    const result = findNearestProjectAgentsDir('/home/user/project', exists);

    assert.equal(result, null);
  });

  it('stops at root', () => {
    let callCount = 0;
    const exists = () => {
      callCount++;
      return false;
    };

    const result = findNearestProjectAgentsDir('/', exists);

    assert.equal(result, null);
    assert.equal(callCount, 1); // Only checks root
  });

  it('handles nested project structure correctly', () => {
    const existingDirs = new Set([
      '/workspace/.pi/agents',
      '/workspace/project/.pi/agents'
    ]);
    const exists = (p: string) => existingDirs.has(p);

    // Should find the closest one
    const result = findNearestProjectAgentsDir('/workspace/project/src', exists);

    assert.equal(result, '/workspace/project/.pi/agents');
  });
});

describe('normalizePath', () => {
  it('returns forward slashes unchanged', () => {
    assert.equal(normalizePath('/home/user/file.txt'), '/home/user/file.txt');
  });

  it('converts backslashes to forward slashes', () => {
    assert.equal(normalizePath('\\home\\user\\file.txt'), '/home/user/file.txt');
  });

  it('handles mixed slashes', () => {
    assert.equal(normalizePath('/home\\user/file.txt'), '/home/user/file.txt');
  });

  it('handles empty string', () => {
    assert.equal(normalizePath(''), '');
  });

  it('handles Windows drive letters', () => {
    assert.equal(normalizePath('C:\\Users\\file.txt'), 'C:/Users/file.txt');
  });
});

describe('dirname', () => {
  it('returns parent directory', () => {
    assert.equal(dirname('/home/user/file.txt'), '/home/user');
  });

  it('handles single level path', () => {
    assert.equal(dirname('/file.txt'), '/');
  });

  it('handles nested directories', () => {
    assert.equal(dirname('/a/b/c/d/file.txt'), '/a/b/c/d');
  });

  it('handles Windows paths (normalized)', () => {
    assert.equal(dirname('C:/Users/file.txt'), 'C:/Users');
  });

  it('handles paths without filename', () => {
    // Trailing slash means empty filename, so dirname returns the directory itself
    assert.equal(dirname('/home/user/'), '/home/user');
  });

  it('handles single component path', () => {
    assert.equal(dirname('user'), '');
  });
});

describe('joinPath', () => {
  it('joins two segments', () => {
    assert.equal(joinPath('/home', 'user'), '/home/user');
  });

  it('joins multiple segments', () => {
    assert.equal(joinPath('/home', 'user', 'docs', 'file.txt'), '/home/user/docs/file.txt');
  });

  it('handles trailing slashes', () => {
    assert.equal(joinPath('/home/', 'user/'), '/home/user');
  });

  it('handles Windows-style segments', () => {
    assert.equal(joinPath('C:\\Users', 'Documents'), 'C:/Users/Documents');
  });

  it('handles empty segments', () => {
    assert.equal(joinPath('/home', '', 'user'), '/home/user');
  });

  it('handles single segment', () => {
    assert.equal(joinPath('/home'), '/home');
  });

  it('handles no segments', () => {
    assert.equal(joinPath(), '');
  });

  it('handles relative paths', () => {
    assert.equal(joinPath('.', 'config', 'settings.json'), './config/settings.json');
  });
});
