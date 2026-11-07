import { config } from "dotenv";
import { fileURLToPath } from "node:url"; // It converts a file URL into a normal filesystem path
import { parseArgs } from "node:util";
import { getProvider } from "./providers/index.ts";
import { AssistantMessage, Message } from "./types.ts";

import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";
import { readTool } from "./tools/read.ts";

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

// 1. Load environment variables
config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});

// 2. Parse CLI arguments
/* parseArgs() :  is a built-in Node.js utility that helps us read command-line arguments passed by the user. */

// stage 1 -> Anthropic SDK parseArgs
/*
const { values } = parseArgs({
  options: {
    prompt: { type: "string", short: "p" },
    model: { type: "string", default: "claude-sonnet-5" },
  },
});
 */

// stage 1 -> Groq SDK parseArgs
/*
const { values } = parseArgs({
  options: {
    prompt: { type: "string", short: "p" },
    model: { type: "string", default: "openai/gpt-oss-120b" }, // llama-3.3-70b-versatile | qwen/qwen3.6-27b"  are deprecated
  },
});
 */

// stage 2+ -> parseArgs
const { values } = parseArgs({
  options: {
    prompt: { type: "string", short: "p" },
    provider: { type: "string", default: "groq" },
    model: { type: "string" },
  },
});

// 3. Validate prompt
if (!values.prompt) {
  console.error(
    `Prompt is missing, expected command ->  mypi -p "prompt" --provider antropic OR groq`,
  );
  process.exit(1);
}

// only for stage 2+ ->
// 4. Use providers to Initialize Groq client & Generating response
const provider = getProvider(values.provider);
const model = values.model ?? provider.defaultModel;
const messages: Message[] = [{ role: "user", content: values.prompt }];

/* ------------------------------------------------------ stage 1 -> Anthropic SDK : code ------------------------------------------------------ */
// // 4. Initialize Anthropic client
// /*
// When you create an Anthropic client without passing configuration, the SDK automatically looks for an environment variable named: ANTHROPIC_API_KEY
// */
// const client = new Anthropic();

// // // 5.1. Generate response - without stream
// // const message = await client.messages.create({
// //   max_tokens: 1024,
// //   messages: [{ content: values.prompt, role: "user" }],
// //   model: values.model,
// // });

// // 6.1 : print AI response
// console.log(message);

// // 5.2. Generate response - using stream
// const stream = client.messages.stream({
//   max_tokens: 1024,
//   messages: [{ content: values.prompt, role: "user" }],
//   model: values.model,
// });

// // 6.2 loop over all events present in stream and print AI response
// for await (const event of stream) {
//   // process.stdout.write(event.type);

//   if (
//     event.type === "content_block_delta" &&
//     event.delta.type === "text_delta"
//   ) {
//     process.stdout.write(event.delta.text);
//   }
// }

/* ------------------------------------------------------ stage 1 -> Groq SDK : code ------------------------------------------------------ */
// // 4. Initialize Groq client
// const client = new Groq();

// // // 5.1. Generate response - without stream
// // const message = await client.chat.completions.create({
// //   max_tokens: 1024,
// //   messages: [
// //     {
// //       content: values.prompt,
// //       role: "user",
// //     },
// //   ],
// //   model: values.model,
// // });

// // // 6.1 Print AI response
// // console.log(message.choices[0].message.content);
// // console.log(message);

// // 5.2. Generate response - using stream
// const stream = await client.chat.completions.create({
//   max_tokens: 1024,
//   messages: [{ content: values.prompt, role: "user" }],
//   model: values.model,
//   stream: true,
// });

// // 6.2 loop over all chunks present in stream and print AI response
// for await (const chunk of stream) {
//   const content = chunk.choices[0]?.delta?.content || "";

//   process.stdout.write(content);
// }

// /*
// - console.log() → Print something and move to the next line.
// - process.stdout.write() → Print something exactly where the cursor currently is.

// Interview takeaway: We use process.stdout.write() in LLM streaming because the API sends response chunks incrementally,
// and we want to concatenate those chunks directly in the terminal without introducing unwanted line breaks.
//  */

/* ------------------------------------------------------ stage 2 -> OpenAI compat : Multi providers functionality ------------------------------------------------------ */
// // 6. Print AI response
// for await (const event of provider.stream({ messages, model })) {
//   if (event.type === "text_delta") {
//     process.stdout.write(event.delta);
//   } else {
//     const { usage, stopReason } = event.message;
//     console.log(
//       `\n\n ${provider.name} ... ${model} ... ${usage.input} ... ${usage.output} ... ${stopReason}`,
//     );
//   }
// }

/* ------------------------------------------------------ stage 3 -> Tools + OpenAI compat : Multi providers functionality ------------------------------------------------------ */

const tools = [readTool];

async function callModel(): Promise<AssistantMessage> {
  for await (const event of provider.stream({ messages, model, tools })) {
    if (event.type === "text_delta") {
      process.stdout.write(event.delta);
    } else {
      const { usage, stopReason } = event.message;

      console.log(
        `\n\n ${provider.name} ... ${model} ... ${usage.input} ... ${usage.output} ... ${stopReason}`,
      );

      return event.message;
    }
  }

  throw new Error("Stream ended without a done event.");
}

const first = await callModel();
messages.push(first);
// console.log(`#################### ${first.stopReason}`);

if (first.stopReason === "toolUse") {
  for (const block of first.content) {
    if (block.type !== "toolCall") continue;
    console.log(`-> ${block.name} (${JSON.stringify(block.arguments)})`);

    const result = await readTool.execute(block.arguments);

    messages.push({
      role: "toolResult",
      content: result,
      toolCallId: block.id,
      toolName: block.name,
      isError: false,
    });

    // round 2: the model sees the tool result and answers
    messages.push(await callModel());
  }
}
