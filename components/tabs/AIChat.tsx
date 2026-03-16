"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { askAI } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

type Role = "user" | "assistant" | "action" | "error";

interface Message {
  role: Role;
  text: string;
  time: Date;
  action?: string;
  params?: Record<string, unknown>;
}

// ── Constants ──────────────────────────────────────────────────────────────

const WELCOME: Message = {
  role: "assistant",
  text: "👋 Halo! Saya JARVIS. Ketik perintah dalam bahasa natural atau Indonesia.\n\nContoh: *buka notepad*, *ambil screenshot*, *berapa RAM yang dipakai?*",
  time: new Date(),
};

const EXAMPLES = [
  { label: "📸 Screenshot",    text: "Ambil screenshot"          },
  { label: "🖥️ CPU & RAM",     text: "Berapa CPU dan RAM dipakai?" },
  { label: "🔊 Volume 80",     text: "Set volume ke 80"           },
  { label: "📝 Buka Notepad",  text: "Buka notepad"              },
  { label: "🔒 Kunci PC",      text: "Kunci PC sekarang"         },
  { label: "🌐 Buka Chrome",   text: "Buka chrome"               },
  { label: "📍 Lokasi",        text: "Dimana lokasi PC ini?"     },
  { label: "🔋 Baterai",       text: "Cek status baterai"        },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function useWindowWidth() {
  const [w, setW] = useState(0);
  useEffect(() => {
    const update = () => setW(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return w;
}

// ── Typing indicator ───────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "rgba(0,212,255,0.6)",
          display: "inline-block",
          animation: `ai-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────

function Bubble({ msg, isMobile }: { msg: Message; isMobile: boolean }) {
  const isUser   = msg.role === "user";
  const isAction = msg.role === "action";
  const isError  = msg.role === "error";

  if (isAction) {
    return (
      <div style={{
        display: "flex", justifyContent: "center", padding: "2px 0",
      }}>
        <div style={{
          background: "rgba(251,191,36,0.08)",
          border: "1px solid rgba(251,191,36,0.2)",
          borderRadius: 8, padding: "6px 14px",
          fontSize: "0.75rem", color: "#fbbf24", fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
          fontFamily: "monospace",
        }}>
          <span>⚡</span>
          <span>Action: {msg.action}</span>
          {msg.params && Object.keys(msg.params).length > 0 && (
            <span style={{ color: "rgba(251,191,36,0.6)", fontWeight: 400 }}>
              {JSON.stringify(msg.params)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      gap: 10,
      alignItems: "flex-end",
    }}>
      {/* Avatar — assistant side */}
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
          background: isError
            ? "rgba(239,68,68,0.15)"
            : "rgba(0,212,255,0.1)",
          border: `1px solid ${isError ? "rgba(239,68,68,0.3)" : "rgba(0,212,255,0.25)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.85rem",
        }}>
          {isError ? "⚠️" : "🤖"}
        </div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth: isMobile ? "88%" : "75%",
        background: isUser
          ? "linear-gradient(135deg, rgba(0,212,255,0.22), rgba(124,58,237,0.22))"
          : isError
            ? "rgba(239,68,68,0.07)"
            : "rgba(255,255,255,0.04)",
        border: `1px solid ${
          isUser  ? "rgba(0,212,255,0.35)" :
          isError ? "rgba(239,68,68,0.25)" :
                    "rgba(255,255,255,0.07)"
        }`,
        borderRadius: isUser
          ? "18px 18px 4px 18px"
          : "18px 18px 18px 4px",
        padding: "10px 14px",
      }}>
        {/* Meta row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7, marginBottom: 6,
        }}>
          {isUser && <span style={{ fontSize: "0.85rem" }}>👤</span>}
          <span style={{
            fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.07em",
            color: isUser ? "rgba(0,212,255,0.7)" : "rgba(226,232,240,0.4)",
            textTransform: "uppercase",
          }}>
            {isUser ? "You" : "JARVIS"}
          </span>
          <span style={{
            fontSize: "0.63rem", color: "rgba(226,232,240,0.3)",
            marginLeft: "auto",
          }}>
            {formatTime(msg.time)}
          </span>
        </div>

        {/* Text */}
        <div style={{
          fontSize: "0.88rem",
          color: isError ? "#fca5a5" : "#e2e8f0",
          whiteSpace: "pre-wrap", lineHeight: 1.65,
          wordBreak: "break-word",
        }}>
          {msg.text}
        </div>
      </div>

      {/* Avatar — user side */}
      {isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
          background: "rgba(0,212,255,0.1)",
          border: "1px solid rgba(0,212,255,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.85rem",
        }}>
          👤
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const endRef     = useRef<HTMLDivElement>(null);
  const textaRef   = useRef<HTMLTextAreaElement>(null);
  const winW       = useWindowWidth();
  const isMobile   = winW > 0 && winW < 640;

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const el = textaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  useEffect(() => { resizeTextarea(); }, [input, resizeTextarea]);

  // Send message
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", text, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await askAI(text);

      const replyMsg: Message = {
        role: "assistant",
        text: data.response || "Tidak ada respons.",
        time: new Date(),
      };
      setMessages(prev => [...prev, replyMsg]);

      // Show executed action
      if (data.action) {
        const actionMsg: Message = {
          role: "action",
          text:   data.action,
          action: data.action,
          params: data.params ?? {},
          time:   new Date(),
        };
        setMessages(prev => [...prev, actionMsg]);
      }
    } catch (e: unknown) {
      const errText = e instanceof Error ? e.message : String(e);
      setMessages(prev => [...prev, {
        role: "error",
        text: `Gagal menghubungi AI: ${errText}\n\nPastikan Gemini/OpenAI API key sudah dikonfigurasi di config.json.`,
        time: new Date(),
      }]);
    } finally {
      setLoading(false);
      // Re-focus input
      setTimeout(() => textaRef.current?.focus(), 50);
    }
  }, [input, loading]);

  const clearChat = () => {
    setMessages([{
      ...WELCOME,
      text: "💬 Memory cleared. How can I help you?",
      time: new Date(),
    }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <style>{`
        @keyframes ai-dot {
          0%,80%,100% { transform: scale(0.7); opacity: 0.4; }
          40%          { transform: scale(1.1); opacity: 1;   }
        }
        @keyframes ai-bubble {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:none;            }
        }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column",
        height: "calc(100vh - 160px)", minHeight: 420,
        gap: 14,
      }}>

        {/* ── Header ────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 10,
        }}>
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
              🧠 JARVIS AI Chat
            </h2>
            <p style={{ fontSize: "0.72rem", color: "rgba(226,232,240,0.35)", marginTop: 2 }}>
              Natural language · Bahasa Indonesia · Direct PC control
            </p>
          </div>
          <button
            onClick={clearChat}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(226,232,240,0.6)", borderRadius: 8,
              padding: "6px 13px", fontSize: "0.78rem", fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontFamily: "inherit",
            }}
          >
            🧹 Clear
          </button>
        </div>

        {/* ── Example chips ──────────────────────────────────────────── */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6,
          maxHeight: isMobile ? 68 : "none",
          overflowY: isMobile ? "auto" : "visible",
        }}>
          {EXAMPLES.map(ex => (
            <button
              key={ex.text}
              onClick={() => { setInput(ex.text); textaRef.current?.focus(); }}
              style={{
                background: "rgba(0,212,255,0.07)",
                border: "1px solid rgba(0,212,255,0.18)",
                color: "rgba(0,212,255,0.85)", borderRadius: 20,
                padding: "4px 12px", fontSize: "0.72rem", fontWeight: 600,
                cursor: "pointer", whiteSpace: "nowrap",
                transition: "all 0.15s", fontFamily: "inherit",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,255,0.14)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,212,255,0.35)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,255,0.07)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,212,255,0.18)";
              }}
            >
              {ex.label}
            </button>
          ))}
        </div>

        {/* ── Messages ───────────────────────────────────────────────── */}
        <div style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          display: "flex", flexDirection: "column", gap: 10,
          background: "rgba(6,10,22,0.6)",
          borderRadius: 14, padding: "16px",
          border: "1px solid rgba(0,212,255,0.08)",
          boxShadow: "inset 0 0 24px rgba(0,0,0,0.25)",
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ animation: "ai-bubble 0.25s ease both" }}>
              <Bubble msg={msg} isMobile={isMobile} />
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{
              display: "flex", gap: 10, alignItems: "flex-end",
              animation: "ai-bubble 0.25s ease both",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: "rgba(0,212,255,0.08)",
                border: "1px solid rgba(0,212,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.85rem",
              }}>🤖</div>
              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "18px 18px 18px 4px",
                padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <TypingDots />
                <span style={{ fontSize: "0.8rem", color: "rgba(226,232,240,0.4)" }}>
                  Thinking…
                </span>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* ── Input bar ──────────────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-end",
          background: "rgba(6,10,22,0.9)",
          border: `1px solid rgba(0,212,255,${input.trim() ? "0.4" : "0.2"})`,
          borderRadius: 16, padding: "10px 14px",
          transition: "border-color 0.2s",
          boxShadow: input.trim() ? "0 0 16px rgba(0,212,255,0.06)" : "none",
        }}>
          <textarea
            ref={textaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik perintah atau pertanyaan… (Enter = kirim, Shift+Enter = baris baru)"
            rows={1}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "#e2e8f0", fontSize: "0.9rem",
              resize: "none", maxHeight: 120, minHeight: 24,
              lineHeight: 1.55, padding: "6px 0",
              fontFamily: "inherit",
            }}
          />

          {/* Send button */}
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              width: 38, height: 38, flexShrink: 0,
              borderRadius: "50%", border: "none",
              background: loading || !input.trim()
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,212,255,0.2)",
              color: loading || !input.trim()
                ? "rgba(226,232,240,0.3)"
                : "#00d4ff",
              border: `1px solid ${loading || !input.trim() ? "rgba(255,255,255,0.08)" : "rgba(0,212,255,0.4)"}`,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.1rem",
              transition: "all 0.2s",
              flexShrink: 0,
            } as React.CSSProperties}
          >
            {loading
              ? <span style={{
                  width: 14, height: 14, borderRadius: "50%",
                  border: "2px solid rgba(0,212,255,0.4)",
                  borderTopColor: "#00d4ff",
                  display: "inline-block",
                  animation: "ai-dot 0.7s linear infinite",
                }} />
              : "➤"}
          </button>
        </div>

        {/* Hint */}
        <p style={{
          fontSize: "0.67rem", color: "rgba(226,232,240,0.25)",
          textAlign: "center", margin: 0,
        }}>
          Enter = kirim &nbsp;·&nbsp; Shift+Enter = baris baru &nbsp;·&nbsp;
          AI dapat langsung mengeksekusi perintah ke PC
        </p>
      </div>
    </>
  );
}