/**
 * customNodes.tsx
 * Custom React Flow node components for NFA states.
 *
 * Implements:
 * - Start state indicator (distinctive entry arrow on the left)
 * - Accepting state indicator (classic concentric double circle)
 * - Start + Accepting combined state
 * - Simulation active highlighting (amber glow)
 * - Subdued style for inactive states during active simulation
 * - Clean connection handles positioned for left-to-right and looping edges
 */

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface StateNodeData extends Record<string, unknown> {
  label: string;
  isStart: boolean;
  isAccepting: boolean;
  isActive?: boolean;
  isSimulationActive?: boolean;
  isEpsilonActive?: boolean;
}

export const StateNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as StateNodeData;
  const { label, isStart, isAccepting, isActive, isSimulationActive, isEpsilonActive } = nodeData;

  // Determine state styles based on simulation status and state type
  let borderColor = 'border-slate-500';
  let bgColor = 'bg-slate-900';
  let textColor = 'text-slate-100';
  let ringStyle = '';
  let opacityStyle = '';

  if (isSimulationActive) {
    if (isActive) {
      borderColor = isEpsilonActive ? 'border-sky-300' : 'border-amber-400';
      bgColor = isEpsilonActive ? 'bg-sky-950/85' : 'bg-amber-950/85';
      textColor = isEpsilonActive ? 'text-sky-100 font-bold' : 'text-amber-100 font-bold';
      ringStyle = isEpsilonActive
        ? 'ring-4 ring-sky-300/90 ring-offset-2 ring-offset-slate-950 shadow-lg shadow-sky-500/30 scale-105'
        : 'ring-4 ring-amber-400/90 ring-offset-2 ring-offset-slate-950 shadow-lg shadow-amber-500/30 scale-105';
    } else {
      // Subdued for inactive states during active simulation
      borderColor = 'border-slate-700';
      bgColor = 'bg-slate-950/80';
      textColor = 'text-slate-400';
      opacityStyle = 'opacity-40 transition-opacity';
    }
  } else {
    // Idle / default styling
    if (isAccepting) {
      borderColor = 'border-blue-400';
      bgColor = 'bg-slate-900';
      textColor = 'text-blue-100';
      ringStyle = 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-950';
    } else if (isStart) {
      borderColor = 'border-emerald-400';
      bgColor = 'bg-slate-900';
      textColor = 'text-emerald-100';
    }
  }

  return (
    <div className={`relative flex items-center justify-center transition-transform ${opacityStyle}`}>
      {/* Start State Indicator Arrow */}
      {isStart && (
        <div
          data-testid="start-indicator"
          className="absolute -left-16 flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-950/90 border border-emerald-500/60 rounded px-1.5 py-0.5 shadow-sm shadow-emerald-950 select-none z-10"
        >
          <span>Start</span>
          <span className="text-emerald-400">➔</span>
        </div>
      )}

      {/* Main State Circle */}
      <div
        data-testid={`state-node-${label}`}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center font-mono font-semibold text-sm transition-all shadow-md shadow-slate-950/60 ${bgColor} ${textColor} border-2 ${borderColor} ${ringStyle}`}
      >
        {/* Concentric inner circle for Accepting state (ensures double-ring is always visible) */}
        {isAccepting && (
          <div
            data-testid={`accepting-inner-ring-${label}`}
            className={`absolute inset-1 rounded-full border-2 pointer-events-none transition-colors ${
              isActive
                ? isEpsilonActive
                  ? 'border-sky-300/80'
                  : 'border-amber-400/80'
                : 'border-blue-400/80'
            }`}
          />
        )}

        <span className="relative z-10">{label}</span>
      </div>

      {/* Connection Handles (Target: Left/Top/Bottom, Source: Right/Top/Bottom) */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!w-2 !h-2 !bg-slate-600 !border-slate-400 opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!w-2 !h-2 !bg-slate-600 !border-slate-400 opacity-0"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!w-2 !h-2 !bg-slate-600 !border-slate-400 opacity-0"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="source-top"
        className="!w-2 !h-2 !bg-slate-600 !border-slate-400 opacity-0"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        className="!w-2 !h-2 !bg-slate-600 !border-slate-400 opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!w-2 !h-2 !bg-slate-600 !border-slate-400 opacity-0"
      />
    </div>
  );
});

StateNode.displayName = 'StateNode';

export const nodeTypes = {
  stateNode: StateNode,
};
