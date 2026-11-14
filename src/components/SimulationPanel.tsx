import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { SimulationResult, NFA } from '../engine/types.js';

interface SimulationPanelProps {
  nfa: NFA | null;
  activeRegex: string;
  inputString: string;
  setInputString: (val: string) => void;
  onSimulate: (input: string) => void;
  simulationResult: SimulationResult | null;
  currentStepIndex: number;
  setCurrentStepIndex: (index: number) => void;
  onResetTrace: () => void;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  nfa,
  activeRegex,
  inputString,
  setInputString,
  onSimulate,
  simulationResult,
  currentStepIndex,
  setCurrentStepIndex,
  onResetTrace,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nfa) return;
    onSimulate(inputString);
  };

  const steps = simulationResult?.steps ?? [];
  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const isFirstStep = currentStepIndex <= 0;
  const isLastStep = currentStepIndex >= totalSteps - 1;

  // Format state ID array nicely: {q0, q1, q2}
  const formatStates = (ids: number[]) => {
    if (!ids || ids.length === 0) return '∅ (Dead / Empty Set)';
    return `{ ${ids.map((id) => `q${id}`).join(', ')} }`;
  };
  const acceptingStates = simulationResult?.finalActiveStates.filter((id) => nfa?.acceptingStates.includes(id)) ?? [];
  const consumedCharacters = simulationResult?.consumedCharacters ?? Math.max(0, steps.filter((step) => step.symbol !== null && step.activeStatesAfter.length > 0).length);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(() => new Set([0]));

  const selectStep = (index: number) => {
    setCurrentStepIndex(index);
    setExpandedSteps((expanded) => new Set(expanded).add(index));
  };

  const toggleStep = (index: number) => {
    setExpandedSteps((expanded) => {
      const next = new Set(expanded);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const formatTransitions = (step: typeof steps[number]) => {
    const transitions = step.symbolTransitions ?? [];
    if (transitions.length === 0) return 'none';
    return transitions.map(({ from, to, symbol }) => `q${from} -${symbol}-> q${to}`).join(', ');
  };
  const currentInputPosition = currentStep?.inputPosition ?? null;
  const consumedBeforeStep = currentInputPosition === null
    ? 0
    : currentStep?.activeStatesAfter.length === 0
      ? currentInputPosition
      : currentInputPosition + 1;
  const consumedPrefix = simulationResult?.input.slice(0, consumedBeforeStep) ?? '';
  const remainingInput = simulationResult?.input.slice(consumedBeforeStep) ?? '';
  const previousStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : undefined;
  const sharedStatesWithPrevious = previousStep && currentStep
    ? currentStep.activeStatesAfter.filter((id) => previousStep.activeStatesAfter.includes(id)).length
    : 0;

  return (
    <div className="flex flex-col gap-4 p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-lg shadow-slate-950/40">
      <div className="flex items-center justify-between">
        <label htmlFor="sim-input" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          String Simulation
        </label>
        {nfa && (
          <span className="text-[11px] font-mono text-slate-400">
            Automaton: {nfa.states.length} states
          </span>
        )}
      </div>

      {/* Input String Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative flex items-center">
          <input
            id="sim-input"
            type="text"
            value={inputString}
            onChange={(e) => setInputString(e.target.value)}
            disabled={!nfa}
            placeholder='Enter string to test (or leave empty for ε)'
            className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all pr-24"
            autoComplete="off"
            spellCheck="false"
          />

          <button
            type="button"
            onClick={() => {
              setInputString('');
              if (nfa) onSimulate('');
            }}
            disabled={!nfa}
            title="Test empty string input ε"
            className="absolute right-1.5 px-2 py-1 text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 disabled:opacity-50 border border-slate-700 rounded-md transition-all"
          >
            ε (empty)
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!nfa}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-medium text-sm rounded-lg shadow-md shadow-emerald-950/30 transition-all active:scale-[0.99] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Simulate String</span>
          </button>

          {simulationResult && (
            <button
              type="button"
              onClick={onResetTrace}
              title="Reset to step 0"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Simulation Result Banner */}
      {simulationResult && (
        <div
          data-testid="simulation-result-banner"
          className={`p-3.5 rounded-lg border flex flex-col gap-2 transition-all ${
            simulationResult.accepted
              ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800/80 text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {simulationResult.accepted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span className="font-semibold text-sm tracking-wide">
                {simulationResult.accepted ? 'STRING ACCEPTED' : 'STRING REJECTED'}
              </span>
            </div>
            <span className="font-mono text-xs opacity-80">
              |w| = {simulationResult.input.length} chars
            </span>
          </div>

          <p className="text-xs leading-relaxed opacity-90">
            {simulationResult.accepted
              ? `The input string "${simulationResult.input}" was completely consumed and the active states contain accepting state(s) ${formatStates(
                  simulationResult.finalActiveStates.filter((id) => nfa?.acceptingStates.includes(id))
                )}.`
              : simulationResult.rejectionReason ||
                `The input string "${simulationResult.input}" was rejected by the automaton.`}
          </p>
        </div>
      )}

      {simulationResult && (
        <section className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950 p-3.5 text-xs">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Sparkles className="h-4 w-4 text-amber-300" />
            Execution Summary
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <span className="text-slate-500">Expression</span><span className="font-mono text-slate-200">{activeRegex || '—'}</span>
            <span className="text-slate-500">Input</span><span className="font-mono text-slate-200">{simulationResult.input || 'ε'}</span>
            <span className="text-slate-500">Characters consumed</span><span className="font-mono text-slate-200">{consumedCharacters} / {simulationResult.input.length}</span>
            <span className="text-slate-500">Initial ε-closure</span><span className="font-mono text-sky-300">{formatStates(steps[0]?.activeStatesAfter ?? [])}</span>
            <span className="text-slate-500">Final active set</span><span className="font-mono text-amber-300">{formatStates(simulationResult.finalActiveStates)}</span>
            <span className="text-slate-500">Accepting states</span><span className="font-mono text-blue-300">{formatStates(nfa?.acceptingStates ?? [])}</span>
          </div>
          <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border px-2.5 py-2 text-[11px] ${simulationResult.accepted ? 'border-emerald-800 bg-emerald-950/30 text-emerald-200' : 'border-rose-900 bg-rose-950/30 text-rose-200'}`}>
            <span className="font-bold tracking-wide">{simulationResult.accepted ? 'ACCEPTED' : 'REJECTED'}</span>
            <span className="font-mono">Consumed: {consumedCharacters}/{simulationResult.input.length}</span>
            <span className="font-mono">Accepting: {formatStates(acceptingStates)}</span>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-800">
            <table className="w-full min-w-[760px] border-collapse text-left text-[11px]">
              <thead className="bg-slate-900 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2.5 py-2 font-semibold">Step</th>
                  <th className="px-2.5 py-2 font-semibold">Input</th>
                  <th className="px-2.5 py-2 font-semibold">Active before</th>
                  <th className="px-2.5 py-2 font-semibold">Matching transitions</th>
                  <th className="px-2.5 py-2 font-semibold">ε-closure</th>
                  <th className="px-2.5 py-2 font-semibold">Active after</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, index) => {
                  const isInitial = step.symbol === null;
                  const isSelected = index === currentStepIndex;
                  const isExpanded = expandedSteps.has(index);
                  return (
                    <React.Fragment key={step.stepIndex}>
                      <tr
                        tabIndex={0}
                        aria-selected={isSelected}
                        onClick={() => selectStep(index)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            selectStep(index);
                          }
                        }}
                        className={`cursor-pointer border-t border-slate-800 align-top transition-colors ${
                          isSelected
                            ? 'bg-blue-950/60 ring-1 ring-inset ring-blue-500/70'
                            : isInitial
                              ? 'bg-sky-950/20 hover:bg-sky-950/40'
                              : 'bg-slate-950 hover:bg-slate-900'
                        }`}
                      >
                        <td className="px-2.5 py-2 font-mono font-semibold text-slate-200">
                          <button
                            type="button"
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} step ${index}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleStep(index);
                            }}
                            className="mr-1 text-slate-400 hover:text-slate-100"
                          >
                            {isExpanded ? '▾' : '▸'}
                          </button>
                          {index}
                        </td>
                        <td className={`px-2.5 py-2 font-mono font-semibold ${isInitial ? 'text-sky-300' : 'text-amber-300'}`}>
                          {isInitial ? 'ε-start' : `'${step.symbol}'`}
                        </td>
                        <td className="max-w-[180px] truncate px-2.5 py-2 font-mono text-slate-300">{formatStates(step.activeStatesBefore)}</td>
                        <td className="max-w-[220px] truncate px-2.5 py-2 font-mono text-amber-200">{isInitial ? 'Initial expansion' : formatTransitions(step)}</td>
                        <td className="max-w-[180px] truncate px-2.5 py-2 font-mono text-sky-300">{formatStates(step.epsilonClosure)}</td>
                        <td className="max-w-[180px] truncate px-2.5 py-2 font-mono font-semibold text-amber-300">{formatStates(step.activeStatesAfter)}</td>
                      </tr>
                      {isExpanded && (
                        <tr className={`${isSelected ? 'bg-blue-950/30' : 'bg-slate-900/40'}`}>
                          <td colSpan={6} className="px-3 py-2">
                            <div className="grid gap-1 text-[11px] text-slate-400 sm:grid-cols-2">
                              <span><strong className="text-slate-300">Position:</strong> {isInitial ? 'Before input' : step.inputPosition}</span>
                              <span><strong className="text-slate-300">ε-transitions:</strong> <span className="font-mono text-sky-300">{(step.epsilonTransitions ?? []).map(({ from, to }) => `q${from} -ε-> q${to}`).join(', ') || 'none'}</span></span>
                              <span className="sm:col-span-2"><strong className="text-slate-300">Explanation:</strong> {step.description}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Trace Stepper & Step Inspector */}
      {simulationResult && totalSteps > 0 && currentStep && (
        <div className="flex flex-col gap-3 p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
          {/* Navigation Controls */}
          <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <span>Trace Step:</span>
              <span className="font-mono text-blue-400">
                {currentStepIndex} of {totalSteps - 1}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                disabled={isFirstStep}
                title="Previous Step"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 border border-slate-700 rounded transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentStepIndex(Math.min(totalSteps - 1, currentStepIndex + 1))}
                disabled={isLastStep}
                title="Next Step"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 border border-slate-700 rounded transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Current Step Explanation Card */}
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-medium text-slate-300">
                {currentStep.symbol === null ? 'Initial ε-Closure' : `Read Symbol: '${currentStep.symbol}'`}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {currentStepIndex === 0
                  ? 'Start state expansion'
                  : `Symbol position: ${currentStepIndex - 1}`}
              </span>
            </div>

            <div className="p-2.5 bg-slate-900 border border-slate-800/80 rounded-md flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] text-slate-400">Active Before:</span>
                <span className="font-mono text-[11px] text-slate-200 text-right">
                  {formatStates(currentStep.activeStatesBefore)}
                </span>
              </div>

              {currentStep.symbol !== null && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">Consumed:</span>
                  <span className="font-mono text-[11px] font-bold text-amber-300">
                    '{currentStep.symbol}'
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] text-slate-400">ε-Closure:</span>
                <span className="font-mono text-[11px] text-sky-300 text-right">{formatStates(currentStep.epsilonClosure)}</span>
              </div>
              {currentStep.symbol !== null && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] text-slate-400">Transitions:</span>
                  <span className="font-mono text-[11px] text-amber-200 text-right">
                    {(currentStep.symbolTransitions ?? []).map((transition) => `q${transition.from} -${transition.symbol}-> q${transition.to}`).join(', ') || 'none'}
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between gap-2 border-t border-slate-800 pt-1.5">
                <span className="text-[11px] font-medium text-blue-300 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" /> Active After:
                </span>
                <span className="font-mono text-[11px] font-bold text-amber-400 text-right">
                  {formatStates(currentStep.activeStatesAfter)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic leading-relaxed">
              {currentStep.description}
            </p>

            <div className="rounded-md border border-blue-900/70 bg-blue-950/25 p-3 text-[11px] leading-relaxed text-slate-300">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="font-semibold text-blue-200">What&apos;s happening?</span>
                <span className="font-mono text-[10px] text-slate-400">
                  {consumedBeforeStep}/{simulationResult.input.length} consumed
                </span>
              </div>
              {currentStep.symbol === null ? (
                <p>
                  Before reading input, the NFA starts at {formatStates(currentStep.activeStatesBefore)}.
                  We follow every reachable ε-transition without consuming a character, so the active set becomes {formatStates(currentStep.activeStatesAfter)}.
                </p>
              ) : (
                <div className="space-y-1">
                  <p>
                    We are processing <span className="font-mono font-semibold text-amber-300">&apos;{currentStep.symbol}&apos;</span> at input position {currentStep.inputPosition}.
                    The NFA checks each state in {formatStates(currentStep.activeStatesBefore)} for a matching symbol transition.
                  </p>
                  <p>
                    It follows {formatTransitions(currentStep)}. Then ε-closure is calculated because ε-transitions can reach more states without consuming another input character.
                    The resulting active set is {formatStates(currentStep.activeStatesAfter)}.
                  </p>
                  <p className="text-slate-400">
                    Multiple states may be active at once: an NFA explores all valid paths simultaneously rather than choosing only one.
                  </p>
                </div>
              )}
              {sharedStatesWithPrevious > 0 && currentStep.symbol !== null && (
                <p className="mt-2 border-t border-blue-900/60 pt-2 text-slate-400">
                  Some highlighted states overlap with the previous step. This is expected when the NFA has looping paths, especially those introduced by Kleene star: execution can return to states it has visited while still trying other paths.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2.5 text-[11px]">
            <div className="mb-1 flex items-center justify-between font-semibold text-slate-300">
              <span>Execution progress</span>
              <span className="font-mono text-slate-400">{consumedBeforeStep} / {simulationResult.input.length}</span>
            </div>
            <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${simulationResult.input.length === 0 ? 100 : (consumedBeforeStep / simulationResult.input.length) * 100}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono">
              <span className="text-emerald-300">Read: {consumedPrefix || 'ε'}</span>
              <span className="text-slate-500">Remaining: {remainingInput || 'ε'}</span>
            </div>
          </div>

          {currentStepIndex === totalSteps - 1 && (
            <div className={`rounded-md border p-2.5 text-[11px] leading-relaxed ${
              simulationResult.accepted
                ? 'border-emerald-800/80 bg-emerald-950/30 text-emerald-200'
                : 'border-rose-900/80 bg-rose-950/30 text-rose-200'
            }`}>
              <span className="font-semibold">Final decision: </span>
              {simulationResult.accepted
                ? `the complete input is consumed and the final active set ${formatStates(simulationResult.finalActiveStates)} contains accepting state(s) ${formatStates(acceptingStates)}.`
                : `the final active set ${formatStates(simulationResult.finalActiveStates)} contains no accepting state after processing the available input, so the string is rejected.`}
            </div>
          )}

          {/* Step Timeline Strip */}
          <div className="flex items-center gap-1 overflow-x-auto pt-1 pb-1">
            {steps.map((s, idx) => (
              <button
                key={s.stepIndex}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`px-2 py-1 text-[10px] font-mono rounded shrink-0 border transition-all ${
                  idx === currentStepIndex
                    ? 'bg-blue-600 text-white border-blue-400 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {idx === 0 ? 'Start' : `'${s.symbol}'`}
              </button>
            ))}
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2.5 text-[11px] leading-relaxed text-slate-400">
            <div className="mb-1 font-semibold text-slate-200">How to read the automaton graph</div>
            <ul className="space-y-1">
              <li><span className="font-semibold text-amber-300">Yellow</span> marks states and transitions active for this trace step, including symbol moves.</li>
              <li><span className="font-semibold text-cyan-300">Cyan</span> marks states reached through ε-closure; these moves do not consume input.</li>
              <li><span className="font-semibold text-blue-300">Double-circle states</span> are accepting states. The NFA accepts only when one is active after the complete input is consumed.</li>
            </ul>
            <p className="mt-2 border-t border-slate-800 pt-2">
              The graph itself is one unchanged NFA throughout this execution. Only its active states and traversed transitions change as you move through the trace.
            </p>
          </div>
        </div>
      )}

      {/* Empty State before simulation */}
      {!simulationResult && nfa && (
        <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-lg text-xs text-slate-400 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Enter any input string (including empty for ε) and click <strong>Simulate</strong> to test acceptance.
          </span>
        </div>
      )}
    </div>
  );
};
