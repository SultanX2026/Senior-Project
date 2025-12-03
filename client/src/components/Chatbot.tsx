import { useState, useRef, useEffect } from "react";
import { sendMessageToAgent } from "../api/aws";

type Message = { role: "user" | "bot"; text: string };

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hi! Ask me about stocks, community threads, or market trends." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Create unique session ID for this chatbot instance
  const sessionIdRef = useRef(`chat-${Date.now()}-${Math.random().toString(36).substring(7)}`);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const botReply = await sendMessageToAgent(userMsg, sessionIdRef.current);
      setMessages(prev => [...prev, { role: "bot", text: botReply }]);
    } catch (err) {
      console.error("Chatbot error:", err);
      setMessages(prev => [...prev, { role: "bot", text: "Error connecting to chatbot. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exportChatHistory = () => {
    const timestamp = new Date().toLocaleString();
    const chatText = messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.text}`)
      .join("\n\n");
    
    const content = `Chat History - Exported ${timestamp}\n${"=".repeat(50)}\n\n${chatText}`;
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chat-history-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999 }}>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          backgroundColor: "#4f46e5",
          color: "white",
          border: "none",
          fontSize: 24,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          display: isOpen ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Open Chatbot"
      >
        💬
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            width: 350,
            height: 500,
            backgroundColor: "white",
            borderRadius: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: "#4f46e5",
              color: "white",
              padding: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: "bold" }}>Stock Advisor 📈</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={exportChatHistory}
                title="Export chat history"
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: 18,
                  cursor: "pointer",
                  opacity: 0.8,
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
              >
                ⬇️
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor:
                    msg.role === "user" ? "#4f46e5" : "#f3f4f6",
                  color: msg.role === "user" ? "white" : "black",
                  fontSize: 13,
                  lineHeight: 1.4,
                  wordWrap: "break-word",
                }}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", color: "#999", fontSize: 12 }}>
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: 10,
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              gap: 8,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about stocks..."
              disabled={loading}
              style={{
                flex: 1,
                padding: 8,
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 12,
                outline: "none",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                padding: "8px 12px",
                backgroundColor: "#4f46e5",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                opacity: loading || !input.trim() ? 0.6 : 1,
                fontSize: 12,
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
