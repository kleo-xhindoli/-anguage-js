import { exec } from "../interpreter";

const program = `
  # this is a comment

  println("Hello World!");

  println(2 + 3 * 4);
`;

exec(program);
