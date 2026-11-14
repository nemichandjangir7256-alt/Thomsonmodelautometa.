/**
 * batch.ts
 * Batch test runner for Thompson ε-NFAs.
 *
 * Runs multiple test inputs against an NFA, verifies predictions against
 * expected results (if provided), and computes mathematical verification metrics.
 */

import { simulate } from './simulator.js';
import type { NFA, BatchTestCase, BatchTestResult } from './types.js';

export interface BatchMetrics {
  total: number;
  acceptedCount: number;
  rejectedCount: number;
  passedCount: number;
  failedCount: number;
  unspecifiedCount: number;
  /** Null if no test cases with a specified expectation were executed */
  passRate: number | null;
}

export interface BatchRunOutput {
  results: BatchTestResult[];
  metrics: BatchMetrics;
}

/**
 * Executes a list of test cases against an NFA.
 * Preserves empty-string inputs and correctly distinguishes
 * an accepted string from a correctly predicted test case.
 */
export function runBatchTests(testCases: BatchTestCase[], nfa: NFA): BatchRunOutput {
  if (!nfa || !testCases || testCases.length === 0) {
    return {
      results: [],
      metrics: {
        total: 0,
        acceptedCount: 0,
        rejectedCount: 0,
        passedCount: 0,
        failedCount: 0,
        unspecifiedCount: 0,
        passRate: null,
      },
    };
  }

  const results: BatchTestResult[] = testCases.map((tc) => {
    const simResult = simulate(tc.input, nfa);

    let passed: boolean | undefined = undefined;
    if (tc.expectedResult === 'accept') {
      passed = simResult.accepted === true;
    } else if (tc.expectedResult === 'reject') {
      passed = simResult.accepted === false;
    }

    return {
      testCase: tc,
      result: simResult,
      passed,
    };
  });

  const total = results.length;
  let acceptedCount = 0;
  let rejectedCount = 0;
  let passedCount = 0;
  let failedCount = 0;
  let unspecifiedCount = 0;

  for (const r of results) {
    if (r.result.accepted) {
      acceptedCount++;
    } else {
      rejectedCount++;
    }

    if (r.passed === true) {
      passedCount++;
    } else if (r.passed === false) {
      failedCount++;
    } else {
      unspecifiedCount++;
    }
  }

  const specifiedCount = passedCount + failedCount;
  const passRate = specifiedCount > 0 ? (passedCount / specifiedCount) * 100 : null;

  return {
    results,
    metrics: {
      total,
      acceptedCount,
      rejectedCount,
      passedCount,
      failedCount,
      unspecifiedCount,
      passRate,
    },
  };
}
