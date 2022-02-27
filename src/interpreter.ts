import { AST, LambdaAST } from "./ast";
import InputStream from "./input-stream";
import parse from "./parser";
import TokenStream from "./token-stream";
import { Operator } from "./types";

class Environment {
  vars: Record<string, any> = {};
  parent: Environment | null = null;

  constructor(parent?: Environment) {
    this.vars = Object.create(parent ? parent.vars : null);
    parent && (this.parent = parent);
  }

  extend() {
    return new Environment(this);
  }

  lookup(name: string) {
    let scope: Environment | null = this;

    while (scope) {
      if (Object.hasOwnProperty.call(scope.vars, name)) return scope;
      scope = scope.parent;
    }
  }

  get(name: string) {
    if (name in this.vars) return this.vars[name];
    throw new Error("Undefined variable " + name);
  }

  set(name: string, value: any) {
    var scope = this.lookup(name);
    // let's not allow defining globals from a nested environment
    if (!scope && this.parent) throw new Error("Undefined variable " + name);
    return ((scope || this).vars[name] = value);
  }

  def(name: string, value: any) {
    return (this.vars[name] = value);
  }
}

function evaluate(exp: AST, env: Environment): any {
  switch (exp.type) {
    case "num":
    case "str":
    case "bool":
      return exp.value;
    case "var":
      return env.get(exp.value);
    case "assign":
      if (exp.left.type != "var")
        throw new Error("Cannot assign to " + JSON.stringify(exp.left));
      return env.set(exp.left.value, evaluate(exp.right, env));
    case "binary":
      return apply_op(
        exp.operator,
        evaluate(exp.left, env),
        evaluate(exp.right, env)
      );
    case "lambda":
      return make_lambda(env, exp);
    case "if":
      var cond = evaluate(exp.cond, env);
      if (cond !== false) return evaluate(exp.then, env);
      return exp.else ? evaluate(exp.else, env) : false;
    case "prog":
      var val = false;
      exp.prog.forEach(function (exp) {
        val = evaluate(exp, env);
      });
      return val;
    case "call":
      var func = evaluate(exp.func, env) as Function;
      return func.apply(
        null,
        exp.args.map(function (arg) {
          return evaluate(arg, env);
        })
      );
    case "let":
      exp.vars.forEach(function (v) {
        var scope = env.extend();
        scope.def(v.name, v.def ? evaluate(v.def, env) : false);
        env = scope;
      });
      return evaluate(exp.body, env);
    default:
      throw new Error("I don't know how to evaluate " + exp);
  }
}

function apply_op(op: Operator, a: any, b: any): number | boolean {
  function num(x: any): number {
    if (typeof x != "number") throw new Error("Expected number but got " + x);
    return x;
  }
  function div(x: number): number {
    if (num(x) == 0) throw new Error("Divide by zero");
    return x;
  }

  switch (op) {
    case "+":
      return num(a) + num(b);
    case "-":
      return num(a) - num(b);
    case "*":
      return num(a) * num(b);
    case "/":
      return num(a) / div(b);
    case "%":
      return num(a) % div(b);
    case "&&":
      return a !== false && b;
    case "||":
      return a !== false ? a : b;
    case "<":
      return num(a) < num(b);
    case ">":
      return num(a) > num(b);
    case "<=":
      return num(a) <= num(b);
    case ">=":
      return num(a) >= num(b);
    case "==":
      return a === b;
    case "!=":
      return a !== b;
  }
  throw new Error("Can't apply operator " + op);
}

function make_lambda(env: Environment, exp: LambdaAST) {
  if (exp.name) {
    env = env.extend();
    env.def(exp.name, lambda);
  }

  function lambda() {
    var names = exp.vars;
    var scope = env.extend();
    for (var i = 0; i < names.length; ++i)
      scope.def(names[i], i < arguments.length ? arguments[i] : false);
    return evaluate(exp.body, scope);
  }
  return lambda;
}

export function exec(program: string) {
  const stream = InputStream(program);
  const tokenStream = TokenStream(stream);
  const ast = parse(tokenStream);
  const globalEnv = new Environment();

  globalEnv.def("print", function (txt: string) {
    console.log(txt);
  });

  globalEnv.def("println", function (txt: string) {
    console.log(txt);
  });

  evaluate(ast, globalEnv);
}
