/**
 * thompson.ts
 * Thompson's construction: converts an AST into an ε-NFA.
 *
 * Rules (from PROJECT_SPEC §5.4):
 *
 *  ε        → 2 states, 1 ε-transition
 *  Symbol a → 2 states, 1 a-transition
 *  N(s)|N(t)→ 2 new states, 4 ε-transitions
 *  N(s)·N(t)→ 0 new states, 1 ε-transition (accept(s) → start(t))
 *  N(s)*    → 2 new states, 4 ε-transitions (incl. loop and skip)
 *
 * State IDs are assigned by a monotonic counter that is reset at the start
 * of every buildNFA() call. Labels are "q0", "q1", etc. in creation order.
 *
 * The returned NFA has states[i].isAccepting === true for exactly one state.
 */

import { EPSILON_SYMBOL } from './constants.js';
import type {
  ASTNode,
  NFA,
  NFAFragment,
  NFAState,
  NFATransition,
  StateId,
} from './types.js';

// ─── Public API ──────────────────────────────────────────────────────────────

/** Build an ε-NFA from a parsed AST using Thompson's construction. */
export function buildNFA(ast: ASTNode): NFA {
  const ctx = new BuildContext();
  const fragment = ctx.build(ast);

  // Mark start and accepting states
  ctx.states.find(s => s.id === fragment.start)!.isStart = true;
  ctx.states.find(s => s.id === fragment.accept)!.isAccepting = true;

  const alphabet = new Set<string>(
    ctx.transitions
      .filter(t => t.symbol !== EPSILON_SYMBOL)
      .map(t => t.symbol),
  );

  return {
    states: ctx.states,
    transitions: ctx.transitions,
    startState: fragment.start,
    acceptingStates: [fragment.accept],
    alphabet,
  };
}

// ─── Build context ───────────────────────────────────────────────────────────

/**
 * Holds the mutable state (state counter, collected states & transitions)
 * for a single buildNFA() call. Isolated to prevent global mutation.
 */
class BuildContext {
  readonly states: NFAState[] = [];
  readonly transitions: NFATransition[] = [];
  private counter = 0;

  /** Allocate a new state, record it, and return its ID. */
  newState(): StateId {
    const id = this.counter++;
    this.states.push({ id, label: `q${id}`, isStart: false, isAccepting: false });
    return id;
  }

  /** Record a transition. */
  addTransition(from: StateId, to: StateId, symbol: string): void {
    this.transitions.push({ from, to, symbol });
  }

  /** Recursively build a Thompson fragment for an AST node. */
  build(node: ASTNode): NFAFragment {
    switch (node.kind) {
      case 'Epsilon':  return this.buildEpsilon();
      case 'Symbol':   return this.buildSymbol(node.value);
      case 'Union':    return this.buildUnion(node.left, node.right);
      case 'Concat':   return this.buildConcat(node.left, node.right);
      case 'Star':     return this.buildStar(node.operand);
    }
  }

  // ── Base cases ─────────────────────────────────────────────────────────────

  /** ε: qₛ →ε→ qₐ */
  private buildEpsilon(): NFAFragment {
    const start  = this.newState();
    const accept = this.newState();
    this.addTransition(start, accept, EPSILON_SYMBOL);
    return { start, accept };
  }

  /** a: qₛ →a→ qₐ */
  private buildSymbol(symbol: string): NFAFragment {
    const start  = this.newState();
    const accept = this.newState();
    this.addTransition(start, accept, symbol);
    return { start, accept };
  }

  // ── Inductive cases ────────────────────────────────────────────────────────

  /**
   * N(s) | N(t):
   *   q_new_s →ε→ start(s)
   *   q_new_s →ε→ start(t)
   *   accept(s) →ε→ q_new_a
   *   accept(t) →ε→ q_new_a
   */
  private buildUnion(left: ASTNode, right: ASTNode): NFAFragment {
    const ns = this.build(left);
    const nt = this.build(right);

    const newStart  = this.newState();
    const newAccept = this.newState();

    this.addTransition(newStart, ns.start, EPSILON_SYMBOL);
    this.addTransition(newStart, nt.start, EPSILON_SYMBOL);
    this.addTransition(ns.accept, newAccept, EPSILON_SYMBOL);
    this.addTransition(nt.accept, newAccept, EPSILON_SYMBOL);

    return { start: newStart, accept: newAccept };
  }

  /**
   * N(s) · N(t):
   *   accept(s) →ε→ start(t)
   *   (no new states; the combined fragment spans from start(s) to accept(t))
   */
  private buildConcat(left: ASTNode, right: ASTNode): NFAFragment {
    const ns = this.build(left);
    const nt = this.build(right);

    this.addTransition(ns.accept, nt.start, EPSILON_SYMBOL);

    return { start: ns.start, accept: nt.accept };
  }

  /**
   * N(s)*:
   *   q_new_s →ε→ start(s)   (enter the loop)
   *   q_new_s →ε→ q_new_a    (skip, zero repetitions)
   *   accept(s) →ε→ start(s) (loop back)
   *   accept(s) →ε→ q_new_a  (exit the loop)
   */
  private buildStar(operand: ASTNode): NFAFragment {
    const ns = this.build(operand);

    const newStart  = this.newState();
    const newAccept = this.newState();

    this.addTransition(newStart, ns.start,  EPSILON_SYMBOL); // enter
    this.addTransition(newStart, newAccept, EPSILON_SYMBOL); // skip
    this.addTransition(ns.accept, ns.start,  EPSILON_SYMBOL); // loop
    this.addTransition(ns.accept, newAccept, EPSILON_SYMBOL); // exit

    return { start: newStart, accept: newAccept };
  }
}
