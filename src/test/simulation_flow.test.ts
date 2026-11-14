/**
 * simulation_flow.test.ts
 * Suite for Milestone 4: Simulation UI integration, empty string handling,
 * trace navigation, graph highlighting, and the 10 manual verification cases.
 */

import { describe, it, expect } from 'vitest';
import {
  compileRegex,
  simulate,
  isTokenizeError,
  isParseError,
  type NFA,
} from '../engine/index.js';
import {
  nfaToFlow,
  findActiveEdgesForStep,
  updateFlowGraphHighlight,
} from '../graph/index.js';

function getCompiledNFA(regex: string): NFA {
  const result = compileRegex(regex);
  if (isTokenizeError(result) || isParseError(result)) {
    throw new Error(`Compilation failed for ${regex}: ${result.message}`);
  }
  return result;
}

describe('Milestone 4: The 10 Mandatory Simulation Cases', () => {
  // 1. Regex a*, input empty: Accepted.
  it('1. Regex a*, input empty: Accepted', () => {
    const nfa = getCompiledNFA('a*');
    const sim = simulate('', nfa);
    expect(sim.accepted).toBe(true);
    expect(sim.steps.length).toBe(1); // Step 0 (initial closure)
  });

  // 2. Regex a*, input aaaa: Accepted.
  it('2. Regex a*, input aaaa: Accepted', () => {
    const nfa = getCompiledNFA('a*');
    const sim = simulate('aaaa', nfa);
    expect(sim.accepted).toBe(true);
    expect(sim.steps.length).toBe(5); // Step 0 + 4 steps for 'a'
  });

  // 3. Regex a*, input b: Rejected.
  it('3. Regex a*, input b: Rejected', () => {
    const nfa = getCompiledNFA('a*');
    const sim = simulate('b', nfa);
    expect(sim.accepted).toBe(false);
    expect(sim.rejectionReason).toMatch(/no transition/i);
  });

  // 4. Regex ab, input ab: Accepted.
  it('4. Regex ab, input ab: Accepted', () => {
    const nfa = getCompiledNFA('ab');
    const sim = simulate('ab', nfa);
    expect(sim.accepted).toBe(true);
    expect(sim.steps.length).toBe(3); // Step 0 + 'a' + 'b'
  });

  // 5. Regex ab, input a: Rejected.
  it('5. Regex ab, input a: Rejected', () => {
    const nfa = getCompiledNFA('ab');
    const sim = simulate('a', nfa);
    expect(sim.accepted).toBe(false);
    expect(sim.rejectionReason).toMatch(/do not include any accepting state/i);
  });

  // 6. Regex E, input empty: Accepted.
  it('6. Regex E, input empty: Accepted', () => {
    const nfa = getCompiledNFA('E');
    const sim = simulate('', nfa);
    expect(sim.accepted).toBe(true);
    expect(sim.finalActiveStates).toContain(nfa.acceptingStates[0]);
  });

  // 7. Regex E|a, input empty: Accepted.
  it('7. Regex E|a, input empty: Accepted', () => {
    const nfa = getCompiledNFA('E|a');
    const sim = simulate('', nfa);
    expect(sim.accepted).toBe(true);
  });

  // 8. Regex (a|b)*abb, input aabb: Accepted.
  it('8. Regex (a|b)*abb, input aabb: Accepted', () => {
    const nfa = getCompiledNFA('(a|b)*abb');
    const sim = simulate('aabb', nfa);
    expect(sim.accepted).toBe(true);
    expect(sim.steps.length).toBe(5); // Step 0 + 'a' + 'a' + 'b' + 'b'
  });

  // 9. Regex (a|b)*abb, input ab: Rejected.
  it('9. Regex (a|b)*abb, input ab: Rejected', () => {
    const nfa = getCompiledNFA('(a|b)*abb');
    const sim = simulate('ab', nfa);
    expect(sim.accepted).toBe(false);
  });

  // 10. A missing transition produces a readable rejection explanation without crashing.
  it('10. Missing transition produces readable rejection explanation without crashing', () => {
    const nfa = getCompiledNFA('ab');
    const sim = simulate('az', nfa);
    expect(sim.accepted).toBe(false);
    expect(sim.rejectionReason).toBeDefined();
    expect(sim.rejectionReason).toMatch(/no transition on 'z'/i);
    expect(sim.finalActiveStates).toEqual([]);
  });
});

describe('Milestone 4: Trace Navigation & Highlighting', () => {
  it('step list is stable and contains stepIndex, symbols, and active states', () => {
    const nfa = getCompiledNFA('ab');
    const sim = simulate('ab', nfa);

    expect(sim.steps.length).toBe(3);
    // Step 0
    expect(sim.steps[0].stepIndex).toBe(0);
    expect(sim.steps[0].symbol).toBeNull();
    expect(sim.steps[0].activeStatesAfter.length).toBeGreaterThan(0);

    // Step 1
    expect(sim.steps[1].stepIndex).toBe(1);
    expect(sim.steps[1].symbol).toBe('a');

    // Step 2
    expect(sim.steps[2].stepIndex).toBe(2);
    expect(sim.steps[2].symbol).toBe('b');
  });

  it('updateFlowGraphHighlight marks active states and subdues inactive states', () => {
    const nfa = getCompiledNFA('a');
    const baseGraph = nfaToFlow(nfa);

    // Active state: q0 (start)
    const activeStates = new Set<number>([nfa.startState]);
    const highlightedGraph = updateFlowGraphHighlight(baseGraph, activeStates, true);

    const startNode = highlightedGraph.nodes.find((n) => n.id === `state-${nfa.startState}`);
    const acceptNode = highlightedGraph.nodes.find((n) => n.id === `state-${nfa.acceptingStates[0]}`);

    expect(startNode?.data.isActive).toBe(true);
    expect(startNode?.data.isSimulationActive).toBe(true);
    expect(acceptNode?.data.isActive).toBe(false);
    expect(acceptNode?.data.isSimulationActive).toBe(true);
  });

  it('updateFlowGraphHighlight restores base styling when isSimulationActive is false', () => {
    const nfa = getCompiledNFA('a');
    const baseGraph = nfaToFlow(nfa);

    const idleGraph = updateFlowGraphHighlight(baseGraph, new Set(), false);
    for (const node of idleGraph.nodes) {
      expect(node.data.isActive).toBe(false);
      expect(node.data.isSimulationActive).toBe(false);
    }
  });

  it('findActiveEdgesForStep highlights valid traversed transitions', () => {
    const nfa = getCompiledNFA('ab');
    const sim = simulate('ab', nfa);

    // Step 1 consumes 'a' from activeStatesBefore
    const step1 = sim.steps[1];
    const activeEdges = findActiveEdgesForStep(nfa, step1);
    expect(activeEdges.size).toBeGreaterThan(0);
  });

  it('records symbol transitions, epsilon closure transitions, and consumption progress', () => {
    const nfa = getCompiledNFA('ab');
    const sim = simulate('ab', nfa);

    expect(sim.consumedCharacters).toBe(2);
    expect(sim.steps[0].inputPosition).toBeNull();
    expect(sim.steps[1].symbolTransitions).toEqual([{ from: 0, to: 1, symbol: 'a' }]);
    expect(sim.steps[1].epsilonTransitions).toEqual([{ from: 1, to: 2 }]);
    expect(sim.steps[2].symbolTransitions).toEqual([{ from: 2, to: 3, symbol: 'b' }]);
  });

  it('tracks a dead step without claiming all input was consumed', () => {
    const nfa = getCompiledNFA('ab');
    const sim = simulate('az', nfa);

    expect(sim.accepted).toBe(false);
    expect(sim.consumedCharacters).toBe(1);
    expect(sim.steps.at(-1)?.activeStatesAfter).toEqual([]);
  });

  it('keeps graph positions unchanged while highlighting different trace steps', () => {
    const nfa = getCompiledNFA('(a|b)*abb');
    const baseGraph = nfaToFlow(nfa);
    const before = new Map(baseGraph.nodes.map((node) => [node.id, { ...node.position }]));
    const sim = simulate('abb', nfa);

    updateFlowGraphHighlight(
      baseGraph,
      new Set(sim.steps[1].activeStatesAfter),
      true,
      findActiveEdgesForStep(nfa, sim.steps[1]),
    );
    updateFlowGraphHighlight(
      baseGraph,
      new Set(sim.steps.at(-1)!.activeStatesAfter),
      true,
      findActiveEdgesForStep(nfa, sim.steps.at(-1)),
    );

    for (const node of baseGraph.nodes) {
      expect(node.position).toEqual(before.get(node.id));
    }
  });

  it('rejects when an accepting state is reached before remaining input is consumed', () => {
    const nfa = getCompiledNFA('a');
    const sim = simulate('aa', nfa);

    expect(sim.accepted).toBe(false);
    expect(sim.consumedCharacters).toBe(1);
    expect(sim.finalActiveStates).toEqual([]);
  });
});
