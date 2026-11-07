import Anthropic from "@anthropic-ai/sdk";
import { ContentBlock, Message, Provider, StopReason } from "../types.ts";

// stage 3 : toAnthropic
function toAnthropic(messages: Message[]): Anthropic.MessageParam[] {
  return messages.map((m): Anthropic.MessageParam => {
    if (m.role === "user") return { role: "user", content: m.content };

    if (m.role === "assistant") {
      return {
        role: "assistant",
        content: m.content.map(
          (b): Anthropic.ContentBlockParam =>
            b.type === "text"
              ? { type: "text", text: b.text }
              : {
                  type: "tool_use",
                  id: b.id,
                  name: b.name,
                  input: b.arguments,
                },
        ),
      };
    }

    // toolResult -> Anthropic wants it inside a USER message
    return {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: m.toolCallId,
          content: m.content,
          is_error: m.isError,
        },
      ],
    };
  });
}

export function createAnthropic(): Provider {
  const client = new Anthropic();

  return {
    name: "anthropic",
    defaultModel: "claude-sonnet-5",
    async *stream({ messages, model, system, tools = [] }) {
      // 1. create stream
      const stream = client.messages.stream({
        max_tokens: 4096,
        model,
        system,
        // messages: messages.map((m) => ({ role: m.role, content: m.content })), // used for stage 1 & 2
        messages: toAnthropic(messages),
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters as Anthropic.Tool.InputSchema,
        })),
      });

      // 2. save conversation inside text
      let text = "";

      // stage 3 additions
      let json = "";
      const content: ContentBlock[] = [];

      // 3.1  stage 1 & 2 : loop on event and add its result in text and yield that text
      // for await (const event of stream) {
      //   if (
      //     event.type === "content_block_delta" &&
      //     event.delta.type === "text_delta"
      //   ) {
      //     text += event.delta.text;

      //     yield { type: "text_delta", delta: event.delta.text };
      //   }
      // }

      // 3.2 stage 3 : loop on event and add its result in text and yield that text
      for await (const event of stream) {
        // 1. content_block_start
        if (event.type === "content_block_start") {
          const block = event.content_block;

          if (block.type === "text") {
            content.push({ type: "text", text: "" });
          } else if (block.type === "tool_use") {
            content.push({
              type: "toolCall",
              id: block.id,
              name: block.name,
              arguments: {},
            });

            json = "";
          }
        }

        // 2. content_block_delta
        else if (event.type === "content_block_delta") {
          const block = content.at(-1);

          if (event.delta.type === "text_delta" && block?.type === "text") {
            block.text += event.delta.text;
            yield { type: "text_delta", delta: event.delta.text };
          } else if (event.delta.type === "input_json_delta") {
            json += event.delta.partial_json;
          }
        }

        // 3. content_block_stop
        else if (event.type === "content_block_stop") {
          const block = content.at(-1);

          if (block?.type === "toolCall") {
            block.arguments = json ? JSON.parse(json) : {};
          }
        }
      }

      // 4. get final and stopReason to create "done" yield
      const final = await stream.finalMessage();
      // const stopReason = final.stop_reason === "max_tokens" ? "length" : "stop"; // used in stage 1 & 2
      const stopReason =
        final.stop_reason === "tool_use"
          ? "toolUse"
          : final.stop_reason === "max_tokens"
            ? "length"
            : "stop";

      yield {
        type: "done",
        message: {
          role: "assistant",
          // content: text,  // used in stage 1 & 2
          content,
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
