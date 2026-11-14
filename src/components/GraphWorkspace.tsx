import React, { useEffect, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  Panel,
  type Edge,
  type Node,
} from '@xyflow/react';
import { nodeTypes, type StateNodeData } from '../graph/customNodes.js';
import type { NFA } from '../engine/types.js';
import { Network, Table2, RotateCcw } from 'lucide-react';

interface GraphWorkspaceProps {
  nodes: Node<StateNodeData>[];
  edges: Edge[];
  nfa: NFA | null;
  activeRegex: string;
  layoutResetKey?: number;
  onResetLayout?: () => void;
}

// Inner component to access React Flow instance hooks
const GraphFlowInner: React.FC<{
  nodes: Node<StateNodeData>[];
  edges: Edge[];
  layoutResetKey: number;
}> = ({ nodes, edges, layoutResetKey }) => {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 400 });
      }, 50);
      return () => clearTimeout(timer);
    }
  // The key changes only when a new graph is generated or the user requests
  // a reset, so simulation highlighting cannot disturb the viewport.
  }, [fitView, layoutResetKey]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.2}
      maxZoom={2.5}
      defaultEdgeOptions={{ type: 'smoothstep' }}
      className="bg-slate-950"
    >
      <Background color="#1e293b" gap={20} size={1} />
      <Controls showInteractive={false} position="bottom-right" className="!m-4" />
      <MiniMap
        nodeColor={(node) => {
          const data = node.data as unknown as StateNodeData;
          if (data?.isAccepting) return '#3b82f6';
          if (data?.isStart) return '#10b981';
          return '#64748b';
        }}
        maskColor="rgba(11, 15, 25, 0.75)"
        className="!bg-slate-900/90 !border !border-slate-800 !rounded-lg !overflow-hidden !m-4 !hidden md:!block"
        zoomable
        pannable
      />
      <Panel position="top-right" className="!m-4 !rounded-lg !border !border-slate-700 !bg-slate-900/90 !p-2 !text-[10px] !text-slate-300">
        <div className="mb-1 font-semibold uppercase tracking-wide text-slate-400">Legend</div>
        <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Active symbol path</div>
        <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-300" /> ε-closure state/path</div>
        <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-blue-400" /> Accepting state</div>
      </Panel>
    </ReactFlow>
  );
};

export const GraphWorkspace: React.FC<GraphWorkspaceProps> = ({
  nodes,
  edges,
  nfa,
  activeRegex,
  layoutResetKey = 0,
  onResetLayout,
}) => {
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden rounded-xl border border-slate-800 shadow-xl shadow-slate-950/60">
      {/* Workspace Header Toolbar */}
      <div className="h-12 border-b border-slate-800/80 bg-slate-900/80 px-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-slate-200">
            Automaton Graph Canvas
          </span>
          {activeRegex && (
            <span className="text-xs text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
              L({activeRegex})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResetLayout}
            disabled={!nfa || !onResetLayout}
            title="Recalculate graph layout"
            className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset layout
          </button>
          {/* View switcher keeps the graph and formal transition table equally accessible. */}
          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              aria-pressed={viewMode === 'graph'}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                viewMode === 'graph'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="h-3.5 w-3.5" /> Graph
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              disabled={!nfa}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table2 className="h-3.5 w-3.5" /> Transitions
            </button>
          </div>
        </div>
      </div>

      {/* Main Visualization Area */}
      <div className="flex-1 relative w-full h-full min-h-0 overflow-hidden">
        {viewMode === 'table' && nfa ? (
          <div className="h-full overflow-auto bg-slate-950 p-4 sm:p-6">
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">States</div>
                  <div className="mt-1 font-mono text-lg font-semibold text-slate-100">{nfa.states.length}</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Transitions</div>
                  <div className="mt-1 font-mono text-lg font-semibold text-slate-100">{nfa.transitions.length}</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Start state</div>
                  <div className="mt-1 font-mono text-lg font-semibold text-emerald-400">q{nfa.startState}</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Accept state</div>
                  <div className="mt-1 font-mono text-lg font-semibold text-blue-400">{nfa.acceptingStates.map((id) => `q${id}`).join(', ')}</div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                <div className="border-b border-slate-800 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-100">NFA transition function</h3>
                  <p className="mt-1 text-xs text-slate-400">Each row represents one transition δ(state, symbol) = next state.</p>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">From state</th>
                      <th className="px-4 py-3 font-semibold">Input symbol</th>
                      <th className="px-4 py-3 font-semibold">To state</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nfa.transitions.map((transition, index) => (
                      <tr key={`${transition.from}-${transition.symbol}-${transition.to}-${index}`} className="border-t border-slate-800/80 hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-mono text-slate-200">q{transition.from}</td>
                        <td className={`px-4 py-3 font-mono font-semibold ${transition.symbol === 'ε' ? 'text-blue-300' : 'text-emerald-300'}`}>{transition.symbol}</td>
                        <td className="px-4 py-3 font-mono text-slate-200">q{transition.to}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-400">
                <span className="font-semibold text-slate-200">Alphabet Σ:</span> {'{'}{Array.from(nfa.alphabet).sort().join(', ') || '∅'}{'}'}
                <span className="mx-2 text-slate-600">•</span>
                <span className="font-semibold text-slate-200">Accepting set F:</span> {'{'}{nfa.acceptingStates.map((id) => `q${id}`).join(', ')}{'}'}
              </div>
            </div>
          </div>
        ) : nodes.length > 0 ? (
          <ReactFlowProvider>
            <GraphFlowInner nodes={nodes} edges={edges} layoutResetKey={layoutResetKey} />
          </ReactFlowProvider>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-800/40 bg-blue-950/40 text-blue-400 shadow-lg shadow-blue-950/30">
              <Network className="h-8 w-8" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-slate-200">No Automaton Generated Yet</h3>
            <p className="mb-6 max-w-md text-xs leading-relaxed text-slate-400">
              Enter a regular expression in the editor and click <strong className="text-slate-200">Generate Automaton</strong> to construct and visualize its equivalent Thompson ε-NFA.
            </p>
            <div className="grid w-full max-w-md grid-cols-1 gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-left text-xs text-slate-400 sm:grid-cols-2">
              <div><span className="mb-1 block font-semibold text-slate-300">1. Canonical Construction</span><span>Uses Thompson's algorithm to produce single-entry, single-exit NFA fragments.</span></div>
              <div><span className="mb-1 block font-semibold text-slate-300">2. Interactive Canvas</span><span>Drag nodes to rearrange, zoom and pan around complex graphs.</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Summary Bar if NFA exists */}
      {nfa && (
        <div className="h-8 border-t border-slate-800/80 bg-slate-900/90 px-4 flex items-center justify-between text-[11px] text-slate-400 font-mono z-10 shrink-0">
          <div className="flex items-center gap-3">
            <span>
              Start: <span className="text-emerald-400">q{nfa.startState}</span>
            </span>
            <span>•</span>
            <span>
              Accepting:{' '}
              <span className="text-blue-400">
                {nfa.acceptingStates.map((s) => `q${s}`).join(', ')}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>Alphabet: {`{${Array.from(nfa.alphabet).sort().join(', ') || '∅'}}`}</span>
          </div>
        </div>
      )}
    </div>
  );
};
