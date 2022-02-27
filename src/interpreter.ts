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
      if (exp.left.type !== "var")
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

function evaluate_cps(
  exp: AST,
  env: Environment,
  callback: (exp_result: any) => void
) {
  switch (exp.type) {
    case "num":
    case "str":
    case "bool":
      callback(exp.value);
      return;
    case "var":
      callback(env.get(exp.value));
      return;
    case "assign":
      const leftAst = exp.left;
      const rightAst = exp.right;

      if (leftAst.type !== "var")
        throw new Error("Cannot assign to " + JSON.stringify(exp.left));

      evaluate_cps(rightAst, env, function (right) {
        callback(env.set(leftAst.value, right));
      });
      return;

    case "binary":
      evaluate_cps(exp.left, env, function (left) {
        evaluate_cps(exp.right, env, function (right) {
          callback(apply_op(exp.operator, left, right));
        });
      });
      return;

    case "let":
      (function loop(env, i) {
        if (i < exp.vars.length) {
          var v = exp.vars[i];
          if (v.def)
            evaluate_cps(v.def, env, function (value) {
              var scope = env.extend();
              scope.def(v.name, value);
              loop(scope, i + 1);
            });
          else {
            var scope = env.extend();
            scope.def(v.name, false);
            loop(scope, i + 1);
          }
        } else {
          evaluate_cps(exp.body, env, callback);
        }
      })(env, 0);
      return;
    case "lambda":
      callback(make_lambda_cps(env, exp));
      return;

    case "if":
      evaluate_cps(exp.cond, env, function (cond) {
        if (cond !== false) evaluate_cps(exp.then, env, callback);
        else if (exp.else) evaluate_cps(exp.else, env, callback);
        else callback(false);
      });
      return;

    case "prog":
      (function loop(last, i) {
        if (i < exp.prog.length)
          evaluate_cps(exp.prog[i], env, function (val) {
            loop(val, i + 1);
          });
        else {
          callback(last);
        }
      })(false, 0);
      return;

    case "call":
      evaluate_cps(exp.func, env, function (func) {
        (function loop(args, i) {
          if (i < exp.args.length)
            evaluate_cps(exp.args[i], env, function (arg) {
              args[i + 1] = arg;
              loop(args, i + 1);
            });
          else {
            func.apply(null, args);
          }
        })([callback], 0);
      });
      return;

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

function make_lambda_cps(env: Environment, exp: LambdaAST) {
  if (exp.name) {
    env = env.extend();
    env.def(exp.name, lambda);
  }
  function lambda(callback: (result: any) => void) {
    var names = exp.vars;
    var scope = env.extend();
    for (var i = 0; i < names.length; ++i)
      scope.def(names[i], i + 1 < arguments.length ? arguments[i + 1] : false);

    evaluate_cps(exp.body, scope, callback);
  }
  return lambda;
}

type ExecMode = "sync" | "cps";

export function exec(program: string, mode: ExecMode = "sync") {
  const stream = InputStream(program);
  const tokenStream = TokenStream(stream);
  const ast = parse(tokenStream);
  const globalEnv = new Environment();

  if (mode === "sync") {
    globalEnv.def("print", function (txt: string) {
      console.log(txt);
    });

    globalEnv.def("println", function (txt: string) {
      console.log(txt);
    });

    globalEnv.def("fibJS", function fibJS(n: number): number {
      if (n < 2) return n;
      return fibJS(n - 1) + fibJS(n - 2);
    });

    globalEnv.def("time", function (fn: Function) {
      var t1 = Date.now();
      var ret = fn();
      var t2 = Date.now();
      console.log("Time: " + (t2 - t1) + "ms");
      return ret;
    });
  } else {
    globalEnv.def("print", function (callback: Function, txt: string) {
      console.log(txt);
      callback(false);
    });

    globalEnv.def("println", function (callback: Function, txt: string) {
      console.log("Callback", callback);
      console.log(txt);
      callback?.(false);
    });

    globalEnv.def("time", function (callback: Function, fn: Function) {
      var t1 = Date.now();
      var ret = fn();
      var t2 = Date.now();
      console.log("Time: " + (t2 - t1) + "ms");
      callback?.(ret);
    });
  }

  mode === "sync"
    ? evaluate(ast, globalEnv)
    : evaluate_cps(ast, globalEnv, (lastResult) => {
        console.log("Result: ", lastResult);
      });
}
