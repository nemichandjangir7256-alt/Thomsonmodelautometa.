/**
 * types.ts
 * All shared TypeScript interfaces and types for the Thompson Automata engine.
 * This file has no imports — it is the dependency-free root of the engine.
 */

import { EPSILON_SYMBOL } from './constants.js';

// ─── Tokenizer ───────────────────────────────────────────────────────────────

export type TokenType =
  | 'SYMBOL'   // single alphabet character
  | 'EPSILON'  // E or ε, normalised
  | 'UNION'    // |
  | 'STAR'     // *
  | 'LPAREN'   // (
  | 'RPAREN'   // )
  | 'EOF';     // sentinel end-of-input

export interface Token {
  type: TokenType;
  /** The original (or normalised) character value. */
  value: string;
  /** Zero-based index of this token in the *stripped* input string. */
  position: number;
}

export interface TokenizeError {
  readonly kind: 'TokenizeError';
  message: string;
  position: number;
}

/** Discriminated union returned by tokenize(). */
export type TokenizeResult = Token[] | TokenizeError;

// ─── AST ─────────────────────────────────────────────────────────────────────

export type ASTNode =
  | { kind: 'Symbol';  value: string }
  | { kind: 'Epsilon' }
  | { kind: 'Union';  left: ASTNode; right: ASTNode }
  | { kind: 'Concat'; left: ASTNode; right: ASTNode }
  | { kind: 'Star';   operand: ASTNode };

// ─── Parser ──────────────────────────────────────────────────────────────────

export interface ParseError {
  readonly kind: 'ParseError';
  message: string;
  position: number;
}

/** Discriminated union returned by parse(). */
export type ParseResult = ASTNode | ParseError;

// ─── Automaton ───────────────────────────────────────────────────────────────

/** Opaque numeric identifier for a single NFA state. */
export type StateId = number;

export interface NFAState {
  id: StateId;
  /** Human-readable label, e.g. "q0", "q1". */
  label: string;
  isStart: boolean;
  isAccepting: boolean;
}

export interface NFATransition {
  from: StateId;
  to: StateId;
  /**
   * A single alphabet character, or EPSILON_SYMBOL ('ε') for ε-transitions.
   * Import EPSILON_SYMBOL from constants.ts to compare.
   */
  symbol: string;
}

export interface NFA {
  states: NFAState[];
  transitions: NFATransition[];
  startState: StateId;
  /** Thompson's construction always produces exactly one accepting state. */
  acceptingStates: StateId[];
  /** All non-epsilon alphabet symbols used in the NFA. */
  alphabet: Set<string>;
}

/**
 * Internal Thompson fragment — NOT exported outside the engine.
 * Represents a sub-NFA with a single entry and a single (non-accepting) exit.
 */
export interface NFAFragment {
  start: StateId;
  accept: StateId;
}

// ─── Simulation ──────────────────────────────────────────────────────────────

export interface SimulationStep {
  /** 0-based index of this step. Step 0 is the initial ε-closure. */
  stepIndex: number;
  /**
   * The input symbol consumed to reach this step.
   * null for the initial ε-closure step (no symbol consumed yet).
   */
  symbol: string | null;
  /** Active state set before consuming the symbol (before move). */
  activeStatesBefore: StateId[];
  /**
   * The full ε-closure of the states reached after move.
   * For step 0 this is the initial ε-closure of the start state.
   */
  epsilonClosure: StateId[];
  /** The final active state set at the end of this step (= epsilonClosure). */
  activeStatesAfter: StateId[];
  /** Symbol-labelled transitions taken during this step. */
  symbolTransitions?: Array<{ from: StateId; to: StateId; symbol: string }>;
  /** ε-transitions traversed while expanding the resulting closure. */
  epsilonTransitions?: Array<{ from: StateId; to: StateId }>;
  /** Zero-based input position, or null for the initial closure. */
  inputPosition?: number | null;
  /** States reached by ε-expansion (excluding direct symbol targets where possible). */
  epsilonClosureStates?: StateId[];
  /** Human-readable explanation suitable for a step-by-step trace UI. */
  description: string;
}

export interface SimulationResult {
  input: string;
  accepted: boolean;
  steps: SimulationStep[];
  /** The active state set after the last step. */
  finalActiveStates: StateId[];
  /** Number of input symbols successfully consumed before termination. */
  consumedCharacters?: number;
  /** Populated when accepted === false to explain the rejection. */
  rejectionReason?: string;
}

// ─── Batch testing ───────────────────────────────────────────────────────────

export interface BatchTestCase {
  id?: string;
  input: string;
  /** Optional expected outcome, used to compute `passed`. */
  expectedResult?: 'accept' | 'reject' | 'unspecified';
}

export interface BatchTestResult {
  testCase: BatchTestCase;
  result: SimulationResult;
  /**
   * true  — result matches expectedResult
   * false — result does not match expectedResult
   * undefined — no expectedResult provided
   */
  passed?: boolean;
}

// ─── Type guards ─────────────────────────────────────────────────────────────

export function isTokenizeError(v: unknown): v is TokenizeError {
  return typeof v === 'object' && v !== null && (v as { kind?: unknown }).kind === 'TokenizeError';
}

export function isParseError(v: unknown): v is ParseError {
  return typeof v === 'object' && v !== null && (v as { kind?: unknown }).kind === 'ParseError';
}

export function isEpsilonTransition(t: NFATransition): boolean {
  return t.symbol === EPSILON_SYMBOL;
}
