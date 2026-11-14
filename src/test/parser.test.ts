/**
 * parser.test.ts
 * Tests for the recursive-descent parser module.
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from '../engine/tokenizer.js';
import { parse } from '../engine/parser.js';
import { isParseError, isTokenizeError } from '../engine/types.js';
import type { ASTNode } from '../engine/types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ast(raw: string): ASTNode {
  const tokens = tokenize(raw);
  if (isTokenizeError(tokens)) throw new Error(`Tokenize error: ${tokens.message}`);
  const result = parse(tokens);
  if (isParseError(result)) throw new Error(`Parse error: ${result.message}`);
  return result;
}

function parseError(raw: string) {
  const tokens = tokenize(raw);
  // Some errors are caught at tokenize-time; surface them the same way
  if (isTokenizeError(tokens)) return tokens;
  const result = parse(tokens);
  if (!isParseError(result)) throw new Error('Expected a ParseError');
  return result;
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

describe('parser: atoms', () => {
  it('parses a single symbol', () => {
    expect(ast('a')).toEqual({ kind: 'Symbol', value: 'a' });
  });

  it('parses E as Epsilon', () => {
    expect(ast('E')).toEqual({ kind: 'Epsilon' });
  });

  it('parses ε as Epsilon', () => {
    expect(ast('ε')).toEqual({ kind: 'Epsilon' });
  });

  it('parses a digit as Symbol', () => {
    expect(ast('5')).toEqual({ kind: 'Symbol', value: '5' });
  });

  it('parses grouped single symbol', () => {
    expect(ast('(a)')).toEqual({ kind: 'Symbol', value: 'a' });
  });

  it('treats empty parens () as Epsilon', () => {
    expect(ast('()')).toEqual({ kind: 'Epsilon' });
  });
});

// ─── Kleene star ──────────────────────────────────────────────────────────────

describe('parser: Kleene star', () => {
  it('parses a* as Star of Symbol', () => {
    expect(ast('a*')).toEqual({ kind: 'Star', operand: { kind: 'Symbol', value: 'a' } });
  });

  it('parses (ab)* correctly', () => {
    const node = ast('(ab)*');
    expect(node.kind).toBe('Star');
    if (node.kind === 'Star') {
      expect(node.operand.kind).toBe('Concat');
    }
  });

  it('parses a** as Star(Star(a)) — double-star is valid', () => {
    const node = ast('a**');
    expect(node.kind).toBe('Star');
    if (node.kind === 'Star') {
      expect(node.operand.kind).toBe('Star');
    }
  });

  it('rejects * with no operand at start', () => {
    const e = parseError('*a');
    expect(e.message).toMatch(/kleene star/i);
  });
});

// ─── Concatenation ────────────────────────────────────────────────────────────

describe('parser: concatenation', () => {
  it('parses ab as Concat(a, b)', () => {
    expect(ast('ab')).toEqual({
      kind: 'Concat',
      left: { kind: 'Symbol', value: 'a' },
      right: { kind: 'Symbol', value: 'b' },
    });
  });

  it('parses abc as left-associative Concat', () => {
    // abc = Concat(Concat(a, b), c)
    const node = ast('abc');
    expect(node.kind).toBe('Concat');
    if (node.kind === 'Concat') {
      expect(node.right).toEqual({ kind: 'Symbol', value: 'c' });
      expect(node.left.kind).toBe('Concat');
    }
  });

  it('parses ab* as Concat(a, Star(b)) — star binds tighter than concat', () => {
    const node = ast('ab*');
    expect(node.kind).toBe('Concat');
    if (node.kind === 'Concat') {
      expect(node.left).toEqual({ kind: 'Symbol', value: 'a' });
      expect(node.right).toEqual({ kind: 'Star', operand: { kind: 'Symbol', value: 'b' } });
    }
  });

  it('parses aE as Concat(a, Epsilon)', () => {
    const node = ast('aE');
    expect(node).toEqual({
      kind: 'Concat',
      left: { kind: 'Symbol', value: 'a' },
      right: { kind: 'Epsilon' },
    });
  });
});

// ─── Union ────────────────────────────────────────────────────────────────────

describe('parser: union', () => {
  it('parses a|b as Union(a, b)', () => {
    expect(ast('a|b')).toEqual({
      kind: 'Union',
      left: { kind: 'Symbol', value: 'a' },
      right: { kind: 'Symbol', value: 'b' },
    });
  });

  it('parses a|bc as Union(a, Concat(b, c)) — concat binds tighter than union', () => {
    const node = ast('a|bc');
    expect(node.kind).toBe('Union');
    if (node.kind === 'Union') {
      expect(node.left).toEqual({ kind: 'Symbol', value: 'a' });
      expect(node.right.kind).toBe('Concat');
    }
  });

  it('parses a|b|c as left-associative Union', () => {
    const node = ast('a|b|c');
    // Union(Union(a,b), c)
    expect(node.kind).toBe('Union');
    if (node.kind === 'Union') {
      expect(node.left.kind).toBe('Union');
      expect(node.right).toEqual({ kind: 'Symbol', value: 'c' });
    }
  });

  it('parses E|a as Union(Epsilon, a)', () => {
    const node = ast('E|a');
    expect(node).toEqual({
      kind: 'Union',
      left: { kind: 'Epsilon' },
      right: { kind: 'Symbol', value: 'a' },
    });
  });

  it('rejects trailing | with helpful message', () => {
    const e = parseError('a|');
    expect(e.message).toMatch(/missing right operand/i);
  });

  it('rejects leading | — caught as star-without-operand or atom error', () => {
    // '|a' — the union rule tries to parseConcat first, which calls parseStar,
    // which sees | and returns an error about unexpected token
    const e = parseError('|a');
    expect(e.message).toBeTruthy();
  });
});

// ─── Parentheses and grouping ─────────────────────────────────────────────────

describe('parser: grouping', () => {
  it('parses (a|b)* correctly', () => {
    const node = ast('(a|b)*');
    expect(node.kind).toBe('Star');
    if (node.kind === 'Star') {
      expect(node.operand.kind).toBe('Union');
    }
  });

  it('parses (a|b)*abb correctly', () => {
    const node = ast('(a|b)*abb');
    // Concat(Concat(Concat(Concat(Star(Union(a,b)), a), b), b)
    expect(node.kind).toBe('Concat');
  });

  it('rejects unmatched opening paren', () => {
    const e = parseError('(ab');
    expect(e.message).toMatch(/unmatched opening parenthesis/i);
  });

  it('rejects unexpected closing paren', () => {
    const e = parseError('ab)');
    expect(e.message).toMatch(/closing parenthesis/i);
  });

  it('handles nested parentheses', () => {
    const node = ast('((a))');
    expect(node).toEqual({ kind: 'Symbol', value: 'a' });
  });

  it('handles nested stars in parens', () => {
    const node = ast('((a*)*)');
    expect(node.kind).toBe('Star');
    if (node.kind === 'Star') {
      expect(node.operand.kind).toBe('Star');
    }
  });
});

// ─── Precedence verification ──────────────────────────────────────────────────

describe('parser: operator precedence', () => {
  it('star binds more tightly than concat: ab* ≠ (ab)*', () => {
    const abStar  = ast('ab*');  // Concat(a, Star(b))
    const groupSt = ast('(ab)*'); // Star(Concat(a, b))
    expect(abStar.kind).toBe('Concat');
    expect(groupSt.kind).toBe('Star');
  });

  it('concat binds more tightly than union: a|bc ≠ (a|b)c', () => {
    const unionFirst  = ast('a|bc');   // Union(a, Concat(b, c))
    const groupFirst  = ast('(a|b)c'); // Concat(Union(a,b), c)
    expect(unionFirst.kind).toBe('Union');
    expect(groupFirst.kind).toBe('Concat');
  });
});
