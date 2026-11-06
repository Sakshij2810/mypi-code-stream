import OpenAI from "openai";
import { Provider, StopReason, Usage } from "../types.ts";

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
    async *stream({ messages, model, system }) {
      // 3. pre define chat using messages
      const chat: OpenAI.ChatCompletionMessageParam[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // 4. create stream
      const stream = await client.chat.completions.create({
        max_tokens: 4096,
        model,
        stream: true,
        stream_options: { include_usage: true }, // usage come in the last chunk
        messages: system
          ? [{ role: "system", content: system }, ...chat]
          : chat,
      });

      // 5. generate text, usage, stopReason from chunk by looping on stream
      let text = "";
      let usage: Usage = { input: 0, output: 0 };
      let stopReason: StopReason = "stop";

      for await (const chunk of stream) {
        const choice = chunk.choices[0];

        if (choice?.delta?.content) {
          text += choice.delta.content;
          yield { type: "text_delta", delta: choice.delta.content };
        }

        if (choice?.finish_reason === "length") {
          stopReason = "length";
        }

        if (chunk.usage) {
          usage = {
            input: chunk.usage.prompt_tokens,
            output: chunk.usage.completion_tokens,
          };
        }
      }

      yield {
        type: "done",
        message: {
          role: "assistant",
          content: text,
          usage,
          stopReason,
        },
      };
    },
  };
}
