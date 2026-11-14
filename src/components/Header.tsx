import React from 'react';
import { GitFork, BookOpen, Layers } from 'lucide-react';

interface HeaderProps {
  stateCount?: number;
  transitionCount?: number;
  alphabetSize?: number;
}

export const Header: React.FC<HeaderProps> = ({
  stateCount,
  transitionCount,
  alphabetSize,
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between shrink-0 z-20">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
          <GitFork className="w-5 h-5 rotate-90" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-slate-100 text-base tracking-tight">
              Thompson Automata Studio
            </h1>
            <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
              v1.0 • ε-NFA
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Regular Expression to ε-NFA Construction & Visualization
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400">
        {stateCount !== undefined && stateCount > 0 && (
          <div className="hidden sm:flex items-center gap-3 font-mono bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-md">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>{stateCount} states</span>
            </span>
            <span className="text-slate-600">•</span>
            <span>{transitionCount} transitions</span>
            <span className="text-slate-600">•</span>
            <span>Σ = {alphabetSize} symbols</span>
          </div>
        )}

        <div className="hidden md:flex items-center gap-1.5 text-slate-400 text-xs bg-slate-800/40 px-2.5 py-1 rounded border border-slate-800">
          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
          <span>CSE Automata Theory</span>
        </div>
      </div>
    </header>
  );
};
