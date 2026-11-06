# Stage 1 vs Stage 2: Why Are There Two `for await...of` Loops?

A quick reference for understanding streaming and the multi-provider
architecture in the CLI project.

## The confusion

In Stage 1, the code had one loop:

``` ts
for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || "";
  process.stdout.write(content);
}
```

In Stage 2, there are two loops:

1.  One inside `createOpenAICompat()` (or `createAnthropic()`).
2.  Another inside `main.ts`, consuming `provider.stream(...)`.

**Are we processing the same chunks twice? No. Each loop has a different
responsibility.**

------------------------------------------------------------------------

## 1. Stage 1: Direct SDK integration

``` ts
const stream = await client.chat.completions.create({
  model,
  messages,
  stream: true,
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || "";
  process.stdout.write(content);
}
```

Flow:

``` text
Your CLI
   |
   v
Groq SDK stream (raw provider chunks)
   |
   v
for await (const chunk of stream)
   |
   v
Extract text and print it
   |
   v
Terminal
```

The CLI directly understands Groq's response format. It both extracts
the text and decides what to do with it.

## 2. Stage 2: Multi-provider architecture

Stage 2 introduces a common interface:

``` ts
export interface Provider {
  name: string;
  defaultModel: string;
  stream(opts: StreamOptions): AsyncIterable<StreamEvent>;
}
```

The important idea: **every provider adapter must expose a stream in the
same format**, even if the providers' original SDK responses are
different.

Your common events are:

``` ts
export type StreamEvent =
  | { type: "text_delta"; delta: string }
  | { type: "done"; message: AssistantMessage };
```

For example, Groq/OpenAI-compatible SDK chunks and Anthropic events have
different shapes. The adapter hides those differences from `main.ts`.

## 3. Loop 1: Inside the provider adapter

Example from `createOpenAICompat()`:

``` ts
async *stream({ messages, model, system }) {
  const stream = await client.chat.completions.create({
    model,
    messages: chat,
    stream: true,
    stream_options: { include_usage: true },
  });

  for await (const chunk of stream) {
    const choice = chunk.choices[0];

    if (choice?.delta?.content) {
      yield {
        type: "text_delta",
        delta: choice.delta.content,
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
}
```

**Responsibility: consume raw provider chunks and convert them into your
application's common event format.**

-   Receives raw SDK chunks.
-   Extracts newly generated text.
-   Collects usage and stop-reason information.
-   Uses `yield` to expose standardized events to the caller.

It does not print to the terminal.

## 4. Loop 2: Inside `main.ts`

``` ts
for await (const event of provider.stream({ messages, model })) {
  if (event.type === "text_delta") {
    process.stdout.write(event.delta);
  } else {
    const { usage, stopReason } = event.message;
    console.log(usage, stopReason);
  }
}
```

**Responsibility: consume standardized events and decide what the
application should do with them.**

-   Receives `text_delta` events and prints their text.
-   Receives the final `done` event and prints metadata.
-   Does not need to know whether the provider is Groq or Anthropic.

## 5. The missing concept: `async *` and `yield`

An `async function*` is an **async generator**.

-   `for await...of` consumes values from an asynchronous iterable.
-   `yield` produces a value from a generator for its consumer.
-   `provider.stream(...)` returns an async iterable because `stream` is
    an async generator.

Think of the adapter as a translator:

``` text
Raw SDK stream
     |
     v
Adapter's for await...of
     |
     v
yield { type: "text_delta", delta: "Hello" }
     |
     v
main.ts's for await...of
     |
     v
process.stdout.write("Hello")
```

The outer loop receives the values yielded by the inner async generator.
It does not independently request the same provider chunks again.

## 6. Dry run

Suppose the provider SDK emits these raw text chunks:

``` text
"Hello"
" there"
" Sakshi"
```

The adapter consumes each raw chunk and yields:

  ------------------------------------------------------------------------------------
  Adapter receives        Adapter yields                       `main.ts` does
  ----------------------- ------------------------------------ -----------------------
  `"Hello"`               `text_delta: "Hello"`                Prints `"Hello"`

  `" there"`              `text_delta: " there"`               Prints `" there"`

  `" Sakshi"`             `text_delta: " Sakshi"`              Prints `" Sakshi"`

  Stream finishes         `done: { usage, stopReason, ... }`   Prints final metadata
  ------------------------------------------------------------------------------------

There is no duplicate API request and no duplicate processing of each
raw chunk. The adapter transforms each incoming chunk into an event; the
CLI consumes that event.

## 7. Why Stage 2 is better

Without an adapter, `main.ts` would need provider-specific logic:

``` ts
if (providerName === "groq") {
  // Understand Groq/OpenAI-compatible chunks
}

if (providerName === "anthropic") {
  // Understand Anthropic events
}
```

As more providers are added, this becomes harder to maintain.

With the adapter architecture:

``` ts
const provider = getProvider(providerName);

for await (const event of provider.stream({ messages, model })) {
  if (event.type === "text_delta") {
    process.stdout.write(event.delta);
  }
}
```

The CLI stays the same. Each provider adapter handles its own SDK format
and converts it into the shared `StreamEvent` format.

**The benefit is separation of responsibilities and extensibility---not
fewer loops or necessarily faster streaming.**

## 8. Important Anthropic adapter fix

Do not yield the entire accumulated text for every event:

``` ts
// Incorrect: sends all text received so far
text += event.delta.text;
yield { type: "text_delta", delta: text };
```

Why is this incorrect?

If the provider sends `"Hello"`, `" there"`, and `" Sakshi"`, the
adapter yields:

``` text
"Hello"
"Hello there"
"Hello there Sakshi"
```

Then `main.ts` prints all three values, duplicating earlier text.

Instead, accumulate the full response for the final message, but yield
only the new delta:

``` ts
text += event.delta.text;

yield {
  type: "text_delta",
  delta: event.delta.text,
};
```

Now the CLI prints:

``` text
Hello there Sakshi
```

## 9. Quick revision / interview answer

**Why are there two `for await...of` loops in Stage 2?**

The first loop is inside the provider adapter. It consumes
provider-specific SDK chunks, extracts text and metadata, and converts
them into a common event format using `yield`.

The second loop is in the main application. It consumes those
standardized events and decides what to do with them, such as printing
text or displaying usage information.

They are not duplicate loops: one handles provider-specific data
transformation, while the other handles application-level consumption.
This abstraction allows the CLI to work with multiple providers without
knowing their individual streaming response formats.

------------------------------------------------------------------------

## Remember this in one line

**Inner loop = SDK stream → common events.**

**Outer loop = common events → application output.**

Stage 1 combined both responsibilities in one place. Stage 2 separates
them so new providers can be added without changing the CLI.
