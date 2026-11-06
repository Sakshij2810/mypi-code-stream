import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = 3000;

app.get("/", (req, res) => {
  res.send("hello from SSE app");
});

/*
1. Backend uses res.write() to send events.
2. Frontend uses EventSource to receive events.
3. \n\n separates individual SSE events.

SSE => 

HTTP-based communication mechanism  -> Used between server and client -> Keeps an HTTP response open -> Transmits events over a network -> Works across network-connected applications
 */
app.get("/stream", (req, res) => {
  // 1. Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // 2. Send events
  let count = 1;

  const interval = setInterval(() => {
    res.write(`data: Message ${count} \n\n`);

    count++;

    if (count > 10) {
      clearInterval(interval);
      res.end();
    }
  }, 1000);

  // 3. Clean up when client disconnects
  res.on("close", () => {
    clearInterval(interval);
  });
});

app.listen(PORT, () => {
  console.log(`SSE server running on PORT ${PORT}`);
});
