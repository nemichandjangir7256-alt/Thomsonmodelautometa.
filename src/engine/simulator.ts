/**
 * simulator.ts
 * Simulates an input string against an NFA produced by Thompson's construction.
 *
 * Algorithm (from PROJECT_SPEC §5.6):
 *  1. Compute initial active set = epsilonClosure([startState]).
 *  2. For each symbol c in input:
 *     a. next = move(active, c, nfa)     (move already applies ε-closure)
 *     b. Record a SimulationStep.
 *     c. If next is empty → record rejection and stop early.
 *     d. active = next
 *  3. accepted = (active ∩ acceptingStates) ≠ ∅
 *
 * Special cases:
 *  - Empty input: skip step 2; accept if the initial ε-closure contains an
 *    accepting state.
 *  - Missing transition: returns empty next set → clean rejection.
 *
 * This function never throws. It always returns a SimulationResult.
 */

import { epsilonClosure } from './closure.js';
import { EPSILON_SYMBOL } from './constants.js';
import type { NFA, SimulationResult, SimulationStep, StateId } from './types.js';

// ─── Public API ──────────────────────────────────────────────────────────────

export function simulate(input: string, nfa: NFA): SimulationResult {
  const steps: SimulationStep[] = [];

  // ── Step 0: initial ε-closure of the start state ──────────────────────────
  const initialClosure = epsilonClosure([nfa.startState], nfa);

  steps.push({
    stepIndex: 0,
    symbol: null,
    activeStatesBefore: [nfa.startState],
    epsilonClosure: initialClosure,
    activeStatesAfter: initialClosure,
    inputPosition: null,
    epsilonTransitions: findEpsilonTransitions([nfa.startState], initialClosure, nfa),
    epsilonClosureStates: initialClosure.filter((id) => id !== nfa.startState),
    description: `Initial ε-closure of start state {q${nfa.startState}}: {${labelSet(initialClosure)}}`,
  });

  let active = initialClosure;

  // ── Empty input: check immediately ───────────────────────────────────────
  if (input.length === 0) {
    const accepted = intersects(active, nfa.acceptingStates);
    return {
      input,
      accepted,
      steps,
      finalActiveStates: active,
      consumedCharacters: 0,
      rejectionReason: accepted
        ? undefined
        : `Empty input rejected: active states {${labelSet(active)}} do not include any accepting state.`,
    };
  }

  // ── Consume each symbol ───────────────────────────────────────────────────
  for (let i = 0; i < input.length; i++) {
    const symbol = input[i];
    const before = active;

    const symbolTransitions = nfa.transitions.filter(
      (transition) => transition.symbol === symbol && active.includes(transition.from),
    );
    const directTargets = [...new Set(symbolTransitions.map((transition) => transition.to))];
    const next = directTargets.length === 0 ? [] : epsilonClosure(directTargets, nfa);

    const stepIndex = steps.length;

    if (next.length === 0) {
      // Dead state — no transition on this symbol from any active state
      steps.push({
        stepIndex,
        symbol,
        activeStatesBefore: before,
        epsilonClosure: [],
        activeStatesAfter: [],
        inputPosition: i,
        symbolTransitions: [],
        epsilonTransitions: [],
        epsilonClosureStates: [],
        description:
          `Read '${symbol}': no transition from {${labelSet(before)}} on '${symbol}'. Input rejected.`,
      });

      return {
        input,
        accepted: false,
        steps,
        finalActiveStates: [],
        consumedCharacters: i,
        rejectionReason: `No transition on '${symbol}' from states {${labelSet(before)}} at input position ${i}.`,
      };
    }

    steps.push({
      stepIndex,
      symbol,
      activeStatesBefore: before,
      epsilonClosure: next,  // move() already includes ε-closure
      activeStatesAfter: next,
      inputPosition: i,
      symbolTransitions: symbolTransitions.map(({ from, to, symbol: transitionSymbol }) => ({
        from,
        to,
        symbol: transitionSymbol,
      })),
      epsilonTransitions: findEpsilonTransitions(directTargets, next, nfa),
      epsilonClosureStates: next.filter((id) => !directTargets.includes(id)),
      description:
        `Read '${symbol}': move from {${labelSet(before)}} → ε-closure → {${labelSet(next)}}`,
    });

    active = next;
  }

  // ── Final check: does the active set intersect accepting states? ──────────
  const accepted = intersects(active, nfa.acceptingStates);

  return {
    input,
    accepted,
    steps,
    finalActiveStates: active,
    consumedCharacters: input.length,
    rejectionReason: accepted
      ? undefined
      : `Input consumed but active states {${labelSet(active)}} do not include any accepting state.`,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function intersects(a: StateId[], b: StateId[]): boolean {
  const setB = new Set(b);
  return a.some(id => setB.has(id));
}

function labelSet(ids: StateId[]): string {
  return ids.map(id => `q${id}`).join(', ');
}

function findEpsilonTransitions(
  seeds: StateId[],
  closure: StateId[],
  nfa: NFA,
): Array<{ from: StateId; to: StateId }> {
  const allowed = new Set(closure);
  const visited = new Set(seeds);
  const queue = [...seeds];
  const result: Array<{ from: StateId; to: StateId }> = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const transition of nfa.transitions) {
      if (
        transition.from !== current ||
        transition.symbol !== EPSILON_SYMBOL ||
        !allowed.has(transition.to)
      ) {
        continue;
      }
      result.push({ from: transition.from, to: transition.to });
      if (!visited.has(transition.to)) {
        visited.add(transition.to);
        queue.push(transition.to);
      }
    }
  }
  return result;
}
