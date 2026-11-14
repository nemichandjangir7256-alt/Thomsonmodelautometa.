/**
 * index.ts
 * Public re-export barrel for the automata engine.
 *
 * Consumers (hooks, tests) should import from 'src/engine' rather than
 * reaching into individual engine modules.
 *
 * IMPORTANT: This file must never import from src/components/, src/graph/,
 *            src/hooks/, React, or the DOM.
 */

// ─── Constants ────────────────────────────────────────────────────────────────
export { EPSILON_SYMBOL, RESERVED_CHARS, UNSUPPORTED_OPERATORS } from './constants.js';

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  // Tokenizer
  TokenType,
  Token,
  TokenizeError,
  TokenizeResult,
  // AST
  ASTNode,
  // Parser
  ParseError,
  ParseResult,
  // Automaton
  StateId,
  NFAState,
  NFATransition,
  NFA,
  // Simulation
  SimulationStep,
  SimulationResult,
  // Batch
  BatchTestCase,
  BatchTestResult,
} from './types.js';

export { isTokenizeError, isParseError, isEpsilonTransition } from './types.js';

// ─── Tokenizer ────────────────────────────────────────────────────────────────
export { tokenize } from './tokenizer.js';

// ─── Parser ───────────────────────────────────────────────────────────────────
export { parse } from './parser.js';

// ─── Thompson construction ────────────────────────────────────────────────────
export { buildNFA } from './thompson.js';

// ─── Closure operations ───────────────────────────────────────────────────────
export { epsilonClosure, move } from './closure.js';

// ─── Simulator ────────────────────────────────────────────────────────────────
export { simulate } from './simulator.js';

// ─── Batch Testing ────────────────────────────────────────────────────────────
export { runBatchTests, type BatchMetrics, type BatchRunOutput } from './batch.js';

// ─── High-level pipeline helper ───────────────────────────────────────────────

import { tokenize } from './tokenizer.js';
import { parse } from './parser.js';
import { buildNFA } from './thompson.js';
import { simulate } from './simulator.js';
import { isTokenizeError, isParseError } from './types.js';
import type { NFA, SimulationResult, TokenizeError, ParseError } from './types.js';

/**
 * Convenience function: tokenise → parse → build NFA in one call.
 * Returns the NFA or the first error encountered.
 */
export function compileRegex(
  raw: string,
): NFA | TokenizeError | ParseError {
  const tokens = tokenize(raw);
  if (isTokenizeError(tokens)) return tokens;

  const ast = parse(tokens);
  if (isParseError(ast)) return ast;

  return buildNFA(ast);
}

/**
 * Convenience function: compile regex and simulate input in one call.
 * Returns the SimulationResult or the first compilation error.
 */
export function compileAndSimulate(
  raw: string,
  input: string,
): SimulationResult | TokenizeError | ParseError {
  const nfa = compileRegex(raw);
  if (isTokenizeError(nfa) || isParseError(nfa)) return nfa;
  return simulate(input, nfa);
}
