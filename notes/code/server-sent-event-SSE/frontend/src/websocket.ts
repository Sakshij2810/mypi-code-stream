const socket = new WebSocket("ws://localhost:3001");

socket.onopen = () => {
  console.log("WebSocket connected");
  socket.send("Hello from client");
};

socket.onmessage = (event) => {
  console.log("Received from server:", event.data);
};

socket.onclose = () => {
  console.log("WebSocket connection closed");
};

socket.onerror = (error) => {
  console.log("WebSocket error:", error);
};
