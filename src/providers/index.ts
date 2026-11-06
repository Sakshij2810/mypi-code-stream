import { Provider } from "../types.ts";
import { createAnthropic } from "./anthropic.ts";
import { createOpenAICompat } from "./openai-compat.ts";

const providers: Record<string, () => Provider> = {
  anthropic: createAnthropic,

  "anthropic-openai": () =>
    createOpenAICompat(
      "anthropic",
      "https://api.anthropic.com/v1/",
      process.env.ANTHROPIC_API_KEY!,
      "claude-sonnet-5",
    ),

  groq: () =>
    createOpenAICompat(
      "groq",
      "https://api.groq.com/openai/v1",
      process.env.GROQ_API_KEY!,
      "openai/gpt-oss-120b",
    ),
};

export function getProvider(name: string): Provider {
  const create = providers[name];

  if (!create) {
    throw new Error("there's an issue in index.ts");
  }

  return create();
}
