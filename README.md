# MyPi Code Stream

A lightweight, terminal-based AI coding agent built with **TypeScript, Node.js, and streaming LLM APIs**. MyPi accepts natural-language coding tasks, streams model output to your terminal, and can use tools to inspect files and execute shell commands.

> MyPi is an educational coding-agent project focused on understanding provider abstractions, streaming, tool calling, and the agent loop.

## Features

- **CLI workflow** — run one-shot tasks with `mypi -p`.
- **Streaming responses** — display model output incrementally in the terminal.
- **Multiple providers**
  - `groq` — OpenAI-compatible Groq API; default model: `openai/gpt-oss-120b`.
  - `anthropic` — Anthropic SDK provider.
  - `anthropic-openai` — Anthropic API through the OpenAI-compatible provider adapter.
- **Provider abstraction** — use a common interface for streaming across providers.
- **Agent loop** — send model responses, execute requested tools, return tool results to the model, and continue for multiple turns.
- **Built-in tools**
  - `read` — read a text file relative to the current working directory.
  - `bash` — execute a shell command in the current working directory.
- **Usage reporting** — display provider, model, input/output token usage, and stop reason after a model turn.
- **Configurable model** — select a model from the CLI without changing the provider implementation.

## Tech stack

- Node.js
- TypeScript
- `tsx`
- OpenAI SDK (for OpenAI-compatible APIs)
- Anthropic SDK
- Groq SDK dependency
- `dotenv`

## Prerequisites

- Node.js and npm
- An API key for the provider you want to use:
  - Groq: `GROQ_API_KEY`
  - Anthropic: `ANTHROPIC_API_KEY`

You only need to configure the key for the provider you intend to use.

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/Sakshij2810/mypi-code-stream.git
cd mypi-code-stream
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root.

For Groq:

```env
GROQ_API_KEY=your_groq_api_key
```

For Anthropic:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key
```

Do not commit your `.env` file or expose API keys. Keep `.env` in `.gitignore`.

### 4. Link the CLI command (optional)

To use `mypi` as a command from your terminal:

```bash
npm link
```

Run this from the repository root. Alternatively, use the npm script shown below without linking the command.

## Usage

### Run with the default provider (Groq)

```bash
mypi -p "Explain the files in this project"
```

The default provider is `groq`, and its configured default model is `openai/gpt-oss-120b`.

### Choose a provider

```bash
mypi -p "Explain the files in this project" --provider groq
mypi -p "Explain the files in this project" --provider anthropic
mypi -p "Explain the files in this project" --provider anthropic-openai
```

### Choose a model

```bash
mypi -p "Create a simple HTML page" --provider groq --model openai/gpt-oss-120b
```

The model name must be supported by the selected provider.

### Run without linking the CLI

```bash
npm run dev -- -p "Explain the files in this project" --provider groq
```

### Multiline prompts

Use a quoted heredoc to safely pass multiline prompts through the shell. This avoids shell interpreting backticks or other special characters inside the prompt.

```bash
mypi -p "$(cat <<'PROMPT'
Create a small static website using HTML, CSS, and JavaScript.
Put the files in a new folder named sample-app.
Do not modify files outside that folder.
PROMPT
)" --provider groq
```

## How the agent works

At a high level, MyPi follows this tool-use cycle:

```text
User prompt
    |
    v
CLI parses arguments and selects provider/model
    |
    v
Provider streams a response from the LLM
    |
    v
Does the assistant request a tool?
    |
    +---- No ----> Print final response and finish
    |
    +---- Yes
           |
           v
     Agent finds and executes the requested tool
           |
           v
     Tool result is added to conversation history
           |
           v
     Send updated conversation to the model
           |
           v
        Repeat until finished or turn limit is reached
```

The provider adapter translates provider-specific streaming chunks into common events. The agent loop consumes those events, executes tool calls, and appends tool results to the message history.

## Built-in tools

| Tool   | Description                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| `read` | Reads a text file using a path relative to the current working directory.                                                 |
| `bash` | Runs a Bash command with the current working directory as its working directory. Returns command output and an exit code. |

The Bash tool has a default timeout of 30 seconds and truncates long output. The agent loop defaults to a maximum of 20 model turns.

## Project structure

```text
mypi-code-stream/
├── bin/
│   └── mypi.js                 # CLI executable entry point
├── notes/                      # Learning notes
├── src/
│   ├── agent/
│   │   └── loop.ts              # Multi-turn agent/tool execution loop
│   ├── providers/
│   │   ├── index.ts             # Provider registry and factory
│   │   ├── anthropic.ts         # Anthropic provider adapter
│   │   └── openai-compat.ts     # OpenAI-compatible provider adapter
│   ├── tools/
│   │   ├── index.ts             # Built-in tool registry
│   │   ├── read.ts              # File-reading tool
│   │   └── bash.ts              # Shell-execution tool
│   ├── main.ts                  # CLI setup and application entry point
│   └── types.ts                 # Shared provider, message, tool, and event types
├── .env                         # Local API keys (create this yourself)
├── package.json
├── package-lock.json
└── tsconfig.json
```

## Important safety notes

- The `bash` tool executes commands on your machine with the permissions of the current user. Only run prompts and tool calls you trust.
- Run MyPi from the project/workspace directory you want it to work in. Its tools use `process.cwd()` as the working directory.
- The `read` tool resolves paths from the current working directory; path resolution alone is not a security sandbox.
- Use a disposable test directory when experimenting with file creation or shell commands.
- Never paste API keys into prompts, source files, or public repositories.

## Troubleshooting

### `mypi: command not found`

Run `npm link` from the repository root, or use:

```bash
npm run dev -- -p "Your prompt" --provider groq
```

### Missing API key

Check that the correct key is present in the root `.env` file and that the selected provider matches the key:

- `groq` requires `GROQ_API_KEY`.
- `anthropic` and `anthropic-openai` require `ANTHROPIC_API_KEY`.

### Groq rate limit / TPM error

Groq enforces rate limits, including tokens per minute. Large prompts, tool definitions, and accumulated conversation/tool results can make a request exceed the available limit. Try a smaller task, reduce unnecessary tool output, or retry after the rate-limit window resets.

### Tool-call parsing error

A provider may return malformed or incomplete tool-call arguments. This can happen while streaming tool-call data. Inspect the provider adapter's tool-call argument assembly and JSON parsing, and handle parsing errors so the CLI can report them without an unhandled crash.

## Current scope

MyPi is an evolving learning project. The current built-in toolset is intentionally small (`read` and `bash`). Features such as dedicated write/edit tools, browser-based UI verification, persistent sessions, automatic context compaction, and sandboxed command execution are not documented as implemented in this version.

## License

This repository currently declares the **ISC** license in `package.json`.

## use following prompt for testing

mypi -p "$(cat <<'PROMPT'
Create a complete To-Do application using only HTML, CSS and vanilla JavaScript.

Create a separate folder named to-do-app inside the current working directory.

Create three files inside it:

- index.html
- style.css
- script.js

Features:

- Add, delete and complete tasks.
- Filter by All, Active and Completed.
- Persist tasks using localStorage.
- Display total, completed and remaining task counts.

Design a clean, futuristic, premium dark UI with subtle gradients,
glassmorphism, glowing accents, smooth animations and responsive layout.

Write clean code, implement everything and verify functionality.
Do not modify existing project files.
Actually create the application, do not just explain it.
PROMPT
)" --provider groq
