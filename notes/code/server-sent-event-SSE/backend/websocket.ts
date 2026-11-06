import { WebSocketServer } from "ws";

const PORT = 3001;

const wss = new WebSocketServer({
  port: PORT,
});

wss.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("message", (message) => {
    console.log("Received: ", message.toString());

    // Send response to client
    socket.send("Hello from server");
  });

  socket.on("close", () => {
    console.log("Client disconnected");
  });
});

console.log(`WebSocket server running on PORT ${PORT}`);
