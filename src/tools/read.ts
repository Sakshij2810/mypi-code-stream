import { readFile } from "node:fs/promises";
import { resolve } from "node:path"; // built-in Node.js module that provides functions to work with filesystem paths.

import { Tool } from "../types.ts";

export const readTool: Tool = {
  name: "read",
  description: "Read a text file and returns its contents",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file, relative to the current folder",
      },
    },
    required: ["path"],
  },
  async execute(args) {
    return readFile(resolve(process.cwd(), String(args.path)), "utf8");
  },
};

/* 
1. console.log(process.cwd()); //  output --> /Users/sakshi/Desktop/my-project (cwd: Current Working Directory.) 
                                          --> process.cwd() tells us the directory from which the Node.js process is currently running.

2. resolve( "/Users/sakshi/Desktop/my-project", "src/main.ts"); // output --> /Users/sakshi/Desktop/my-project/src/main.ts 
                                                                          --> resolve() takes multiple path segments and combines them into an absolute path.

*/
