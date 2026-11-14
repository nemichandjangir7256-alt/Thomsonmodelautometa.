/**
 * batch.test.ts
 * Tests for batch runner and metric calculations.
 */

import { describe, it, expect } from 'vitest';
import {
  compileRegex,
  runBatchTests,
  isTokenizeError,
  isParseError,
  type NFA,
  type BatchTestCase,
} from '../engine/index.js';

function getCompiledNFA(regex: string): NFA {
  const result = compileRegex(regex);
  if (isTokenizeError(result) || isParseError(result)) {
    throw new Error(`Compilation failed for ${regex}: ${result.message}`);
  }
  return result;
}

describe('Milestone 5: Batch Testing & Verification Points', () => {
  // 1-3. Regex a*
  it('1-3. Regex a* batch cases: empty (accept), aaaa (accept), b (reject)', () => {
    const nfa = getCompiledNFA('a*');
    const cases: BatchTestCase[] = [
      { input: '', expectedResult: 'accept' },
      { input: 'aaaa', expectedResult: 'accept' },
      { input: 'b', expectedResult: 'reject' },
    ];
    const { results, metrics } = runBatchTests(cases, nfa);

    expect(metrics.total).toBe(3);
    expect(metrics.passedCount).toBe(3);
    expect(metrics.failedCount).toBe(0);
    expect(metrics.passRate).toBe(100);

    expect(results[0].result.accepted).toBe(true);
    expect(results[1].result.accepted).toBe(true);
    expect(results[2].result.accepted).toBe(false);
  });

  // 4-5. Regex ab
  it('4-5. Regex ab batch cases: ab (accept), a (reject)', () => {
    const nfa = getCompiledNFA('ab');
    const cases: BatchTestCase[] = [
      { input: 'ab', expectedResult: 'accept' },
      { input: 'a', expectedResult: 'reject' },
    ];
    const { results, metrics } = runBatchTests(cases, nfa);

    expect(metrics.passedCount).toBe(2);
    expect(results[0].result.accepted).toBe(true);
    expect(results[1].result.accepted).toBe(false);
  });

  // 6-7. E and ε empty string acceptance
  it('6-7. Regex E and ε both accept empty input in batch', () => {
    const nfaE = getCompiledNFA('E');
    const nfaEps = getCompiledNFA('ε');

    const cases: BatchTestCase[] = [{ input: '', expectedResult: 'accept' }];

    const resE = runBatchTests(cases, nfaE);
    const resEps = runBatchTests(cases, nfaEps);

    expect(resE.results[0].result.accepted).toBe(true);
    expect(resEps.results[0].result.accepted).toBe(true);
    expect(resE.metrics.passRate).toBe(100);
    expect(resEps.metrics.passRate).toBe(100);
  });

  // 8-9. Regex E|a
  it('8-9. Regex E|a accepts both empty input and "a"', () => {
    const nfa = getCompiledNFA('E|a');
    const cases: BatchTestCase[] = [
      { input: '', expectedResult: 'accept' },
      { input: 'a', expectedResult: 'accept' },
      { input: 'b', expectedResult: 'reject' },
    ];
    const { results, metrics } = runBatchTests(cases, nfa);

    expect(results[0].result.accepted).toBe(true);
    expect(results[1].result.accepted).toBe(true);
    expect(results[2].result.accepted).toBe(false);
    expect(metrics.passRate).toBe(100);
  });

  // 10-11. Regex (a|b)*abb
  it('10-11. Regex (a|b)*abb accepts "aabb" and rejects "ab"', () => {
    const nfa = getCompiledNFA('(a|b)*abb');
    const cases: BatchTestCase[] = [
      { input: 'aabb', expectedResult: 'accept' },
      { input: 'ab', expectedResult: 'reject' },
    ];
    const { results, metrics } = runBatchTests(cases, nfa);

    expect(results[0].result.accepted).toBe(true);
    expect(results[1].result.accepted).toBe(false);
    expect(metrics.passedCount).toBe(2);
  });

  // 12. Regex (a|b)* accepts "abba"
  it('12. Regex (a|b)* accepts "abba"', () => {
    const nfa = getCompiledNFA('(a|b)*');
    const { results } = runBatchTests([{ input: 'abba', expectedResult: 'accept' }], nfa);
    expect(results[0].result.accepted).toBe(true);
  });

  // 13. Regex a|b rejects "ab"
  it('13. Regex a|b rejects "ab"', () => {
    const nfa = getCompiledNFA('a|b');
    const { results } = runBatchTests([{ input: 'ab', expectedResult: 'reject' }], nfa);
    expect(results[0].result.accepted).toBe(false);
  });

  // 14. Invalid regex a|
  it('14. Invalid regex a| returns parse error', () => {
    const result = compileRegex('a|');
    expect(isParseError(result)).toBe(true);
  });

  // 15. Mixed predictions (correct, incorrect, unspecified) metrics calculation
  it('15. Accurately calculates metrics with correct, incorrect, and unspecified expectations', () => {
    const nfa = getCompiledNFA('a*');
    const cases: BatchTestCase[] = [
      { input: 'a', expectedResult: 'accept' },      // Correct (Passed)
      { input: 'b', expectedResult: 'accept' },      // Incorrect: actually rejected (Failed)
      { input: '', expectedResult: 'unspecified' },  // Accepted, but Unspecified
      { input: 'c', expectedResult: 'unspecified' },  // Rejected, and Unspecified
    ];
    const { results, metrics } = runBatchTests(cases, nfa);

    expect(metrics.total).toBe(4);
    expect(metrics.acceptedCount).toBe(2); // 'a' and ''
    expect(metrics.rejectedCount).toBe(2); // 'b' and 'c'
    expect(metrics.passedCount).toBe(1);   // 'a'
    expect(metrics.failedCount).toBe(1);   // 'b'
    expect(metrics.unspecifiedCount).toBe(2); // '' and 'c'

    // Pass rate should be computed ONLY among specified cases (1 passed out of 2 specified = 50%)
    expect(metrics.passRate).toBe(50.0);

    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(false);
    expect(results[2].passed).toBeUndefined();
    expect(results[3].passed).toBeUndefined();
  });

  // 16. Zero test cases returns null passRate (not 0% or 100%)
  it('16. Zero test cases returns null passRate and zero metrics', () => {
    const nfa = getCompiledNFA('a');
    const { results, metrics } = runBatchTests([], nfa);

    expect(results.length).toBe(0);
    expect(metrics.total).toBe(0);
    expect(metrics.passRate).toBeNull();
  });

  it('All unspecified expectations returns null passRate (no misleading 0% or 100%)', () => {
    const nfa = getCompiledNFA('a');
    const cases: BatchTestCase[] = [
      { input: 'a', expectedResult: 'unspecified' },
      { input: 'b', expectedResult: 'unspecified' },
    ];
    const { metrics } = runBatchTests(cases, nfa);

    expect(metrics.total).toBe(2);
    expect(metrics.unspecifiedCount).toBe(2);
    expect(metrics.passedCount).toBe(0);
    expect(metrics.failedCount).toBe(0);
    expect(metrics.passRate).toBeNull();
  });
});
