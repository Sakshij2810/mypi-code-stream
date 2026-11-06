import Anthropic from "@anthropic-ai/sdk";
import { Provider, StopReason } from "../types.ts";

export function createAnthropic(): Provider {
  const client = new Anthropic();

  return {
    name: "anthropic",
    defaultModel: "claude-sonnet-5",
    async *stream({ messages, model, system }) {
      // 1. create stream
      const stream = client.messages.stream({
        max_tokens: 4096,
        model,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      // 2. save conversation inside text
      let text = "";

      // 3. loop on event and add its result in text and yield that text
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          text += event.delta.text;

          yield { type: "text_delta", delta: event.delta.text };
        }
      }

      // 4. get final and stopReason to create "done" yield
      const final = await stream.finalMessage();
      const stopReason = final.stop_reason === "max_tokens" ? "length" : "stop";

      yield {
        type: "done",
        message: {
          role: "assistant",
          content: text,
          usage: {
            input: final.usage.input_tokens,
            output: final.usage.output_tokens,
          },
          stopReason,
        },
      };
    },
  };
}
