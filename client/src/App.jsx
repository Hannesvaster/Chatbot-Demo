import { useEffect, useRef, useState } from "react";
import "./style.css";

const WS_URL = "ws://localhost:8080";

export default function App() {
  const [status, setStatus] = useState("disconnected");
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Tere! Kirjuta midagi — vastan streaminguga." },
  ]);

  const wsRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setStatus("connected");
    ws.onclose = () => setStatus("disconnected");
    ws.onerror = () => setStatus("error");

    ws.onmessage = (evt) => {
      let msg;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }

      if (msg.type === "typing") {
        setTyping(Boolean(msg.value));
        return;
      }

      if (msg.type === "start") {
        // lisa uus assistant message, mida delta-dega täidame
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        return;
      }

      if (msg.type === "delta") {
        const delta = String(msg.delta ?? "");
        setMessages((prev) => {
          const next = [...prev];
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === "assistant") {
              next[i] = { ...next[i], content: (next[i].content || "") + delta };
              break;
            }
          }
          return next;
        });
        return;
      }

      if (msg.type === "end") return;
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function send() {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({ type: "user_message", text }));
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <div style={{ fontSize: 18, fontWeight: 700 }}>AI Chat (WS streaming)</div>
          <div className="badge">Status: {status}</div>
        </div>

        <div className="messages">
          {messages.map((m, idx) => (
            <div key={idx} className={`msg ${m.role}`}>
              <div className="bubble">{m.content}</div>
            </div>
          ))}

          {typing && (
            <div className="msg assistant">
              <div className="bubble">
                <span className="dots">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="row">
          <textarea
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Kirjuta siia… (Enter = send, Shift+Enter = uus rida)"
          />
          <button className="button" onClick={send} disabled={status !== "connected"}>
            Send
          </button>
        </div>

        <div className="small">
          Server: {WS_URL} • Streaming: start/delta/end • Typing: on/off
        </div>
      </div>
    </div>
  );
}
