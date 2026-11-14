import React, { useRef, useState } from 'react';
import { Play, Sparkles, AlertCircle, HelpCircle, ChevronDown, ChevronUp, History } from 'lucide-react';
import { EPSILON_SYMBOL } from '../engine/constants.js';

interface RegexEditorProps {
  regexInput: string;
  setRegexInput: (val: string) => void;
  onGenerate: (expr: string) => void;
  errorMessage: string | null;
  errorPosition?: number;
  isPreservedGraph: boolean;
  activeRegex: string;
}

const PRESET_EXAMPLES = [
  { label: '(a|b)*abb', desc: 'Ends with abb' },
  { label: 'a|b', desc: 'Simple union' },
  { label: 'ab', desc: 'Concatenation' },
  { label: 'a*', desc: 'Kleene star' },
  { label: '(ab)*', desc: 'Grouped star' },
  { label: 'E', desc: 'Epsilon (E alias)' },
  { label: 'ε', desc: 'Epsilon (Greek)' },
  { label: 'E|a', desc: 'Epsilon union' },
];

export const RegexEditor: React.FC<RegexEditorProps> = ({
  regexInput,
  setRegexInput,
  onGenerate,
  errorMessage,
  errorPosition,
  isPreservedGraph,
  activeRegex,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Inserts ε at current cursor position
  const handleInsertEpsilon = () => {
    const input = inputRef.current;
    if (!input) {
      setRegexInput(regexInput + EPSILON_SYMBOL);
      return;
    }

    const start = input.selectionStart ?? regexInput.length;
    const end = input.selectionEnd ?? regexInput.length;
    const nextVal = regexInput.substring(0, start) + EPSILON_SYMBOL + regexInput.substring(end);
    setRegexInput(nextVal);

    // Restore focus and position cursor after inserted character
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + 1, start + 1);
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(regexInput);
  };

  return (
    <div className="flex flex-col gap-4 p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-lg shadow-slate-950/40">
      <div className="flex items-center justify-between">
        <label htmlFor="regex-input" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Regular Expression
        </label>
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Syntax Guide</span>
          {showHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Main input form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative flex items-center">
          <input
            id="regex-input"
            ref={inputRef}
            type="text"
            value={regexInput}
            onChange={(e) => setRegexInput(e.target.value)}
            placeholder="e.g. (a|b)*abb or E"
            className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all pr-24"
            autoComplete="off"
            spellCheck="false"
          />

          <button
            type="button"
            onClick={handleInsertEpsilon}
            title="Insert Greek epsilon (ε)"
            className="absolute right-1.5 px-2.5 py-1 text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-blue-200 border border-slate-700 hover:border-blue-500/50 rounded-md transition-all shadow-sm"
          >
            Insert ε
          </button>
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg shadow-md shadow-blue-900/30 transition-all active:scale-[0.99] cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Generate Automaton</span>
        </button>
      </form>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg flex items-start gap-2.5 text-xs text-red-200">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-red-300">Compilation Error</span>
            <span className="leading-relaxed">{errorMessage}</span>
            {errorPosition !== undefined && (
              <span className="font-mono text-[11px] text-red-400">Position: index {errorPosition}</span>
            )}
          </div>
        </div>
      )}

      {/* Preserved Graph Notice */}
      {isPreservedGraph && errorMessage && activeRegex && (
        <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-lg flex items-center gap-2 text-xs text-amber-200">
          <History className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Displaying previous valid automaton for <code className="font-mono font-semibold text-amber-300">{activeRegex}</code>.
          </span>
        </div>
      )}

      {/* Preset Quick-Buttons */}
      <div className="flex flex-col gap-1.5 pt-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-blue-400" />
          Academic Examples
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => {
                setRegexInput(ex.label);
                onGenerate(ex.label);
              }}
              title={ex.desc}
              className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
                activeRegex === ex.label
                  ? 'bg-blue-950/80 text-blue-300 border-blue-700'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Collapsible Syntax Help */}
      {showHelp && (
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs flex flex-col gap-2.5 text-slate-300 mt-1">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>Grammar & Operator Precedence</span>
          </div>
          <div className="grid grid-cols-1 gap-2 text-[11px] leading-relaxed">
            <div className="flex justify-between border-b border-slate-850 pb-1.5">
              <span className="font-mono text-blue-300 font-semibold">( )</span>
              <span className="text-slate-400">Grouping (Highest priority)</span>
            </div>
            <div className="flex justify-between border-b border-slate-850 pb-1.5">
              <span className="font-mono text-blue-300 font-semibold">*</span>
              <span className="text-slate-400">Kleene star (0 or more repetitions)</span>
            </div>
            <div className="flex justify-between border-b border-slate-850 pb-1.5">
              <span className="font-mono text-blue-300 font-semibold">ab</span>
              <span className="text-slate-400">Implicit concatenation (a then b)</span>
            </div>
            <div className="flex justify-between border-b border-slate-850 pb-1.5">
              <span className="font-mono text-blue-300 font-semibold">a | b</span>
              <span className="text-slate-400">Union / Alternation (Lowest priority)</span>
            </div>
            <div className="flex justify-between pb-0.5">
              <span className="font-mono text-emerald-400 font-semibold">E or ε</span>
              <span className="text-slate-400">Epsilon (empty string transition)</span>
            </div>
          </div>
          <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400">
            <strong>Note:</strong> Uppercase <code className="text-slate-200">E</code> is strictly reserved as an epsilon alias and cannot be used as an ordinary alphabet symbol.
          </div>
        </div>
      )}
    </div>
  );
};
