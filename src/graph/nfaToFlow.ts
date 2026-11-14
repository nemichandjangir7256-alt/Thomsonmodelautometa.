/**
 * nfaToFlow.ts
 * Adapter converting an NFA into React Flow nodes and edges.
 *
 * Responsibilities:
 * - Map each NFAState to a React Flow Node with calculated layout coordinates.
 * - Merge parallel transitions between identical state pairs (e.g. "a, b").
 * - Label ε-transitions as 'ε' (using EPSILON_SYMBOL).
 * - Direct edges with arrow markers and appropriate connection handles.
 * - Defensive validation ensuring all edge endpoints reference existing nodes.
 * - Provide lightweight highlighting utilities for live simulation trace updates
 *   without recalculating node layout.
 */

import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { EPSILON_SYMBOL } from '../engine/constants.js';
import type { NFA, SimulationStep } from '../engine/types.js';
import { computeNFALayout, type NodePosition } from './layout.js';
import type { StateNodeData } from './customNodes.js';

export interface FlowGraph {
  nodes: Node<StateNodeData>[];
  edges: Edge[];
}

export function nfaToFlow(nfa: NFA): FlowGraph {
  if (!nfa || !nfa.states) {
    return { nodes: [], edges: [] };
  }

  // 1. Compute positions using layered layout
  const positions: Map<number, NodePosition> = computeNFALayout(nfa);

  const existingStateIds = new Set<number>(nfa.states.map((s) => s.id));

  // 2. Generate React Flow Nodes
  const nodes: Node<StateNodeData>[] = nfa.states.map((state) => {
    const pos = positions.get(state.id) ?? { x: 100, y: 150 };
    const isStart = state.id === nfa.startState;
    const isAccepting = nfa.acceptingStates.includes(state.id);

    return {
      id: `state-${state.id}`,
      type: 'stateNode',
      position: { x: pos.x, y: pos.y },
      data: {
        label: state.label || `q${state.id}`,
        isStart,
        isAccepting,
        isActive: false,
        isSimulationActive: false,
        isEpsilonActive: false,
      },
      selectable: true,
      draggable: true,
    };
  });

  // 3. Group transitions by (from -> to) pair to avoid duplicate edges
  const edgeGroups = new Map<string, { from: number; to: number; symbols: Set<string> }>();

  for (const t of nfa.transitions) {
    // Defensive check: ensure transition endpoints exist in the state set
    if (!existingStateIds.has(t.from) || !existingStateIds.has(t.to)) {
      continue;
    }

    const key = `${t.from}->${t.to}`;
    if (!edgeGroups.has(key)) {
      edgeGroups.set(key, { from: t.from, to: t.to, symbols: new Set() });
    }
    edgeGroups.get(key)!.symbols.add(t.symbol);
  }

  // 4. Generate React Flow Edges
  const edges: Edge[] = [];

  for (const [key, group] of edgeGroups.entries()) {
    const fromId = `state-${group.from}`;
    const toId = `state-${group.to}`;
    const fromPos = positions.get(group.from) ?? { x: 0, y: 0 };
    const toPos = positions.get(group.to) ?? { x: 0, y: 0 };

    // Format label: sort symbols (symbols first, ε last for consistency)
    const sortedSymbols = Array.from(group.symbols).sort((a, b) => {
      if (a === EPSILON_SYMBOL) return 1;
      if (b === EPSILON_SYMBOL) return -1;
      return a.localeCompare(b);
    });
    const label = sortedSymbols.join(', ');
    const hasEpsilonOnly = sortedSymbols.length === 1 && sortedSymbols[0] === EPSILON_SYMBOL;

    const isSelfLoop = group.from === group.to;
    const isBackwards = fromPos.x > toPos.x;
    const isSameColumn = Math.abs(fromPos.x - toPos.x) < 10 && group.from !== group.to;

    let sourceHandle = 'source-right';
    let targetHandle = 'target-left';
    let edgeType = 'default';

    if (isSelfLoop) {
      sourceHandle = 'source-top';
      targetHandle = 'target-bottom';
      edgeType = 'smoothstep';
    } else if (isBackwards) {
      // Loopback transition (e.g. Kleene star repeat arc)
      sourceHandle = 'source-top';
      targetHandle = 'target-top';
      edgeType = 'smoothstep';
    } else if (isSameColumn) {
      if (fromPos.y < toPos.y) {
        sourceHandle = 'source-bottom';
        targetHandle = 'target-top';
      } else {
        sourceHandle = 'source-top';
        targetHandle = 'target-bottom';
      }
      edgeType = 'smoothstep';
    }

    edges.push({
      id: `edge-${key}`,
      source: fromId,
      target: toId,
      sourceHandle,
      targetHandle,
      type: edgeType,
      label,
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: hasEpsilonOnly ? '#60a5fa' : '#94a3b8',
      },
      style: {
        stroke: hasEpsilonOnly ? '#60a5fa' : '#64748b',
        strokeWidth: hasEpsilonOnly ? 1.75 : 1.5,
        strokeDasharray: hasEpsilonOnly ? '4 3' : undefined,
      },
      labelStyle: {
        fill: hasEpsilonOnly ? '#93c5fd' : '#e2e8f0',
        fontWeight: 600,
        fontSize: 12,
        fontFamily: 'monospace',
      },
      labelBgStyle: {
        fill: '#0f172a',
        fillOpacity: 0.9,
        stroke: hasEpsilonOnly ? '#3b82f6' : '#334155',
        strokeWidth: 1,
        rx: 4,
        ry: 4,
      },
      labelBgPadding: [6, 3],
    });
  }

  return { nodes, edges };
}

/**
 * Identifies transitions unambiguously traversed during a given simulation step.
 * Returns a set of edge keys ("from->to").
 */
export function findActiveEdgesForStep(nfa: NFA, step?: SimulationStep): Set<string> {
  const activeKeys = new Set<string>();

  if (!step || !nfa) return activeKeys;

  if (step.stepIndex === 0) {
    // Step 0: Initial epsilon closure from the start state
    const closureSet = new Set(step.epsilonClosure);
    for (const t of nfa.transitions) {
      if (t.symbol === EPSILON_SYMBOL && closureSet.has(t.from) && closureSet.has(t.to)) {
        activeKeys.add(`${t.from}->${t.to}`);
      }
    }
    return activeKeys;
  }

  // Step > 0: symbol transition + immediate epsilon closure
  const symbol = step.symbol;
  if (!symbol) return activeKeys;

  const beforeSet = new Set(step.activeStatesBefore);
  const afterSet = new Set(step.activeStatesAfter);
  const directlyReached = new Set<number>();

  // 1. Symbol moves from activeStatesBefore on current symbol
  for (const t of nfa.transitions) {
    if (beforeSet.has(t.from) && t.symbol === symbol) {
      activeKeys.add(`${t.from}->${t.to}`);
      directlyReached.add(t.to);
    }
  }

  // 2. Traverse the complete epsilon-closure, not just one epsilon hop.
  //    A valid closure path can contain several consecutive ε-transitions
  //    (and cycles), so use a visited set to avoid both missed highlights
  //    and infinite traversal.
  const visited = new Set<number>(directlyReached);
  const queue = [...directlyReached];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const t of nfa.transitions) {
      if (
        t.from !== current ||
        t.symbol !== EPSILON_SYMBOL ||
        !afterSet.has(t.to)
      ) {
        continue;
      }

      activeKeys.add(`${t.from}->${t.to}`);

      if (!visited.has(t.to)) {
        visited.add(t.to);
        queue.push(t.to);
      }
    }
  }

  return activeKeys;
}

/**
 * Re-applies active and subdued styling to an existing FlowGraph without
 * recalculating layout coordinates.
 */
export function updateFlowGraphHighlight(
  baseGraph: FlowGraph,
  activeStateIds: Set<number>,
  isSimulationActive: boolean,
  activeEdgeKeys?: Set<string>,
  epsilonStateIds?: Set<number>,
): FlowGraph {
  const updatedNodes = baseGraph.nodes.map((node) => {
    const stateId = Number(node.id.replace('state-', ''));
    const isActive = activeStateIds.has(stateId);
    return {
      ...node,
      data: {
        ...node.data,
        isActive,
        isSimulationActive,
        isEpsilonActive: isSimulationActive && Boolean(epsilonStateIds?.has(stateId)),
      },
    };
  });

  const updatedEdges = baseGraph.edges.map((edge) => {
    const key = edge.id.replace('edge-', '');
    const isActive = isSimulationActive && activeEdgeKeys ? activeEdgeKeys.has(key) : false;

    if (isSimulationActive) {
      if (isActive) {
        return {
          ...edge,
          animated: true,
          className: 'simulation-active-edge',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: '#fbbf24',
          },
          style: {
            ...edge.style,
            stroke: '#fbbf24',
            strokeWidth: 2.5,
            opacity: 1,
          },
          labelStyle: {
            ...edge.labelStyle,
            fill: '#fef08a',
            fontWeight: 700,
          },
          labelBgStyle: {
            ...edge.labelBgStyle,
            stroke: '#eab308',
            fill: '#422006',
          },
        };
      } else {
        // Subdued edge during simulation
        return {
          ...edge,
          animated: false,
          style: {
            ...edge.style,
            opacity: 0.25,
            strokeWidth: 1,
          },
        };
      }
    }

    // Default/idle edge styles (restores base styling)
    const isEps = typeof edge.label === 'string'
      && edge.label.split(', ').every((symbol: string) => symbol === EPSILON_SYMBOL);
    return {
      ...edge,
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: isEps ? '#60a5fa' : '#94a3b8',
      },
      style: {
        stroke: isEps ? '#60a5fa' : '#64748b',
        strokeWidth: isEps ? 1.75 : 1.5,
        strokeDasharray: isEps ? '4 3' : undefined,
        opacity: 1,
      },
      labelStyle: {
        ...edge.labelStyle,
        fill: isEps ? '#93c5fd' : '#e2e8f0',
        fontWeight: 600,
      },
      labelBgStyle: {
        ...edge.labelBgStyle,
        stroke: isEps ? '#3b82f6' : '#334155',
        fill: '#0f172a',
      },
    };
  });

  return { nodes: updatedNodes, edges: updatedEdges };
}
