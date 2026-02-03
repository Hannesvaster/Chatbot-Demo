import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";

dotenv.config();

const app = express();
app.use(cors());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.send(JSON.stringify({
    type: "hello",
    message: "WebSocket connection established"
  }));

  ws.on("message", (data) => {
    const text = data.toString();
    console.log("Received:", text);

    ws.send(JSON.stringify({
      type: "reply",
      message: `Echo: ${text}`
    }));
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
