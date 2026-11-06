# SSE and WebSocket Demo

This project contains two small examples that demonstrate the difference
between **Server-Sent Events (SSE)** and **WebSockets**.

- **SSE:** The server continuously sends events to the browser over an
  HTTP response.
- **WebSockets:** The browser and server can send messages to each
  other over a persistent, two-way connection.

## 1. Project structure

Keep the files arranged like this:

```text
project/
├── backend/
│   ├── server-sent-events.ts
│   ├── websocket.ts
│   └── package.json
│
└── frontend/
    ├── index.html
    ├── websocket.html
    ├── package.json
    └── src/
        ├── server-sent-events.ts
        └── websocket.ts
```

The examples use separate ports so both backend servers can run at the
same time:

Service Port URL

---

SSE backend 3000 `http://localhost:3000/stream`
WebSocket backend 3001 `ws://localhost:3001`
Vite frontend 5173 (default) `http://localhost:5173`

## 2. Prerequisites

Install Node.js and npm. Check that they are available:

```bash
node -v
npm -v
```

## 3. Install dependencies

Open a terminal in the `backend` directory:

```bash
cd backend
npm install
```

The backend dependencies used by these examples are:

- `express` --- creates the HTTP server for SSE.
- `cors` --- enables cross-origin requests from the frontend.
- `ws` --- provides the WebSocket server.
- `tsx` --- runs the TypeScript files directly.

Open another terminal in the `frontend` directory:

```bash
cd frontend
npm install
```

The frontend uses Vite to serve the HTML pages and TypeScript modules.

## 4. Backend scripts

The backend `package.json` should include these scripts:

```json
{
  "type": "module",
  "scripts": {
    "sse": "tsx server-sent-events.ts",
    "ws": "tsx websocket.ts"
  }
}
```

Keep the dependencies already listed in your `package.json`; the scripts
above are the important part for running the examples.

## 5. Run the SSE example

### Terminal 1: Start the SSE backend

From the `backend` directory:

```bash
npm run sse
```

Expected terminal output:

```text
SSE server running on PORT 3000
```

The SSE endpoint is:

```text
http://localhost:3000/stream
```

### Terminal 2: Start the frontend

From the `frontend` directory:

```bash
npm run dev
```

Vite will print a local URL. It is usually:

```text
http://localhost:5173/
```

Open that URL in your browser.

### Expected SSE response

The page should display ten messages, arriving approximately one second
apart:

```text
Message 1
Message 2
Message 3
Message 4
Message 5
Message 6
Message 7
Message 8
Message 9
Message 10
```

Open the browser's Developer Tools (**Inspect → Console**) to see the
connection and incoming messages:

```text
SSE connection established
Message 1
Message 2
...
Message 10
SSE connection closed
```

The server sends each event using:

```typescript
res.write(`data: Message ${count}\n\n`);
```

The `data:` field is part of the SSE event format. The two newline
characters (`\n\n`) mark the end of an event.

The browser receives the events using:

```typescript
const eventSource = new EventSource("http://localhost:3000/stream");

eventSource.onmessage = (event) => {
  console.log(event.data);
};
```

The server ends the response after sending ten messages. The frontend's
`onerror` handler may run when the stream ends; this example closes the
`EventSource` there to prevent automatic reconnection.

## 6. Run the WebSocket example

Keep the frontend running. Open another terminal.

### Terminal 1: Start the WebSocket backend

From the `backend` directory:

```bash
npm run ws
```

Expected terminal output:

```text
WebSocket server running on PORT 3001
```

### Open the WebSocket demo

In your browser, visit:

```text
http://localhost:5173/websocket.html
```

Open Developer Tools (**Inspect → Console**).

### Expected browser console output

```text
WebSocket connected
Received from server: Hello from server
```

### Expected backend terminal output

```text
Client connected
Received: Hello from client
```

The browser sends a message when the connection opens:

```typescript
const socket = new WebSocket("ws://localhost:3001");

socket.onopen = () => {
  socket.send("Hello from client");
};
```

The backend receives it and replies:

```typescript
socket.on("message", (message) => {
  console.log("Received:", message.toString());
  socket.send("Hello from server");
});
```

The browser receives the reply through `socket.onmessage`.

## 7. Test both examples at the same time

You can run both backend servers and the frontend simultaneously.

Open three terminals:

Terminal Directory Command

---

1 `backend/` `npm run sse`
2 `backend/` `npm run ws`
3 `frontend/` `npm run dev`

Then open these pages:

Demo Browser URL

---

SSE `http://localhost:5173/`
WebSocket `http://localhost:5173/websocket.html`

Both backend servers use different ports, so they do not conflict.

## 8. Inspect the connections in browser DevTools

Open Developer Tools → **Network**.

### SSE

1.  Open `http://localhost:5173/`.
2.  Select the `/stream` request in the Network panel.
3.  Inspect its response or EventStream view (the exact tab depends on
    the browser).
4.  Observe the incoming events.
5.  The request stays open while the server is sending events.

### WebSocket

1.  Open `http://localhost:5173/websocket.html`.
2.  Select the connection to `localhost:3001` in the Network panel.
3.  Open the **Messages** or **Frames** tab.
4.  Inspect the message sent by the browser and the reply sent by the
    server.

## 9. Common errors and fixes

---

Error / symptom Possible reason What to check

---

`EADDRINUSE` A port is already in Stop the other process
use or use a different
port.

WebSocket connection Wrong URL or server is Confirm the URL is
fails not running `ws://localhost:3001`
and run `npm run ws`.

SSE page receives no SSE server is not Confirm `npm run sse`
messages running or endpoint is is running and the URL
incorrect ends in `/stream`.

`Failed to fetch` or Cross-origin request is Confirm
CORS error blocked `app.use(cors())` is
enabled on the SSE
backend.

Frontend page is not Vite is not running or Start Vite from
found the HTML file is `frontend/` and check
misplaced that `websocket.html`
is in the frontend
root.

TypeScript file does Dependencies are Run `npm install` in
not run missing the relevant directory.

---

If a port is occupied, stop the process running in that terminal with
`Ctrl + C` before starting it again.

## 10. Key differences

---

Feature SSE WebSockets

---

Communication direction Server → browser Server ↔ browser

Backend API `res.write()` `socket.send()`

Browser API `EventSource` `WebSocket`

Underlying connection HTTP response kept open Persistent WebSocket
connection

Typical use cases Notifications, live Chat, multiplayer
feeds, AI text games, real-time
streaming collaboration

---

## 11. What to learn from this demo

- SSE is useful when the server needs to stream updates to the
  browser.
- WebSockets are useful when both the browser and server need to
  exchange messages over the same connection.
- `res.write()` writes data to an HTTP response; it does not create a
  WebSocket connection.
- `EventSource` is the browser API for receiving SSE events.
- `socket.send()` sends a WebSocket message.
- The SSE example sends ten messages and then ends the response.
- The WebSocket example stays connected until the client or server
  closes the connection.

**Next exercise:** Replace the hardcoded SSE messages with chunks from a
Groq or Anthropic streaming response. This demonstrates how an LLM
response can be forwarded from the backend to the browser as it is
generated.
