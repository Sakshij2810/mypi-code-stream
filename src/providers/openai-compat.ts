import OpenAI from "openai";
import {
  ContentBlock,
  Message,
  Provider,
  StopReason,
  Usage,
} from "../types.ts";

// stage 3 : toOpenAI
function toOpenAI(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
  return messages.map((m): OpenAI.ChatCompletionMessageParam => {
    if (m.role === "user") {
      return { role: "user", content: m.content };
    }

    if (m.role === "assistant") {
      const text = m.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join(" ");

      const calls = m.content.filter((block) => block.type === "toolCall");

      return {
        role: "assistant",
        content: text || null,

        // OpenAi wants the arguments as a JSON *string
        tool_calls: calls.length
          ? calls.map((c) => ({
              id: c.id,
              type: "function" as const,
              function: {
                name: c.name,
                arguments: JSON.stringify(c.arguments),
              },
            }))
          : undefined,
      };
    }

    // toolResult -> its own message with role = "tool"
    return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
  });
}

// 1. get name, baseURL, apiKey, defaultModel to create compat
export function createOpenAICompat(
  name: string,
  baseURL: string,
  apiKey: string,
  defaultModel: string,
): Provider {
  // 2. initialise client using baseURL, apiKey
  const client = new OpenAI({ baseURL, apiKey });

  return {
    name,
    defaultModel,
    async *stream({ messages, model, system, tools = [] }) {
      // 3.1 stage 1 & 2 =>  pre define chat using messages
      // const chat: OpenAI.ChatCompletionMessageParam[] = messages.map((m) => ({
      //   role: m.role,
      //   content: m.content,
      // }));

      // 3.2 stage 3 =>  pre define chat using messages
      const chat: OpenAI.ChatCompletionMessageParam[] = toOpenAI(messages);

      // 4. create stream
      const stream = await client.chat.completions.create({
        max_tokens: 4096,
        model,
        stream: true,
        stream_options: { include_usage: true }, // usage come in the last chunk
        messages: system
          ? [{ role: "system", content: system }, ...chat]
          : chat,

        tools: tools.length // stage 3 addition
          ? tools.map((t) => ({
              type: "function" as const,
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              },
            }))
          : undefined,
      });

      // 5. generate text, usage, stopReason from chunk by looping on stream
      let text = "";
      const calls: { id: string; name: string; args: string }[] = []; // slot = tool_calls[].index

      let usage: Usage = { input: 0, output: 0 };
      let stopReason: StopReason = "stop";

      // 6.1  stage 1 & 2 : loop on chunk and add its result in text and yield that text
      // for await (const chunk of stream) {
      //   const choice = chunk.choices[0];

      //   if (choice?.delta?.content) {
      //     text += choice.delta.content;
      //     yield { type: "text_delta", delta: choice.delta.content };
      //   }

      //   if (choice?.finish_reason === "length") {
      //     stopReason = "length";
      //   }

      //   if (chunk.usage) {
      //     usage = {
      //       input: chunk.usage.prompt_tokens,
      //       output: chunk.usage.completion_tokens,
      //     };
      //   }
      // }

      // 6.2 stage 3 : loop on event and add its result in text and yield that text
      for await (const chunk of stream) {
        const choice = chunk.choices[0];

        // 1. text
        if (choice?.delta?.content) {
          text += choice.delta.content;
          yield { type: "text_delta", delta: choice.delta.content };
        }

        // 2. tool_calls
        for (const tc of choice?.delta?.tool_calls ?? []) {
          // the first piece of a call that brings id + name, later pieces only bring more arguments
          calls[tc.index] ??= {
            id: tc.id ?? `call_${tc.index}`,
            name: tc.function?.name ?? "",
            args: "",
          };

          calls[tc.index].args += tc.function?.arguments ?? "";
        }

        // 3. finish_reason & usage
        if (choice?.finish_reason === "tool_calls") stopReason = "toolUse";
        if (choice?.finish_reason === "length") stopReason = "length";

        if (chunk.usage)
          usage = {
            input: chunk.usage.prompt_tokens,
            output: chunk.usage.completion_tokens,
          };
      }

      // stage 3 additions -> create content for text and calls
      const content: ContentBlock[] = text ? [{ type: "text", text }] : [];

      for (const c of calls) {
        if (c) {
          content.push({
            type: "toolCall",
            id: c.id,
            name: c.name,
            arguments: c.args ? JSON.parse(c.args) : {},
          });
        }
      }

      if (content.some((block) => block.type === "toolCall")) {
        stopReason = "toolUse";
      }

      // 7. lastly yeild done result
      yield {
        type: "done",
        message: {
          role: "assistant",
          // content: text, // stage 1 & 2
          content,
          usage,
          stopReason,
        },
      };
    },
  };
}
