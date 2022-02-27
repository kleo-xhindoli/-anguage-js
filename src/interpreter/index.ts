import InputStream from "../input-stream";
import parse from "../parser";
import TokenStream from "../token-stream";
import Environment from "./shared/environment";
import exec_sync from "./sync";
import exec_cps from "./cps";

type ExecMode = "sync" | "cps";

export function exec(program: string, mode: ExecMode = "sync") {
  const stream = InputStream(program);
  const tokenStream = TokenStream(stream);
  const ast = parse(tokenStream);
  const globalEnv = new Environment();

  mode === "cps" ? exec_cps(ast, globalEnv) : exec_sync(ast, globalEnv);
}
