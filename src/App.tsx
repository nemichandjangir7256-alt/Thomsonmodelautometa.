import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header.js';
import { RegexEditor } from './components/RegexEditor.js';
import { SimulationPanel } from './components/SimulationPanel.js';
import { BatchTester } from './components/BatchTester.js';
import { GraphWorkspace } from './components/GraphWorkspace.js';
import {
  compileRegex,
  simulate,
  isTokenizeError,
  isParseError,
  type NFA,
  type SimulationResult,
  type BatchTestCase,
  type BatchTestResult,
  type BatchMetrics,
} from './engine/index.js';
import {
  nfaToFlow,
  findActiveEdgesForStep,
  updateFlowGraphHighlight,
  type FlowGraph,
} from './graph/index.js';
import { Activity, Layers } from 'lucide-react';

export const App: React.FC = () => {
  const [regexInput, setRegexInput] = useState('(a|b)*abb');
  const [activeRegex, setActiveRegex] = useState('');
  const [nfa, setNfa] = useState<NFA | null>(null);
  const [baseGraph, setBaseGraph] = useState<FlowGraph>({ nodes: [], edges: [] });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorPosition, setErrorPosition] = useState<number | undefined>(undefined);
  const [isPreservedGraph, setIsPreservedGraph] = useState(false);
  const [layoutResetKey, setLayoutResetKey] = useState(0);

  // Active testing tab in sidebar: 'single' | 'batch'
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');

  // Single simulation state
  const [inputString, setInputString] = useState('abb');
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Batch testing state
  const [testCases, setTestCases] = useState<BatchTestCase[]>([
    { id: '1', input: 'abb', expectedResult: 'accept' },
    { id: '2', input: 'aabb', expectedResult: 'accept' },
    { id: '3', input: 'babb', expectedResult: 'accept' },
    { id: '4', input: 'ab', expectedResult: 'reject' },
    { id: '5', input: '', expectedResult: 'reject' },
  ]);
  const [batchResults, setBatchResults] = useState<BatchTestResult[] | null>(null);
  const [batchMetrics, setBatchMetrics] = useState<BatchMetrics | null>(null);

  // Compile expression and update graph
  const handleGenerate = useCallback((expression: string) => {
    const result = compileRegex(expression);

    if (isTokenizeError(result) || isParseError(result)) {
      setErrorMessage(result.message);
      setErrorPosition(result.position);
      // Invalidate simulation and batch results if new expression is invalid
      setSimulationResult(null);
      setBatchResults(null);
      setBatchMetrics(null);
      if (nfa !== null) {
        setIsPreservedGraph(true);
      }
      return;
    }

    // Success: convert live NFA to React Flow format
    const flowGraph = nfaToFlow(result);
    setNfa(result);
    setBaseGraph(flowGraph);
    setLayoutResetKey((key) => key + 1);
    setActiveRegex(expression);
    setErrorMessage(null);
    setErrorPosition(undefined);
    setIsPreservedGraph(false);

    // Invalidate stale simulation and batch results from previous automaton
    setSimulationResult(null);
    setCurrentStepIndex(0);
    setBatchResults(null);
    setBatchMetrics(null);
  }, [nfa]);

  // Run simulation on current NFA
  const handleSimulate = useCallback(
    (inputToTest: string) => {
      if (!nfa) return;
      const result = simulate(inputToTest, nfa);
      setSimulationResult(result);
      setCurrentStepIndex(0);
    },
    [nfa]
  );

  // Inspect a specific test string from batch tester in the single tracer
  const handleInspectBatchString = useCallback(
    (str: string) => {
      setInputString(str);
      handleSimulate(str);
      setActiveTab('single');
    },
    [handleSimulate]
  );

  // Reset trace to step 0
  const handleResetTrace = useCallback(() => {
    setCurrentStepIndex(0);
  }, []);

  const handleResetLayout = useCallback(() => {
    if (!nfa) return;
    setBaseGraph(nfaToFlow(nfa));
    setLayoutResetKey((key) => key + 1);
  }, [nfa]);

  // Compute display graph with active states/edges highlighted for the current step
  const displayGraph = useMemo(() => {
    if (!nfa || baseGraph.nodes.length === 0) {
      return baseGraph;
    }

    // Only highlight if the single trace tab is active and we have an active simulation
    if (activeTab !== 'single' || !simulationResult || simulationResult.steps.length === 0) {
      return updateFlowGraphHighlight(baseGraph, new Set(), false);
    }

    const currentStep = simulationResult.steps[currentStepIndex];
    if (!currentStep) {
      return updateFlowGraphHighlight(baseGraph, new Set(), false);
    }

    const activeStateIds = new Set<number>(currentStep.activeStatesAfter);
    const epsilonStateIds = new Set<number>(currentStep.epsilonClosureStates ?? []);
    const activeEdgeKeys = findActiveEdgesForStep(nfa, currentStep);

    return updateFlowGraphHighlight(baseGraph, activeStateIds, true, activeEdgeKeys, epsilonStateIds);
  }, [nfa, baseGraph, activeTab, simulationResult, currentStepIndex]);

  // Initial load: compile default example and run initial simulation
  useEffect(() => {
    const initialNFA = compileRegex('(a|b)*abb');
    if (!isTokenizeError(initialNFA) && !isParseError(initialNFA)) {
      const flowGraph = nfaToFlow(initialNFA);
      setNfa(initialNFA);
      setBaseGraph(flowGraph);
      setLayoutResetKey((key) => key + 1);
      setActiveRegex('(a|b)*abb');
      const initialSim = simulate('abb', initialNFA);
      setSimulationResult(initialSim);
      setCurrentStepIndex(0);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      <Header
        stateCount={nfa?.states.length}
        transitionCount={nfa?.transitions.length}
        alphabetSize={nfa ? nfa.alphabet.size : 0}
      />

      <main className="flex-1 flex flex-col lg:flex-row p-3 sm:p-4 gap-4 overflow-y-auto lg:overflow-hidden">
        {/* Left Sidebar Panel: Regex Editor & Testing Controls */}
        <aside className="w-full lg:w-[450px] shrink-0 flex flex-col gap-4 lg:overflow-y-auto pr-0 lg:pr-1">
          {/* Regex Constructor */}
          <RegexEditor
            regexInput={regexInput}
            setRegexInput={setRegexInput}
            onGenerate={handleGenerate}
            errorMessage={errorMessage}
            errorPosition={errorPosition}
            isPreservedGraph={isPreservedGraph}
            activeRegex={activeRegex}
          />

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'single'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Step Tracer</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'batch'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Batch Suite</span>
            </button>
          </div>

          {/* Active Panel View */}
          {activeTab === 'single' ? (
            <SimulationPanel
              nfa={nfa}
              activeRegex={activeRegex}
              inputString={inputString}
              setInputString={setInputString}
              onSimulate={handleSimulate}
              simulationResult={simulationResult}
              currentStepIndex={currentStepIndex}
              setCurrentStepIndex={setCurrentStepIndex}
              onResetTrace={handleResetTrace}
            />
          ) : (
            <BatchTester
              nfa={nfa}
              activeRegex={activeRegex}
              onInspectString={handleInspectBatchString}
              testCases={testCases}
              setTestCases={setTestCases}
              batchResults={batchResults}
              setBatchResults={setBatchResults}
              batchMetrics={batchMetrics}
              setBatchMetrics={setBatchMetrics}
            />
          )}
        </aside>

        {/* Right Main Panel: Automaton Graph Canvas */}
        <section className="flex-1 flex flex-col h-full min-h-[420px] lg:min-h-0 overflow-hidden">
          <GraphWorkspace
            nodes={displayGraph.nodes}
            edges={displayGraph.edges}
            nfa={nfa}
            activeRegex={activeRegex}
            layoutResetKey={layoutResetKey}
            onResetLayout={handleResetLayout}
          />
        </section>
      </main>
    </div>
  );
};

export default App;
