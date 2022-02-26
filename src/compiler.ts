import InputStream from "./input-stream";
import parse from "./parser";
import TokenStream from "./token-stream";

export function exec(program: string) {
  const stream = InputStream(program);
  const tokenStream = TokenStream(stream);
  const ast = parse(tokenStream);

  console.log(JSON.stringify(ast, null, 3));
}
