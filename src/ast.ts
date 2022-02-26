import { Operator } from "./types";

// https://lisperator.net/pltut/parser/the-ast

export type VarName = string; // alias for readability

export type NumAST = { type: "num"; value: number };
export type StrAST = { type: "str"; value: string };
export type BoolAST = { type: "bool"; value: boolean };
export type VarAST = { type: "var"; value: VarName };
export type LambdaAST = { type: "lambda"; vars: VarName[]; body: AST };
export type CallAST = { type: "call"; func: VarAST; args: AST[] };
export type IfAST = { type: "if"; cond: AST; then: AST; else?: AST };
export type AssignAST = {
  type: "assign";
  operator: "=";
  left: AST;
  right: AST;
};
export type BinaryAST = {
  type: "binary";
  operator: Operator;
  left: AST;
  right: AST;
};
export type ProgAST = { type: "prog"; prog: AST[] };
export type LetAST = { type: "let"; vars: VarAST[]; body: AST };

export type AST =
  | NumAST
  | StrAST
  | BoolAST
  | VarAST
  | LambdaAST
  | CallAST
  | IfAST
  | AssignAST
  | BinaryAST
  | ProgAST
  | LetAST;
