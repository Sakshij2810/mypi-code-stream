import { config } from "dotenv";
import { fileURLToPath } from "node:url"; // It converts a file URL into a normal filesystem path
import { parseArgs } from "node:util";

/* ------------------------------------------------------ Anthropic SDK : code ------------------------------------------------------ */

// import Anthropic from "@anthropic-ai/sdk";

// /* load the .env next to the code, so mypi works from any folder

//  1. import.meta.url :  tells us where the current file is located, not where we executed the terminal command.

//  2. new URL("../.env", import.meta.url) : This is a JavaScript URL constructor ->

//                                           " new URL(relativePath, baseURL);" ->

//                                           1. relativePath: Where we want to go.
//                                           2. baseURL: Where we are starting from.

//                                             We start here: my-project/src/main.ts

//                                             Then navigate:
//                                             ../       → Go one directory up (my-project/)
//                                             .env      → Find .env

//                                             Result:
//                                             file:///Users/sakshi/my-project/.env

// 3. fileURLToPath(new URL("../.env", import.meta.url)) : Remember, new URL() returns a URL object. But dotenv expects a filesystem path for its path option.

//                                                         So we convert -> file:///Users/sakshi/my-project/.env
//                                                         Into -> /Users/sakshi/my-project/.env

//                                                         That's exactly what fileURLToPath() does.

// 4. quite : Suppresses dotenv's informational logging. It doesn't suppress errors from your application or make environment variables private.
// */
// config({
//   path: fileURLToPath(new URL("../.env", import.meta.url)),
//   quiet: true,
// });

// /* parseArgs() :  is a built-in Node.js utility that helps us read command-line arguments passed by the user. */
// const { values } = parseArgs({
//   options: {
//     prompt: { type: "string", short: "p" },
//     model: { type: "string", default: "claude-sonnet-5" },
//   },
// });

// if (!values.prompt) {
//   console.error("No prompt found");
//   process.exit(1);
// }

// /*
// When you create an Anthropic client without passing configuration, the SDK automatically looks for an environment variable named: ANTHROPIC_API_KEY
// */
// const client = new Anthropic();

// const message = await client.messages.create({
//   max_tokens: 1024,
//   messages: [{ content: values.prompt, role: "user" }],
//   model: values.model,
// });

// console.log(message);

/* ------------------------------------------------------ Groq SDK : code ------------------------------------------------------ */

import Groq from "groq-sdk";

// 1. Load environment variables
config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});

// 2. Parse CLI arguments
const { values } = parseArgs({
  options: {
    prompt: { type: "string", short: "p" },
    model: { type: "string", default: "openai/gpt-oss-120b" },

    // model: { type: "string", default: "llama-3.3-70b-versatile" }, // deprecated
    // model: { type: "string", default: "qwen/qwen3.6-27b" }, // deprecated
  },
});

// 3. Validate prompt
if (!values.prompt) {
  console.error("No prompt found");
  process.exit(1);
}

// 4. Initialize Groq client
const client = new Groq();

// 5. Generate response
const message = await client.chat.completions.create({
  max_tokens: 1024,
  messages: [
    {
      content: values.prompt,
      role: "user",
    },
  ],
  model: values.model,
});

// 6. Print AI response
console.log(message.choices[0].message.content);
console.log(message);
