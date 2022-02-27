import InputStream from "../input-stream";
import parse from "../parser";
import TokenStream from "../token-stream";
import Environment from "./shared/environment";
import evaluate_sync, { set_globals as set_globals_sync } from "./sync";
import evaluate_cps, { set_globals as set_globals_cps } from "./cps";

type ExecMode = "sync" | "cps";

export function exec(program: string, mode: ExecMode = "sync") {
  const stream = InputStream(program);
  const tokenStream = TokenStream(stream);
  const ast = parse(tokenStream);
  const globalEnv = new Environment();

  switch (mode) {
    case "sync": {
      set_globals_sync(globalEnv);
      evaluate_sync(ast, globalEnv);
      return;
    }
    case "cps": {
      set_globals_cps(globalEnv);
      evaluate_cps(ast, globalEnv, (res) => {
        console.log(res);
      });
    }
  }
}
