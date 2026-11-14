/**
 * epsilon.test.ts
 * Required by PROJECT_SPEC: E and ε must be fully equivalent throughout the
 * entire pipeline (tokenizer → parser → Thompson → simulator).
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from '../engine/tokenizer.js';
import { parse } from '../engine/parser.js';
import { buildNFA } from '../engine/thompson.js';
import { simulate } from '../engine/simulator.js';
import { isParseError, isTokenizeError } from '../engine/types.js';
import { EPSILON_SYMBOL } from '../engine/constants.js';
import type { NFA } from '../engine/types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function compile(raw: string): NFA {
  const tokens = tokenize(raw);
  if (isTokenizeError(tokens)) throw new Error(`Tokenize: ${tokens.message}`);
  const ast = parse(tokens);
  if (isParseError(ast)) throw new Error(`Parse: ${ast.message}`);
  return buildNFA(ast);
}

function accepts(regex: string, input: string): boolean {
  return simulate(input, compile(regex)).accepted;
}

/** Compare two NFAs structurally (ignoring state IDs, which may differ between calls). */
function nfaStructureEqual(a: NFA, b: NFA): boolean {
  if (a.states.length !== b.states.length) return false;
  if (a.transitions.length !== b.transitions.length) return false;
  if (a.acceptingStates.length !== b.acceptingStates.length) return false;

  // Compare transition multisets (sorted by symbol then from/to offsets from start)
  function normalisedTransitions(nfa: NFA) {
    return nfa.transitions
      .map(t => ({ symbol: t.symbol, fromOffset: t.from - nfa.startState, toOffset: t.to - nfa.startState }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol) || a.fromOffset - b.fromOffset || a.toOffset - b.toOffset);
  }

  const ta = normalisedTransitions(a);
  const tb = normalisedTransitions(b);
  return JSON.stringify(ta) === JSON.stringify(tb);
}

// ─── Tokenizer equivalence ────────────────────────────────────────────────────

describe('epsilon: tokenizer equivalence', () => {
  it('E and ε both produce a single EPSILON token', () => {
    const tE = tokenize('E');
    const tEps = tokenize('ε');
    if (isTokenizeError(tE) || isTokenizeError(tEps)) throw new Error('Unexpected tokenize error');
    expect(tE[0].type).toBe('EPSILON');
    expect(tEps[0].type).toBe('EPSILON');
    expect(tE[0].value).toBe(EPSILON_SYMBOL);
    expect(tEps[0].value).toBe(EPSILON_SYMBOL);
  });

  it('E and ε produce identical token streams', () => {
    const tE = tokenize('E');
    const tEps = tokenize('ε');
    if (isTokenizeError(tE) || isTokenizeError(tEps)) throw new Error('Unexpected tokenize error');
    expect(JSON.stringify(tE)).toBe(JSON.stringify(tEps));
  });
});

// ─── Parser equivalence ───────────────────────────────────────────────────────

describe('epsilon: parser equivalence', () => {
  it('E and ε both parse to { kind: Epsilon }', () => {
    const tE = tokenize('E');
    const tEps = tokenize('ε');
    if (isTokenizeError(tE) || isTokenizeError(tEps)) throw new Error();
    const astE = parse(tE);
    const astEps = parse(tEps);
    if (isParseError(astE) || isParseError(astEps)) throw new Error('Unexpected parse error');
    expect(astE).toEqual({ kind: 'Epsilon' });
    expect(astEps).toEqual({ kind: 'Epsilon' });
    expect(JSON.stringify(astE)).toBe(JSON.stringify(astEps));
  });

  it('aE and a|E parse to equivalent AST shapes as ε versions', () => {
    const tokensAE  = tokenize('aE');
    const tokensAEps = tokenize('aε');
    if (isTokenizeError(tokensAE) || isTokenizeError(tokensAEps)) throw new Error();
    const astAE  = parse(tokensAE);
    const astAEps = parse(tokensAEps);
    expect(JSON.stringify(astAE)).toBe(JSON.stringify(astAEps));
  });
});

// ─── Thompson equivalence ─────────────────────────────────────────────────────

describe('epsilon: Thompson equivalence', () => {
  it('E and ε produce structurally equivalent NFAs', () => {
    const nfaE   = compile('E');
    const nfaEps = compile('ε');
    expect(nfaStructureEqual(nfaE, nfaEps)).toBe(true);
  });

  it('aE and aε produce structurally equivalent NFAs', () => {
    const nfaAE  = compile('aE');
    const nfaAEps = compile('aε');
    expect(nfaStructureEqual(nfaAE, nfaAEps)).toBe(true);
  });

  it('E|a and ε|a produce structurally equivalent NFAs', () => {
    expect(nfaStructureEqual(compile('E|a'), compile('ε|a'))).toBe(true);
  });
});

// ─── Simulation equivalence ───────────────────────────────────────────────────

describe('epsilon: simulation equivalence', () => {
  // E / ε alone
  it('E accepts the empty string', () => expect(accepts('E', '')).toBe(true));
  it('ε accepts the empty string', () => expect(accepts('ε', '')).toBe(true));
  it('E rejects "a"', () => expect(accepts('E', 'a')).toBe(false));
  it('ε rejects "a"', () => expect(accepts('ε', 'a')).toBe(false));

  // aE and a must accept/reject identically
  it('aE accepts "a"', () => expect(accepts('aE', 'a')).toBe(true));
  it('aε accepts "a"', () => expect(accepts('aε', 'a')).toBe(true));
  it('aE rejects ""', () => expect(accepts('aE', '')).toBe(false));
  it('aε rejects ""', () => expect(accepts('aε', '')).toBe(false));
  it('aE rejects "b"', () => expect(accepts('aE', 'b')).toBe(false));

  // E|a and ε|a
  it('E|a accepts ""', () => expect(accepts('E|a', '')).toBe(true));
  it('ε|a accepts ""', () => expect(accepts('ε|a', '')).toBe(true));
  it('E|a accepts "a"', () => expect(accepts('E|a', 'a')).toBe(true));
  it('ε|a accepts "a"', () => expect(accepts('ε|a', 'a')).toBe(true));
  it('E|a rejects "b"', () => expect(accepts('E|a', 'b')).toBe(false));
  it('ε|a rejects "b"', () => expect(accepts('ε|a', 'b')).toBe(false));

  // Epsilon cycle
  it('(E)* accepts "" without hanging', () => {
    const start = Date.now();
    const r = accepts('(E)*', '');
    expect(Date.now() - start).toBeLessThan(100);
    expect(r).toBe(true);
  });

  it('(ε)* accepts "" without hanging', () => {
    const start = Date.now();
    const r = accepts('(ε)*', '');
    expect(Date.now() - start).toBeLessThan(100);
    expect(r).toBe(true);
  });

  // Empty field is distinct from epsilon
  it('empty input to tokenize is an error, not epsilon', () => {
    const result = tokenize('');
    expect(isTokenizeError(result)).toBe(true);
  });
});

// ─── E as reserved (not a symbol) ─────────────────────────────────────────────

describe('epsilon: E is reserved', () => {
  it('E is never tokenised as a SYMBOL', () => {
    const result = tokenize('E');
    if (isTokenizeError(result)) throw new Error();
    expect(result[0].type).not.toBe('SYMBOL');
    expect(result[0].type).toBe('EPSILON');
  });

  it('E in a compound expression is still EPSILON', () => {
    const result = tokenize('aEb');
    if (isTokenizeError(result)) throw new Error();
    expect(result[1].type).toBe('EPSILON');
  });
});
