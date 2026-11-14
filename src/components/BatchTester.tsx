import React, { useState } from 'react';
import {
  Play,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  FileText,
  BarChart3,
} from 'lucide-react';
import type { NFA, BatchTestCase, BatchTestResult, BatchMetrics } from '../engine/index.js';
import { runBatchTests } from '../engine/index.js';

interface BatchTesterProps {
  nfa: NFA | null;
  activeRegex: string;
  onInspectString?: (input: string) => void;
  testCases: BatchTestCase[];
  setTestCases: React.Dispatch<React.SetStateAction<BatchTestCase[]>>;
  batchResults: BatchTestResult[] | null;
  setBatchResults: React.Dispatch<React.SetStateAction<BatchTestResult[] | null>>;
  batchMetrics: BatchMetrics | null;
  setBatchMetrics: React.Dispatch<React.SetStateAction<BatchMetrics | null>>;
}

export const BatchTester: React.FC<BatchTesterProps> = ({
  nfa,
  activeRegex,
  onInspectString,
  testCases,
  setTestCases,
  batchResults,
  setBatchResults,
  batchMetrics,
  setBatchMetrics,
}) => {
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Run all batch test cases
  const handleRunBatch = () => {
    if (!nfa) return;
    const { results, metrics } = runBatchTests(testCases, nfa);
    setBatchResults(results);
    setBatchMetrics(metrics);
  };

  // Add a new row
  const handleAddRow = () => {
    const nextId = String(Date.now() + Math.random());
    setTestCases((prev) => [
      ...prev,
      { id: nextId, input: '', expectedResult: 'unspecified' },
    ]);
  };

  // Update a row
  const handleUpdateRow = (
    index: number,
    field: 'input' | 'expectedResult',
    value: string
  ) => {
    setTestCases((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return copy;
    });
    // Invalidate stale results when input changes
    setBatchResults(null);
    setBatchMetrics(null);
  };

  // Remove a row
  const handleRemoveRow = (index: number) => {
    setTestCases((prev) => prev.filter((_, i) => i !== index));
    setBatchResults(null);
    setBatchMetrics(null);
  };

  // Clear all rows
  const handleClearAll = () => {
    setTestCases([]);
    setBatchResults(null);
    setBatchMetrics(null);
  };

  // Bulk import from multiline text
  const handleApplyBulk = () => {
    const lines = bulkText.split('\n');
    const newCases: BatchTestCase[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) return;
      const parts = trimmed.split(',');
      const input = parts[0] ?? '';
      let expectedResult: 'accept' | 'reject' | 'unspecified' = 'unspecified';
      if (parts[1]) {
        const exp = parts[1].trim().toLowerCase();
        if (exp === 'accept' || exp === 'true' || exp === '1') expectedResult = 'accept';
        if (exp === 'reject' || exp === 'false' || exp === '0') expectedResult = 'reject';
      }
      newCases.push({
        id: String(Date.now() + idx),
        input,
        expectedResult,
      });
    });

    setTestCases(newCases);
    setShowBulkInput(false);
    setBulkText('');
    setBatchResults(null);
    setBatchMetrics(null);
  };

  // Generate standard academic test suite for common regexes
  const handleLoadPresets = () => {
    let presets: BatchTestCase[] = [];
    if (activeRegex === '(a|b)*abb') {
      presets = [
        { id: '1', input: 'abb', expectedResult: 'accept' },
        { id: '2', input: 'aabb', expectedResult: 'accept' },
        { id: '3', input: 'babb', expectedResult: 'accept' },
        { id: '4', input: 'aababb', expectedResult: 'accept' },
        { id: '5', input: '', expectedResult: 'reject' },
        { id: '6', input: 'ab', expectedResult: 'reject' },
        { id: '7', input: 'ababa', expectedResult: 'reject' },
      ];
    } else if (activeRegex === 'a*') {
      presets = [
        { id: '1', input: '', expectedResult: 'accept' },
        { id: '2', input: 'a', expectedResult: 'accept' },
        { id: '3', input: 'aaa', expectedResult: 'accept' },
        { id: '4', input: 'b', expectedResult: 'reject' },
        { id: '5', input: 'ab', expectedResult: 'reject' },
      ];
    } else if (activeRegex === 'ab') {
      presets = [
        { id: '1', input: 'ab', expectedResult: 'accept' },
        { id: '2', input: '', expectedResult: 'reject' },
        { id: '3', input: 'a', expectedResult: 'reject' },
        { id: '4', input: 'b', expectedResult: 'reject' },
        { id: '5', input: 'aba', expectedResult: 'reject' },
      ];
    } else if (activeRegex === 'a|b') {
      presets = [
        { id: '1', input: 'a', expectedResult: 'accept' },
        { id: '2', input: 'b', expectedResult: 'accept' },
        { id: '3', input: '', expectedResult: 'reject' },
        { id: '4', input: 'ab', expectedResult: 'reject' },
      ];
    } else if (activeRegex === 'E' || activeRegex === 'ε') {
      presets = [
        { id: '1', input: '', expectedResult: 'accept' },
        { id: '2', input: 'a', expectedResult: 'reject' },
      ];
    } else {
      presets = [
        { id: '1', input: '', expectedResult: 'unspecified' },
        { id: '2', input: 'a', expectedResult: 'unspecified' },
        { id: '3', input: 'b', expectedResult: 'unspecified' },
        { id: '4', input: 'ab', expectedResult: 'unspecified' },
      ];
    }

    setTestCases(presets);
    setBatchResults(null);
    setBatchMetrics(null);
  };

  return (
    <div className="flex flex-col gap-4 p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-lg shadow-slate-950/40">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Batch Test Suite
          </label>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {testCases.length} test{testCases.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleLoadPresets}
            title="Load recommended test suite for current expression"
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 bg-slate-950 border border-slate-800 px-2 py-1 rounded transition-colors"
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>Preset Suite</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBulkInput(!showBulkInput)}
            title="Paste multiple lines at once"
            className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-slate-950 border border-slate-800 px-2 py-1 rounded transition-colors"
          >
            <FileText className="w-3 h-3 text-slate-400" />
            <span>Bulk Import</span>
          </button>
        </div>
      </div>

      {/* Bulk Import Drawer */}
      {showBulkInput && (
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex flex-col gap-2 text-xs">
          <span className="font-semibold text-slate-200">
            Paste inputs (one per line, optional format: <code className="text-blue-300">string,accept</code>)
          </span>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={4}
            placeholder={"abb,accept\naabb,accept\nab,reject\n,reject"}
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 font-mono text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-blue-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowBulkInput(false)}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyBulk}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded text-xs"
            >
              Load Lines
            </button>
          </div>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleRunBatch}
          disabled={!nfa || testCases.length === 0}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-medium text-sm rounded-lg shadow-md shadow-blue-950/30 transition-all cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Run All Tests</span>
        </button>

        <button
          type="button"
          onClick={handleAddRow}
          title="Add single test row"
          className="flex items-center gap-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Row</span>
        </button>

        {testCases.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            title="Clear all test cases"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Summary Metrics Bar (TASK 2) */}
      {batchMetrics && (
        <div
          data-testid="batch-metrics-bar"
          className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              Batch Execution Metrics
            </span>
            <div className="text-xs font-mono font-bold">
              {batchMetrics.passRate !== null ? (
                <span
                  className={
                    batchMetrics.passRate === 100
                      ? 'text-emerald-400'
                      : batchMetrics.passRate >= 70
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }
                >
                  Pass Rate: {batchMetrics.passRate.toFixed(1)}%
                </span>
              ) : (
                <span className="text-slate-500 font-normal">
                  Pass Rate: N/A (unspecified expectations)
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Total Cases</span>
              <span className="text-slate-200 font-bold text-sm">{batchMetrics.total}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
              <span className="text-emerald-400 block text-[10px]">Accepted Strings</span>
              <span className="text-emerald-300 font-bold text-sm">{batchMetrics.acceptedCount}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
              <span className="text-rose-400 block text-[10px]">Rejected Strings</span>
              <span className="text-rose-300 font-bold text-sm">{batchMetrics.rejectedCount}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
              <span className="text-emerald-400 block text-[10px]">Passed Predictions</span>
              <span className="text-emerald-300 font-bold text-sm">{batchMetrics.passedCount}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
              <span className="text-rose-400 block text-[10px]">Failed Predictions</span>
              <span className="text-rose-300 font-bold text-sm">{batchMetrics.failedCount}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Unspecified</span>
              <span className="text-slate-300 font-bold text-sm">{batchMetrics.unspecifiedCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Test Cases Table */}
      {testCases.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Input String</th>
                <th className="py-2.5 px-3">Expected</th>
                <th className="py-2.5 px-3">Actual Result</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {testCases.map((tc, idx) => {
                const res = batchResults ? batchResults[idx] : null;

                return (
                  <tr key={tc.id || idx} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Input String Field (Preserves empty string as ε) */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={tc.input}
                          onChange={(e) => handleUpdateRow(idx, 'input', e.target.value)}
                          placeholder="ε (empty)"
                          className="bg-slate-900 border border-slate-800 focus:border-blue-500 rounded px-2 py-1 font-mono text-xs text-slate-100 placeholder:text-slate-400 w-28 sm:w-36 outline-none"
                        />
                        {tc.input === '' && (
                          <span className="text-[10px] font-mono text-emerald-400/90 font-semibold">
                            ε
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Expected Outcome Dropdown */}
                    <td className="py-2 px-3">
                      <select
                        value={tc.expectedResult || 'unspecified'}
                        onChange={(e) =>
                          handleUpdateRow(idx, 'expectedResult', e.target.value)
                        }
                        className="bg-slate-900 border border-slate-800 text-xs rounded px-2 py-1 text-slate-200 outline-none focus:border-blue-500"
                      >
                        <option value="unspecified">Unspecified</option>
                        <option value="accept">Accept</option>
                        <option value="reject">Reject</option>
                      </select>
                    </td>

                    {/* Actual Simulation Outcome */}
                    <td className="py-2 px-3 font-mono">
                      {res ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
                            res.result.accepted
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                              : 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                          }`}
                        >
                          {res.result.accepted ? 'Accepted' : 'Rejected'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Not run</span>
                      )}
                    </td>

                    {/* Verification Status (Pass / Fail / Unverified) */}
                    <td className="py-2 px-3">
                      {res ? (
                        res.passed === true ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                          </span>
                        ) : res.passed === false ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                            <XCircle className="w-3.5 h-3.5" /> Fail
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-mono">
                            Unverified
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Actions: Inspect Trace or Delete */}
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onInspectString && (
                          <button
                            type="button"
                            onClick={() => onInspectString(tc.input)}
                            title="Load string into single-step tracer"
                            className="p-1 text-slate-400 hover:text-blue-300 hover:bg-slate-800 rounded transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          title="Delete test case"
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Empty State */
        <div className="p-6 bg-slate-950/70 border border-slate-800 rounded-lg text-center flex flex-col items-center justify-center gap-2">
          <HelpCircle className="w-6 h-6 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300">
            No Test Cases Defined
          </span>
          <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
            Click <strong>Add Row</strong> to add an individual string, or click{' '}
            <strong>Preset Suite</strong> to load standard test vectors for{' '}
            <code className="text-blue-300 font-mono font-semibold">{activeRegex || 'the regex'}</code>.
          </p>
        </div>
      )}
    </div>
  );
};
