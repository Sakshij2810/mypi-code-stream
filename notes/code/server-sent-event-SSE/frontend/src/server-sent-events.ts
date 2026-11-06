const eventSource = new EventSource("http://localhost:3000/stream");

const messages = document.getElementById("messages");

eventSource.onmessage = (event) => {
  console.log(event.data);

  if (messages) {
    const p = document.createElement("p");
    p.textContent = event.data;

    messages.appendChild(p);
  }
};

eventSource.onerror = () => {
  console.log("SSE connection closed");
  eventSource.close();
};
