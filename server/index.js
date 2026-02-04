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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeSend(ws, obj) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

async function streamMockAnswer(ws, userText) {
  const answer =
    `Sain su sõnumi: "${userText}". ` +
    `See on mock-streaming. Järgmises etapis ühendame päris LLM-i ja saadame tokenid reaalajas.`;

  safeSend(ws, { type: "start", role: "assistant" });

  // jaga väikesteks juppideks, et näeks “streaming” välja
  const chunks = answer.match(/.{1,12}/g) || [answer];

  for (const chunk of chunks) {
    await sleep(40);
    safeSend(ws, { type: "delta", delta: chunk });
  }

  safeSend(ws, { type: "end" });
}

wss.on("connection", (ws) => {
  console.log("Client connected");

  safeSend(ws, { type: "hello", message: "WebSocket connection established" });

  ws.on("message", async (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      safeSend(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    if (msg.type === "user_message") {
      const text = String(msg.text ?? "").trim();
      if (!text) return;

      safeSend(ws, { type: "typing", value: true });

      try {
        await streamMockAnswer(ws, text);
      } catch (e) {
        safeSend(ws, { type: "error", message: "Streaming failed" });
      }

      safeSend(ws, { type: "typing", value: false });
      return;
    }

    safeSend(ws, { type: "error", message: "Unknown message type" });
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
