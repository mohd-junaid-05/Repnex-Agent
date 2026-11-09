export type WalkDirection = "blast-radius" | "dependency-chain";

export interface TransitiveStep {
  path: string;
  depth: number;
}

/**
 * Pure transitive walk over the edge list.
 * - 'blast-radius': walks incoming edges (dependents - what breaks if filePath changes)
 * - 'dependency-chain': walks outgoing edges (dependencies - what filePath needs)
 * Depth limit defaults to 2.
 */
export function computeTransitiveWalk(
  startPath: string,
  edges: Array<{ sourcePath: string; targetPath: string }>,
  direction: WalkDirection,
  maxDepth: number = 2
): TransitiveStep[] {
  if (!startPath || maxDepth <= 0) return [];

  // Build adjacency list based on direction
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    const from = direction === "blast-radius" ? edge.targetPath : edge.sourcePath;
    const to = direction === "blast-radius" ? edge.sourcePath : edge.targetPath;

    let neighbors = adj.get(from);
    if (!neighbors) {
      neighbors = [];
      adj.set(from, neighbors);
    }
    neighbors.push(to);
  }

  const results: TransitiveStep[] = [];
  const visited = new Set<string>([startPath]);
  const queue: Array<[string, number]> = [[startPath, 0]];

  while (queue.length > 0) {
    const [curr, depth] = queue.shift()!;

    if (depth >= maxDepth) continue;

    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        results.push({ path: next, depth: depth + 1 });
        queue.push([next, depth + 1]);
      }
    }
  }

  return results;
}
