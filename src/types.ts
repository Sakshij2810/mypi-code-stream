export type Usage = { input: number; output: number };
export type StopReason = "stop" | "length" | "toolUse";

export type UserMessage = { role: "user"; content: string };
export type AssistantMessage = {
  role: "assistant";
  // content: string; // this was used in stage 1 & 2
  content: ContentBlock[];
  usage: Usage;
  stopReason: StopReason;
};

// export type Message = UserMessage | AssistantMessage;  // this was used in stage 1 & 2
export type Message = UserMessage | AssistantMessage | ToolResultMessage;

export type StreamEvent =
  | { type: "text_delta"; delta: string }
  | { type: "done"; message: AssistantMessage };

export type StreamOptions = {
  messages: Message[];
  model: string;
  system?: string;
  tools?: ToolSpec[]; // this was added in stage 3
};

export interface Provider {
  name: string;
  defaultModel: string;
  stream(opts: StreamOptions): AsyncIterable<StreamEvent>;
}

// ------------------------------------------------------- stage 3: toolCalling types -------------------------------------------------------

export type TextBlock = { type: "text"; text: string };

export type ToolCallBlock = {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type ContentBlock = TextBlock | ToolCallBlock;

export type ToolResultMessage = {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: string;
  isError: boolean;
};

export type ToolSpec = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type Tool = ToolSpec & {
  execute(args: Record<string, unknown>): Promise<string>;
};
