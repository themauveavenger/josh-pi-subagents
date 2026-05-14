/**
 * Path utilities - pure functions for unit testing
 */

/**
 * Find the nearest project agents directory by walking up from cwd
 * Returns null if no .pi/agents directory is found
 */
export function findNearestProjectAgentsDir(
  cwd: string,
  exists: (p: string) => boolean
): string | null {
  let currentDir = cwd;

  while (true) {
    // Use / for path joining in the check function
    const candidate = currentDir + '/.pi/agents';

    if (exists(candidate)) {
      return candidate;
    }

    const parentDir = currentDir.split('/').slice(0, -1).join('/') || '/';

    // Stop at root
    if (parentDir === currentDir || parentDir === '') {
      return null;
    }

    currentDir = parentDir;
  }
}

/**
 * Normalize a path to use forward slashes
 */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * Get the directory name from a path
 */
export function dirname(p: string): string {
  const normalized = normalizePath(p);
  const parts = normalized.split('/');
  parts.pop();
  // Handle root directory case: "/file" -> parts ["", "file"] -> pop -> [""] -> join -> ""
  // But we want "/" for root. However, "file" -> parts ["file"] -> pop -> [] -> join -> ""
  // and we want "" for that case. So only add "/" if original started with "/" and result is empty.
  const result = parts.join('/');
  if (normalized.startsWith('/') && result === '') {
    return '/';
  }
  return result;
}

/**
 * Join path segments with forward slashes
 */
export function joinPath(...segments: string[]): string {
  return segments
    .map(s => s.replace(/\\/g, '/').replace(/\/$/, ''))
    .filter(Boolean)
    .join('/');
}
