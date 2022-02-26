import { exec } from "../interpreter";

const program = `sum = lambda(x, y) x + y; println(sum(2, 3));`;

exec(program);
