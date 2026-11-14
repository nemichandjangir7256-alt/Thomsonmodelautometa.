import { describe, expect, it } from 'vitest';
import {
  compileRegex,
  isParseError,
  isTokenizeError,
  simulate,
  type NFA,
} from '../engine/index.js';

function nfaFor(expression: string): NFA {
  const result = compileRegex(expression);
  if (isTokenizeError(result) || isParseError(result)) {
    throw new Error(result.message);
  }
  return result;
}

describe('Milestone-II final algorithm verification matrix', () => {
  it.each([
    ['a', 2, 1],
    ['b', 2, 1],
    ['E', 2, 1],
    ['ε', 2, 1],
    ['ab', 4, 3],
    ['a|b', 6, 6],
    ['a*', 4, 5],
    ['(ab)', 4, 3],
    ['(a|b)*', 8, 10],
    ['(a|b)*abb', 14, 16],
    ['((a|b)*)*', 10, 14],
  ])('constructs %s with expected state and transition counts', (expression, states, transitions) => {
    const nfa = nfaFor(expression);
    expect(nfa.states).toHaveLength(states);
    expect(nfa.transitions).toHaveLength(transitions);
    expect(new Set(nfa.states.map((state) => state.id)).size).toBe(states);
    expect(nfa.acceptingStates).toHaveLength(1);
    for (const transition of nfa.transitions) {
      expect(nfa.states.some((state) => state.id === transition.from)).toBe(true);
      expect(nfa.states.some((state) => state.id === transition.to)).toBe(true);
    }
  });

  it.each([
    ['abb', true],
    ['aabb', true],
    ['babb', true],
    ['bbabb', true],
    ['ab', false],
    ['aab', false],
    ['ba', false],
    ['aba', false],
    ['bbb', false],
    ['', false],
  ])('matches (a|b)*abb input %j as %s', (input, expected) => {
    expect(simulate(input, nfaFor('(a|b)*abb')).accepted).toBe(expected);
  });

  it.each([
    ['a*', '', true],
    ['a*', 'aaaa', true],
    ['a*', 'bbbb', false],
    ['a|b', '', false],
    ['ab', 'ab', true],
    ['ab', 'a', false],
    ['(a|b)*', 'aaab', true],
    ['((a|b)*)*', 'abba', true],
    ['a', 'aa', false],
  ])('simulates %s on input %j as %s', (expression, input, expected) => {
    expect(simulate(input, nfaFor(expression)).accepted).toBe(expected);
  });

  it('terminates and preserves acceptance semantics for epsilon cycles', () => {
    const result = simulate('', nfaFor('a*'));
    expect(result.accepted).toBe(true);
    expect(result.steps).toHaveLength(1);
    expect(result.finalActiveStates.length).toBeGreaterThan(0);
  });

  it('rejects unsupported syntax and malformed expressions without throwing', () => {
    expect(isTokenizeError(compileRegex('a+'))).toBe(true);
    expect(isParseError(compileRegex('a|'))).toBe(true);
    expect(isParseError(compileRegex('(ab'))).toBe(true);
  });

  it('records early dead-state rejection rather than accepting an intermediate match', () => {
    const result = simulate('aa', nfaFor('a'));
    expect(result.accepted).toBe(false);
    expect(result.consumedCharacters).toBe(1);
    expect(result.finalActiveStates).toEqual([]);
  });
});
