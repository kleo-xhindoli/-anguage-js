import { exec } from "../interpreter";

const program = `
foo = λ(return){
        println("foo");
        return("DONE");
        println("bar");
      };
CallCC(foo);
`;

exec(program, "cps");
