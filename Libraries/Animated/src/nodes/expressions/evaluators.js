/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

const AnimatedNode = require('../AnimatedNode');
const AnimatedValue = require('../AnimatedValue');

import type {ExpressionNode} from './types';

type ReducerFunction = () => number;

const add = (node: ExpressionNode) => multi(node, (p, c) => p + c);
const sub = (node: ExpressionNode) => multi(node, (p, c) => p - c);
const multiply = (node: ExpressionNode) => multi(node, (p, c) => p * c);
const divide = (node: ExpressionNode) => multi(node, (p, c) => p / c);
const pow = (node: ExpressionNode) => multi(node, (p, c) => Math.pow(p, c));
const modulo = (node: ExpressionNode) =>
  multi(node, (p, c) => ((p % c) + c) % c);
const max = (node: ExpressionNode) => multi(node, (p, c) => (c > p ? c : p));
const min = (node: ExpressionNode) => multi(node, (p, c) => (c < p ? c : p));
const abs = (node: ExpressionNode) => unary(node, v => Math.abs(v));
const sqrt = (node: ExpressionNode) => unary(node, v => Math.sqrt(v));
const log = (node: ExpressionNode) => unary(node, v => Math.log(v));
const sin = (node: ExpressionNode) => unary(node, v => Math.sin(v));
const cos = (node: ExpressionNode) => unary(node, v => Math.cos(v));
const tan = (node: ExpressionNode) => unary(node, v => Math.tan(v));
const acos = (node: ExpressionNode) => unary(node, v => Math.acos(v));
const asin = (node: ExpressionNode) => unary(node, v => Math.asin(v));
const atan = (node: ExpressionNode) => unary(node, v => Math.atan(v));
const exp = (node: ExpressionNode) => unary(node, v => Math.exp(v));
const round = (node: ExpressionNode) => unary(node, v => Math.round(v));
const ceil = (node: ExpressionNode) => unary(node, v => Math.ceil(v));
const floor = (node: ExpressionNode) => unary(node, v => Math.floor(v));
const and = (node: ExpressionNode) => multi(node, (p, c) => (p && c ? 1 : 0));
const or = (node: ExpressionNode) => multi(node, (p, c) => (p || c ? 1 : 0));
const not = (node: ExpressionNode) => unary(node, v => (!v ? 1 : 0));
const eq = (node: ExpressionNode) =>
  boolean(node, (left, right) => (left === right ? 1 : 0));
const neq = (node: ExpressionNode) =>
  boolean(node, (left, right) => (left !== right ? 1 : 0));
const lessThan = (node: ExpressionNode) =>
  boolean(node, (left, right) => (left < right ? 1 : 0));
const greaterThan = (node: ExpressionNode) =>
  boolean(node, (left, right) => (left > right ? 1 : 0));
const lessOrEq = (node: ExpressionNode) =>
  boolean(node, (left, right) => (left <= right ? 1 : 0));
const greaterOrEq = (node: ExpressionNode) =>
  boolean(node, (left, right) => (left >= right ? 1 : 0));
const value = (node: ExpressionNode) => () => node.getValue && node.getValue();
const number = (node: ExpressionNode) => () => node.value;
const cond = condReducer;
const set = setReducer;
const block = blockReducer;
const call = callReducer;

const evaluators = {
  add,
  sub,
  divide,
  multiply,
  pow,
  modulo,
  max,
  min,
  abs,
  sqrt,
  log,
  sin,
  cos,
  tan,
  acos,
  asin,
  atan,
  exp,
  round,
  ceil,
  floor,
  and,
  or,
  not,
  eq,
  neq,
  lessThan,
  greaterThan,
  lessOrEq,
  greaterOrEq,
  cond,
  set,
  block,
  call,
  value,
  number,
};

function createEvaluator(
  element: AnimatedNode | AnimatedValue | number | ExpressionNode,
): ReducerFunction {
  if (typeof element === 'number') {
    return () => element;
  } else if (element.hasOwnProperty('__attach')) {
    return () =>
      ((element: any): AnimatedNode).__getValue &&
      ((element: any): AnimatedNode).__getValue();
  }
  if (!element.type) {
    throw new Error('Error: Element type unknown.');
  }

  const node = ((element: any): ExpressionNode);
  if (!evaluators[node.type]) {
    throw new Error('Error: Node type ' + node.type + ' not found.');
  }
  return evaluators[node.type](element);
}

function callReducer(node: ExpressionNode): ReducerFunction {
  const evalFuncs = (node.args ? node.args : []).map(createEvaluator);
  const callback = node.callback ? node.callback : (args: number[]) => {};
  return () => {
    let values = [];
    for (let i = 0; i < evalFuncs.length; i++) {
      values.push(evalFuncs[i]());
    }
    callback(values);
    return 0;
  };
}

function blockReducer(node: ExpressionNode): ReducerFunction {
  const evalFuncs = (node.nodes ? node.nodes : []).map(createEvaluator);
  return () => {
    let retVal = 0;
    for (let i = 0; i < evalFuncs.length; i++) {
      retVal = evalFuncs[i]();
    }
    return retVal;
  };
}

function setReducer(node: ExpressionNode): ReducerFunction {
  if (!node.source) {
    throw Error('Source missing in node');
  }
  const source = createEvaluator(node.source);
  return () => {
    const retVal = source();
    node.target && node.target.setValue && node.target.setValue(retVal);
    return retVal;
  };
}

function condReducer(node: ExpressionNode): ReducerFunction {
  if (!node.expr) {
    throw Error('Expression clause missing in node');
  }
  const expr = createEvaluator(node.expr);

  if (!node.ifNode) {
    throw Error('If clause missing in node');
  }
  const ifEval = createEvaluator(node.ifNode);

  const falseEval = node.elseNode ? createEvaluator(node.elseNode) : () => 0;

  return () => {
    const c = expr();
    if (c) {
      return ifEval();
    } else {
      return falseEval();
    }
  };
}

function multi(
  node: ExpressionNode,
  reducer: (prev: number, cur: number) => number,
): ReducerFunction {
  if (!node.a) {
    throw Error('A missing in node');
  }
  const a = createEvaluator(node.a);

  if (!node.b) {
    throw Error('B missing in node');
  }
  const b = createEvaluator(node.b);
  const others = (node.others || []).map(createEvaluator);
  return () => {
    let acc = reducer(a(), b());
    for (let i = 0; i < others.length; i++) {
      acc = reducer(acc, others[i]());
    }
    return acc;
  };
}

function unary(
  node: ExpressionNode,
  reducer: (v: number) => number,
): ReducerFunction {
  if (!node.v) {
    throw Error('Value clause missing in node');
  }
  const v = createEvaluator(node.v);
  return () => {
    return reducer(v());
  };
}

function boolean(
  node: ExpressionNode,
  reducer: (left: number, right: number) => number,
): ReducerFunction {
  if (!node.left) {
    throw Error('Left missing in node');
  }
  const left = createEvaluator(node.left);

  if (!node.right) {
    throw Error('Right missing in node');
  }
  const right = createEvaluator(node.right);
  return () => {
    return reducer(left(), right());
  };
}

export {createEvaluator};
