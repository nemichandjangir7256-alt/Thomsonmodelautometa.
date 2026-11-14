/**
 * closure.ts
 * ε-closure and move operations for NFA simulation.
 *
 * Both functions:
 *  - Return a sorted, deduplicated array of StateIds.
 *  - Use a BFS visited-set to guarantee termination even when ε-cycles exist.
 *  - Are O(S + T) where S = |states|, T = |transitions|.
 */

import { EPSILON_SYMBOL } from './constants.js';
import type { NFA, StateId } from './types.js';

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute the ε-closure of a set of states.
 *
 * Returns every state reachable from any state in `states` by following
 * zero or more ε-transitions. The original states are always included.
 *
 * Guaranteed to terminate even when ε-cycles exist.
 */
export function epsilonClosure(states: StateId[], nfa: NFA): StateId[] {
  const visited = new Set<StateId>(states);
  const queue: StateId[] = [...states];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const t of nfa.transitions) {
      if (t.from === current && t.symbol === EPSILON_SYMBOL) {
        if (!visited.has(t.to)) {
          visited.add(t.to);
          queue.push(t.to);
        }
      }
    }
  }

  return sorted(visited);
}

/**
 * Compute the set of states reachable from `states` by consuming `symbol`,
 * then immediately computing the ε-closure of the resulting set.
 *
 * Returns an empty array if no transition on `symbol` exists from any
 * state in the current active set.
 */
export function move(states: StateId[], symbol: string, nfa: NFA): StateId[] {
  const reachable = new Set<StateId>();

  for (const stateId of states) {
    for (const t of nfa.transitions) {
      if (t.from === stateId && t.symbol === symbol) {
        reachable.add(t.to);
      }
    }
  }

  if (reachable.size === 0) return [];

  // Apply ε-closure to all states reached by the symbol transition
  return epsilonClosure([...reachable], nfa);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Return a sorted array from a Set — deterministic for tests and UI display. */
function sorted(s: Set<StateId>): StateId[] {
  return [...s].sort((a, b) => a - b);
}
