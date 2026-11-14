/**
 * graph.test.ts
 * Tests for the Graph Adapter (nfaToFlow) and Layout engine (computeNFALayout).
 */

import { describe, it, expect } from 'vitest';
import { compileRegex, isTokenizeError, isParseError } from '../engine/index.js';
import { findActiveEdgesForStep, nfaToFlow } from '../graph/nfaToFlow.js';
import { computeNFALayout } from '../graph/layout.js';
import { EPSILON_SYMBOL } from '../engine/constants.js';
import type { NFA } from '../engine/types.js';

function getCompiledNFA(regex: string): NFA {
  const result = compileRegex(regex);
  if (isTokenizeError(result) || isParseError(result)) {
    throw new Error(`Compilation failed for ${regex}: ${result.message}`);
  }
  return result;
}

describe('graph adapter: nfaToFlow', () => {
  it('converts single symbol "a" into 2 nodes and 1 edge', () => {
    const nfa = getCompiledNFA('a');
    const flow = nfaToFlow(nfa);

    expect(flow.nodes.length).toBe(2);
    expect(flow.edges.length).toBe(1);

    const startNode = flow.nodes.find((n) => n.data.isStart);
    const acceptNode = flow.nodes.find((n) => n.data.isAccepting);

    expect(startNode).toBeDefined();
    expect(acceptNode).toBeDefined();
    expect(flow.edges[0].label).toBe('a');
    expect(flow.edges[0].source).toBe(`state-${nfa.startState}`);
    expect(flow.edges[0].target).toBe(`state-${nfa.acceptingStates[0]}`);
  });

  it('converts "E" and "ε" to epsilon transitions labeled with "ε"', () => {
    const flowE = nfaToFlow(getCompiledNFA('E'));
    const flowEps = nfaToFlow(getCompiledNFA('ε'));

    expect(flowE.nodes.length).toBe(2);
    expect(flowE.edges.length).toBe(1);
    expect(flowE.edges[0].label).toBe(EPSILON_SYMBOL);

    expect(flowEps.nodes.length).toBe(2);
    expect(flowEps.edges.length).toBe(1);
    expect(flowEps.edges[0].label).toBe(EPSILON_SYMBOL);
  });

  it('converts "ab" into 4 nodes and 3 edges including epsilon bridge', () => {
    const nfa = getCompiledNFA('ab');
    const flow = nfaToFlow(nfa);

    expect(flow.nodes.length).toBe(4);
    expect(flow.edges.length).toBe(3);

    const labels = flow.edges.map((e) => e.label);
    expect(labels).toContain('a');
    expect(labels).toContain('b');
    expect(labels).toContain(EPSILON_SYMBOL);
  });

  it('converts union "a|b" into 6 nodes and 6 edges with correct start and accepting states', () => {
    const nfa = getCompiledNFA('a|b');
    const flow = nfaToFlow(nfa);

    expect(flow.nodes.length).toBe(6);
    expect(flow.edges.length).toBe(6);

    const startNodes = flow.nodes.filter((n) => n.data.isStart);
    const acceptNodes = flow.nodes.filter((n) => n.data.isAccepting);

    expect(startNodes.length).toBe(1);
    expect(acceptNodes.length).toBe(1);
    expect(startNodes[0].id).toBe(`state-${nfa.startState}`);
    expect(acceptNodes[0].id).toBe(`state-${nfa.acceptingStates[0]}`);
  });

  it('converts Kleene star "a*" into 4 nodes and 5 edges', () => {
    const nfa = getCompiledNFA('a*');
    const flow = nfaToFlow(nfa);

    expect(flow.nodes.length).toBe(4);
    expect(flow.edges.length).toBe(5);

    // Should contain loop-back and skip transitions
    const epsEdges = flow.edges.filter((e) => e.label === EPSILON_SYMBOL);
    expect(epsEdges.length).toBe(4);
    const symbolEdges = flow.edges.filter((e) => e.label === 'a');
    expect(symbolEdges.length).toBe(1);
  });

  it('converts complex expression "(a|b)*abb"', () => {
    const nfa = getCompiledNFA('(a|b)*abb');
    const flow = nfaToFlow(nfa);

    expect(flow.nodes.length).toBeGreaterThan(0);
    expect(flow.edges.length).toBeGreaterThan(0);

    const nodeIds = new Set(flow.nodes.map((n) => n.id));

    // Ensure all edge source and target IDs refer to existing nodes
    for (const edge of flow.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it('correctly handles invalid expressions without crashing', () => {
    const result = compileRegex('a|');
    expect(isParseError(result) || isTokenizeError(result)).toBe(true);
  });
});



describe('graph simulation highlighting', () => {
  it('highlights every transition in a multi-hop epsilon closure', () => {
    const nfa: NFA = {
      states: [0, 1, 2, 3].map((id) => ({
        id,
        label: `q${id}`,
        isStart: id === 0,
        isAccepting: id === 3,
      })),
      transitions: [
        { from: 0, to: 1, symbol: 'a' },
        { from: 1, to: 2, symbol: EPSILON_SYMBOL },
        { from: 2, to: 3, symbol: EPSILON_SYMBOL },
      ],
      startState: 0,
      acceptingStates: [3],
      alphabet: new Set(['a']),
    };

    const activeEdges = findActiveEdgesForStep(nfa, {
      stepIndex: 1,
      symbol: 'a',
      activeStatesBefore: [0],
      epsilonClosure: [1, 2, 3],
      activeStatesAfter: [1, 2, 3],
      description: 'test multi-hop epsilon closure',
    });

    expect(activeEdges).toEqual(new Set(['0->1', '1->2', '2->3']));
  });
});

describe('graph layout: computeNFALayout', () => {
  it('assigns valid finite coordinates to all states', () => {
    const nfa = getCompiledNFA('(a|b)*abb');
    const positions = computeNFALayout(nfa);

    expect(positions.size).toBe(nfa.states.length);

    for (const state of nfa.states) {
      const pos = positions.get(state.id);
      expect(pos).toBeDefined();
      expect(Number.isFinite(pos?.x)).toBe(true);
      expect(Number.isFinite(pos?.y)).toBe(true);
    }
  });

  it('places start state at or before the accepting state horizontally', () => {
    const nfa = getCompiledNFA('ab');
    const positions = computeNFALayout(nfa);

    const startPos = positions.get(nfa.startState)!;
    const acceptPos = positions.get(nfa.acceptingStates[0])!;

    expect(startPos.x).toBeLessThan(acceptPos.x);
  });
});

describe('Milestone 3: Eight Verification Expressions', () => {
  // 1. a
  it('1. Expression "a" compiles to NFA with 2 states and 1 transition', () => {
    const nfa = getCompiledNFA('a');
    const flow = nfaToFlow(nfa);
    expect(nfa.states.length).toBe(2);
    expect(nfa.transitions.length).toBe(1);
    expect(flow.nodes.length).toBe(2);
    expect(flow.edges[0].label).toBe('a');
  });

  // 2. ab
  it('2. Expression "ab" compiles to NFA with 4 states and 3 transitions', () => {
    const nfa = getCompiledNFA('ab');
    const flow = nfaToFlow(nfa);
    expect(nfa.states.length).toBe(4);
    expect(nfa.transitions.length).toBe(3);
    expect(flow.nodes.length).toBe(4);
    expect(flow.edges.length).toBe(3);
  });

  // 3. a|b
  it('3. Expression "a|b" compiles to NFA with 6 states and 6 transitions', () => {
    const nfa = getCompiledNFA('a|b');
    const flow = nfaToFlow(nfa);
    expect(nfa.states.length).toBe(6);
    expect(nfa.transitions.length).toBe(6);
    expect(flow.nodes.length).toBe(6);
  });

  // 4. a*
  it('4. Expression "a*" compiles to NFA with 4 states and 5 transitions', () => {
    const nfa = getCompiledNFA('a*');
    const flow = nfaToFlow(nfa);
    expect(nfa.states.length).toBe(4);
    expect(nfa.transitions.length).toBe(5);
    expect(flow.nodes.length).toBe(4);
  });

  // 5. (a|b)*abb
  it('5. Expression "(a|b)*abb" compiles to NFA with valid topology', () => {
    const nfa = getCompiledNFA('(a|b)*abb');
    const flow = nfaToFlow(nfa);
    expect(nfa.states.length).toBe(14);
    expect(flow.nodes.length).toBe(14);
    const startNode = flow.nodes.find((n) => n.data.isStart);
    const acceptNodes = flow.nodes.filter((n) => n.data.isAccepting);
    expect(startNode).toBeDefined();
    expect(acceptNodes.length).toBe(1);
  });

  // 6. E
  it('6. Expression "E" compiles to 2 states, 1 epsilon transition', () => {
    const nfa = getCompiledNFA('E');
    const flow = nfaToFlow(nfa);
    expect(nfa.states.length).toBe(2);
    expect(nfa.transitions.length).toBe(1);
    expect(flow.edges[0].label).toBe(EPSILON_SYMBOL);
  });

  // 7. ε
  it('7. Expression "ε" compiles to 2 states, 1 epsilon transition', () => {
    const nfa = getCompiledNFA('ε');
    const flow = nfaToFlow(nfa);
    expect(nfa.states.length).toBe(2);
    expect(nfa.transitions.length).toBe(1);
    expect(flow.edges[0].label).toBe(EPSILON_SYMBOL);
  });

  // 6 & 7 equivalence
  it('E and ε compile to equivalent structural behavior', () => {
    const nfaE = getCompiledNFA('E');
    const nfaEps = getCompiledNFA('ε');
    expect(nfaE.states.length).toBe(nfaEps.states.length);
    expect(nfaE.transitions.length).toBe(nfaEps.transitions.length);
    expect(nfaE.transitions[0].symbol).toBe(nfaEps.transitions[0].symbol);
  });

  // 8. a| (invalid expression)
  it('8. Expression "a|" produces structured ParseError and does not crash', () => {
    const result = compileRegex('a|');
    expect(isParseError(result)).toBe(true);
    if (isParseError(result)) {
      expect(result.message).toMatch(/missing right operand/i);
    }
  });
});

describe('React Flow Context boundary regression test', () => {
  it('ReactFlowProvider successfully initializes context and hooks without throwing', async () => {
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');
    const { ReactFlowProvider, useReactFlow } = await import('@xyflow/react');

    const TestChild = () => {
      // Calling useReactFlow outside ReactFlowProvider throws:
      // "[React Flow]: Seems like you have not used ReactFlowProvider as an ancestor. [https://reactflow.dev/error#001]"
      const flow = useReactFlow();
      expect(flow).toBeDefined();
      expect(typeof flow.fitView).toBe('function');
      return React.createElement('div', { id: 'test-flow-child' }, 'ok');
    };

    // Outside ReactFlowProvider it must throw error 001
    expect(() => {
      ReactDOMServer.renderToString(React.createElement(TestChild));
    }).toThrow(/ReactFlowProvider as an ancestor/i);

    // Inside ReactFlowProvider it renders cleanly without throwing
    expect(() => {
      const html = ReactDOMServer.renderToString(
        React.createElement(ReactFlowProvider, null, React.createElement(TestChild))
      );
      expect(html).toContain('test-flow-child');
    }).not.toThrow();
  });
});
