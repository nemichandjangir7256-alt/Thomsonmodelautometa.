/**
 * layout.ts
 * Deterministic layered layout algorithm for Thompson ε-NFAs.
 *
 * Computes (x, y) coordinates for each state by finding topological
 * ranks (layers) from the start state, ignoring back-edges (cycles).
 * Spreads states within each layer vertically and centers them.
 */

import type { NFA, StateId } from '../engine/types.js';

export interface NodePosition {
  x: number;
  y: number;
}

export interface GraphLayoutConfig {
  horizontalSpacing?: number;
  verticalSpacing?: number;
  originX?: number;
  originY?: number;
}

const DEFAULT_CONFIG: Required<GraphLayoutConfig> = {
  horizontalSpacing: 180,
  verticalSpacing: 110,
  originX: 100,
  originY: 180,
};

/**
 * Assigns deterministic 2D positions to all states in an NFA.
 *
 * Algorithm:
 * 1. Compute DAG layer for each state using BFS from startState.
 *    Forward transitions advance the layer. Back-edges (which loop back
 *    to an already visited state with a lower/equal layer) are ignored
 *    for layer advancement to prevent cycle explosion.
 * 2. Group states by their assigned layer.
 * 3. Position layers horizontally (left to right) and states within
 *    each layer vertically (centered).
 */
export function computeNFALayout(
  nfa: NFA,
  customConfig?: GraphLayoutConfig,
): Map<StateId, NodePosition> {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const positions = new Map<StateId, NodePosition>();

  if (nfa.states.length === 0) {
    return positions;
  }

  // Build adjacency list for fast neighbor lookup
  const adj = new Map<StateId, Set<StateId>>();
  for (const s of nfa.states) {
    adj.set(s.id, new Set());
  }
  for (const t of nfa.transitions) {
    adj.get(t.from)?.add(t.to);
  }

  // 1. Assign layers using BFS with cycle detection
  const layerMap = new Map<StateId, number>();
  layerMap.set(nfa.startState, 0);

  const queue: StateId[] = [nfa.startState];
  const inQueue = new Set<StateId>([nfa.startState]);
  const processed = new Set<StateId>();

  // Use a bounded relaxation pass to find longest forward paths
  let iterations = 0;
  const maxIterations = nfa.states.length * 2;

  while (queue.length > 0 && iterations++ < maxIterations) {
    const current = queue.shift()!;
    inQueue.delete(current);
    processed.add(current);

    const currentLayer = layerMap.get(current) ?? 0;
    const neighbors = adj.get(current) ?? new Set();

    for (const next of neighbors) {
      if (next === current) continue; // skip self-loops

      const nextLayer = layerMap.get(next);
      const proposedLayer = currentLayer + 1;

      // If next hasn't been visited or we found a longer forward path
      // that is NOT a cycle back to an earlier layer
      if (nextLayer === undefined) {
        layerMap.set(next, proposedLayer);
        if (!inQueue.has(next)) {
          queue.push(next);
          inQueue.add(next);
        }
      } else if (proposedLayer > nextLayer && !processed.has(next)) {
        layerMap.set(next, proposedLayer);
        if (!inQueue.has(next)) {
          queue.push(next);
          inQueue.add(next);
        }
      }
    }
  }

  // Handle any disconnected states (defensive)
  for (const s of nfa.states) {
    if (!layerMap.has(s.id)) {
      layerMap.set(s.id, 0);
    }
  }

  // Ensure the accepting state is at or beyond the max layer
  const maxLayer = Math.max(...Array.from(layerMap.values()), 0);
  for (const accId of nfa.acceptingStates) {
    const currentAccLayer = layerMap.get(accId) ?? 0;
    if (currentAccLayer < maxLayer) {
      layerMap.set(accId, maxLayer);
    }
  }

  // 2. Group states by layer
  const layers = new Map<number, StateId[]>();
  for (const [stateId, layer] of layerMap.entries()) {
    if (!layers.has(layer)) {
      layers.set(layer, []);
    }
    layers.get(layer)!.push(stateId);
  }

  // Sort state IDs within each layer for deterministic placement
  for (const stateList of layers.values()) {
    stateList.sort((a, b) => a - b);
  }

  // 3. Compute coordinates
  for (const [layerIndex, stateList] of layers.entries()) {
    const x = config.originX + layerIndex * config.horizontalSpacing;
    const totalHeight = (stateList.length - 1) * config.verticalSpacing;
    const startY = config.originY - totalHeight / 2;

    stateList.forEach((stateId, index) => {
      const y = startY + index * config.verticalSpacing;
      positions.set(stateId, { x, y });
    });
  }

  return positions;
}
