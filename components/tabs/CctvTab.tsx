"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getApiBase, getToken } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

type StreamMode = "none" | "cctv" | "screen";

interface StreamConfig {
  id:       StreamMode;
  label:    string;
  icon:     string;
  endpoint: string;
  desc:     string;
  note:     string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function useClientValues() {
  const [vals, setVals] = useState({ base: "", token: "" });
  useEffect(() => {
    setVals({ base: getApiBase() ?? "", token: getToken() ?? "" });
  }, []);
  return vals;
}

function useElapsed(running: boolean) {
  const [secs, setSecs] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (running) {
      setSecs(0);
      ref.current = setInterval(() => setSecs(s => s + 1), 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

// ── Stream card ────────────────────────────────────────────────────────────

function StreamCard({
  config, url, active, onStop,
}: {
  config: StreamConfig;
  url: string;
  active: boolean;
  onStop: () => void;
}) {
  const elapsed = useElapsed(active);
  const [imgErr, setImgErr] = useState(false);
  const [imgKey, setImgKey] = useState(0);

  const retry = () => { setImgErr(false); setImgKey(k => k + 1); };

  if (!active) return null;

  return (
    <div style={{
      background: "rgba(6,10,22,0.7)",
      border: "1px solid rgba(239,68,68,0.25)",
      borderRadius: 14, overflow: "hidden",
      animation: "cctv-up 0.3s ease both",
    }}>
      {/* Live bar */}
      <div style={{
        padding: "10px 16px",
        background: "rgba(239,68,68,0.07)",
        borderBottom: "1px solid rgba(239,68,68,0.15)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Pulsing red dot */}
          <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10 }}>
            <span style={{
              position: "absolute", inset: 0, borderRadius: "50%", background: "#ef4444",
            }} />
            <span style={{
              position: "absolute", inset: 0, borderRadius: "50%", background: "#ef4444",
              opacity: 0.4, animation: "cctv-ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
            }} />
          </span>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#ef4444", letterSpacing: "0.06em" }}>
            LIVE
          </span>
          <span style={{ fontSize: "0.82rem", color: "rgba(226,232,240,0.65)", fontWeight: 500 }}>
            {config.icon} {config.label}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: "0.75rem", fontFamily: "monospace",
            color: "rgba(226,232,240,0.4)", letterSpacing: "0.04em",
          }}>
            ⏱ {elapsed}
          </span>
          <a
            href={url} target="_blank" rel="noopener noreferrer"
            style={{
              background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)",
              color: "#00d4ff", borderRadius: 6, padding: "3px 10px",
              fontSize: "0.72rem", fontWeight: 600, textDecoration: "none",
            }}
          >
            ↗ Fullscreen
          </a>
          <button
            onClick={onStop}
            style={{
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444", borderRadius: 6, padding: "3px 10px",
              fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            ⬛ Stop
          </button>
        </div>
      </div>

      {/* Stream image */}
      <div style={{ position: "relative", background: "#000", minHeight: 320 }}>
        {imgErr ? (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 12,
          }}>
            <span style={{ fontSize: 40 }}>📵</span>
            <p style={{ fontSize: "0.82rem", color: "rgba(226,232,240,0.4)", textAlign: "center", margin: 0 }}>
              Stream tidak tersedia.<br />Pastikan JARVIS berjalan dan kamera/layar aktif.
            </p>
            <button
              onClick={retry}
              style={{
                background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)",
                color: "#00d4ff", borderRadius: 8, padding: "6px 16px",
                fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              🔄 Coba Lagi
            </button>
          </div>
        ) : (
          <img
            key={imgKey}
            src={url}
            alt={`${config.label} stream`}
            onError={() => setImgErr(true)}
            style={{
              width: "100%", display: "block",
              borderRadius: 0, maxHeight: "65vh", objectFit: "contain",
            }}
          />
        )}
      </div>

      {/* Note */}
      <div style={{
        padding: "8px 16px",
        background: "rgba(0,0,0,0.2)",
        fontSize: "0.72rem", color: "rgba(226,232,240,0.35)",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}>
        {config.note}
      </div>
    </div>
  );
}

// ── Link row ───────────────────────────────────────────────────────────────

function LinkRow({ label, url, publicUrl }: { label: string; url: string; publicUrl: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    copyToClipboard(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{
        fontSize: "0.72rem", color: "rgba(226,232,240,0.4)",
        fontWeight: 600, minWidth: 60, textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        {label}
      </span>
      <code style={{
        flex: 1, fontSize: "0.72rem", color: "#00d4ff",
        background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.12)",
        padding: "3px 10px", borderRadius: 6,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        minWidth: 0,
      }}>
        {publicUrl}
      </code>
      <button
        onClick={handleCopy}
        title="Copy URL"
        style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          color: copied ? "#22c55e" : "rgba(226,232,240,0.5)",
          borderRadius: 6, padding: "3px 10px",
          fontSize: "0.72rem", cursor: "pointer", fontFamily: "inherit",
          transition: "color 0.2s",
        }}
      >
        {copied ? "✓ Copied" : "📋 Copy"}
      </button>
      <a
        href={url} target="_blank" rel="noopener noreferrer"
        style={{
          background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)",
          color: "#00d4ff", borderRadius: 6, padding: "3px 10px",
          fontSize: "0.72rem", fontWeight: 600, textDecoration: "none",
        }}
      >
        ↗ Open
      </a>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function CctvTab() {
  const { base, token } = useClientValues();
  const [mode, setMode] = useState<StreamMode>("none");

  const STREAMS: StreamConfig[] = [
    {
      id:       "cctv",
      label:    "CCTV — Silent Webcam",
      icon:     "📹",
      endpoint: "/cctv",
      desc:     "Live webcam stream tanpa aktivasi LED kamera",
      note:     "⚠️ CCTV mode: webcam berjalan secara silent, tidak ada indikator LED.",
    },
    {
      id:       "screen",
      label:    "Screen Share",
      icon:     "🖥️",
      endpoint: "/stream",
      desc:     "Live MJPEG stream desktop remote",
      note:     "📡 Screen share: live stream layar PC dalam bentuk MJPEG.",
    },
  ];

  const getUrl = useCallback(
    (endpoint: string) => `${base}${endpoint}?token=${token}`,
    [base, token],
  );

  const toggleMode = (id: StreamMode) => {
    setMode(prev => prev === id ? "none" : id);
  };

  const activeConfig = STREAMS.find(s => s.id === mode);

  return (
    <>
      <style>{`
        @keyframes cctv-ping { 75%,100%{transform:scale(2.4);opacity:0;} }
        @keyframes cctv-up   { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;} }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#e2e8f0", margin: "0 0 4px" }}>
            📹 Live Streams
          </h2>
          <p style={{ fontSize: "0.73rem", color: "rgba(226,232,240,0.35)", margin: 0 }}>
            CCTV: silent webcam · Screen Share: live desktop · MJPEG stream via Cloudflare Tunnel
          </p>
        </div>

        {/* ── Mode selector ────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {STREAMS.map(s => {
            const isActive = mode === s.id;
            return (
              <button
                key={s.id}
                onClick={() => toggleMode(s.id)}
                style={{
                  background: isActive ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isActive ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"}`,
                  color: isActive ? "#ef4444" : "rgba(226,232,240,0.7)",
                  borderRadius: 10, padding: "10px 18px",
                  fontSize: "0.85rem", fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 8,
                  transition: "all 0.18s",
                }}
              >
                {/* Live indicator when active */}
                {isActive && (
                  <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
                    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#ef4444" }} />
                    <span style={{
                      position: "absolute", inset: 0, borderRadius: "50%",
                      background: "#ef4444", opacity: 0.4,
                      animation: "cctv-ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
                    }} />
                  </span>
                )}
                <span>{s.icon}</span>
                <span>{isActive ? `Stop ${s.label.split("—")[0].trim()}` : s.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Active stream ────────────────────────────────────────── */}
        {activeConfig ? (
          <StreamCard
            config={activeConfig}
            url={getUrl(activeConfig.endpoint)}
            active={true}
            onStop={() => setMode("none")}
          />
        ) : (
          /* Idle placeholder */
          <div style={{
            background: "rgba(6,10,22,0.5)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14, padding: 48,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 14,
            textAlign: "center",
          }}>
            <span style={{ fontSize: 52, opacity: 0.35 }}>📹</span>
            <div>
              <p style={{ fontSize: "0.88rem", color: "rgba(226,232,240,0.4)", margin: "0 0 6px" }}>
                Tidak ada stream yang aktif
              </p>
              <p style={{ fontSize: "0.75rem", color: "rgba(226,232,240,0.25)", margin: 0 }}>
                Pilih CCTV atau Screen Share di atas untuk mulai monitoring
              </p>
            </div>
          </div>
        )}

        {/* ── Direct links ─────────────────────────────────────────── */}
        {base && (
          <div style={{
            background: "rgba(6,10,22,0.5)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12, padding: "14px 16px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{
              fontSize: "0.7rem", fontWeight: 700, color: "rgba(226,232,240,0.4)",
              letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2,
            }}>
              🔗 Direct Stream Links
            </div>
            {STREAMS.map(s => (
              <LinkRow
                key={s.id}
                label={s.id === "cctv" ? "CCTV" : "Screen"}
                url={getUrl(s.endpoint)}
                publicUrl={`${base}${s.endpoint}`}
              />
            ))}
            <p style={{ fontSize: "0.68rem", color: "rgba(226,232,240,0.22)", margin: "4px 0 0" }}>
              Tambahkan <code style={{ fontFamily: "monospace" }}>?token=YOUR_TOKEN</code> saat membuka di browser lain.
            </p>
          </div>
        )}
      </div>
    </>
  );
}