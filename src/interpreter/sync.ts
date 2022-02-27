import { AST, LambdaAST } from "../ast";
import Environment from "./shared/environment";
import { applyOp } from "./shared/utils";

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
      return applyOp(
        exp.operator,
        evaluate(exp.left, env),
        evaluate(exp.right, env)
      );
    case "lambda":
      return makeLambda(env, exp);
    case "if":
      const cond = evaluate(exp.cond, env);
      if (cond !== false) return evaluate(exp.then, env);
      return exp.else ? evaluate(exp.else, env) : false;
    case "prog":
      let val = false;
      exp.prog.forEach(function (exp) {
        val = evaluate(exp, env);
      });
      return val;
    case "call":
      const func = evaluate(exp.func, env) as Function;
      return func.apply(
        null,
        exp.args.map(function (arg) {
          return evaluate(arg, env);
        })
      );
    case "let":
      exp.vars.forEach(function (v) {
        const scope = env.extend();
        scope.def(v.name, v.def ? evaluate(v.def, env) : false);
        env = scope;
      });
      return evaluate(exp.body, env);
    default:
      throw new Error("I don't know how to evaluate " + exp);
  }
}

function makeLambda(env: Environment, exp: LambdaAST) {
  if (exp.name) {
    env = env.extend();
    env.def(exp.name, lambda);
  }

  function lambda() {
    const names = exp.vars;
    const scope = env.extend();
    for (let i = 0; i < names.length; ++i)
      scope.def(names[i], i < arguments.length ? arguments[i] : false);
    return evaluate(exp.body, scope);
  }
  return lambda;
}

export default function exec(ast: AST, globalEnv: Environment) {
  setGlobals(globalEnv);
  evaluate(ast, globalEnv);
}

function setGlobals(globalEnv: Environment) {
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
    const t1 = Date.now();
    const ret = fn();
    const t2 = Date.now();
    console.log("Time: " + (t2 - t1) + "ms");
    return ret;
  });

  globalEnv.def("halt", function () {
    // In sync mode the only way to stop the program
    // is to throw an error.
    throw new Error("Program halted");
  });

  globalEnv.def("sleep", function (milliseconds: number) {
    throw new Error("sleep function does not work in `sync` mode.");
  });
}
