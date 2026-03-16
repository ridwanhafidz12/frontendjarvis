"use client";
import { useState, useEffect, useCallback } from "react";
import { getConfig, updateConfig } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

type ConfigValue = string | number | boolean | unknown[] | null;
type ConfigMap   = Record<string, ConfigValue>;

// ── Constants ──────────────────────────────────────────────────────────────

const SENSITIVE = new Set([
  "telegram_token", "gemini_key", "openai_key",
  "supabase_key",   "supabase_url",
]);

const GROUP_ORDER: Record<string, string[]> = {
  "🤖 Bot":      ["telegram_token", "allowed_users", "dashboard_password"],
  "🧠 AI":       ["gemini_key", "openai_key", "openai_model"],
  "☁️ Supabase": ["supabase_url", "supabase_key"],
  "🔔 Monitors": ["battery_low_threshold", "battery_critical_threshold"],
  "ℹ️ System":   ["version"],
};

// ── Helpers ────────────────────────────────────────────────────────────────

function castValue(raw: string): ConfigValue {
  if (raw === "true")  return true;
  if (raw === "false") return false;
  if (raw !== "" && !isNaN(Number(raw))) return Number(raw);
  return raw;
}

function displayValue(val: ConfigValue, sensitive: boolean): string {
  if (sensitive && typeof val === "string" && val.length > 12) {
    return val.slice(0, 8) + "…" + val.slice(-4);
  }
  if (Array.isArray(val)) return val.join(", ");
  if (val === null || val === undefined) return "—";
  return String(val);
}

function getValueColor(val: ConfigValue): string {
  if (typeof val === "boolean") return val ? "#22c55e" : "#ef4444";
  if (typeof val === "number")  return "#a78bfa";
  if (Array.isArray(val))       return "#f59e0b";
  return "#e2e8f0";
}

function groupKeys(config: ConfigMap): Array<{ group: string; keys: string[] }> {
  const assigned = new Set<string>();
  const result: Array<{ group: string; keys: string[] }> = [];

  for (const [group, keys] of Object.entries(GROUP_ORDER)) {
    const found = keys.filter(k => k in config);
    if (found.length) {
      result.push({ group, keys: found });
      found.forEach(k => assigned.add(k));
    }
  }

  const rest = Object.keys(config).filter(k => !assigned.has(k));
  if (rest.length) result.push({ group: "⚙️ Other", keys: rest });

  return result;
}

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [msg, onDone]);

  const ok = msg.startsWith("✅");
  return (
    <div style={{
      padding: "10px 16px", borderRadius: 10,
      background: ok ? "rgba(34,197,94,0.1)"  : "rgba(239,68,68,0.1)",
      border:     `1px solid ${ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
      color:      ok ? "#22c55e" : "#ef4444",
      fontSize: "0.82rem", fontWeight: 600,
      animation: "cfg-up 0.2s ease both",
    }}>
      {msg}
    </div>
  );
}

// ── Edit modal ─────────────────────────────────────────────────────────────

function EditModal({
  editKey, editVal, saving,
  onChange, onSave, onCancel,
}: {
  editKey: string; editVal: string; saving: boolean;
  onChange: (v: string) => void;
  onSave:   () => void;
  onCancel: () => void;
}) {
  const isSensitive = SENSITIVE.has(editKey);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }} onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "rgba(8,12,26,0.98)",
          border: "1px solid rgba(0,212,255,0.25)",
          borderRadius: 14, padding: 24,
          width: "100%", maxWidth: 440,
          display: "flex", flexDirection: "column", gap: 14,
          boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
          animation: "cfg-up 0.2s ease both",
        }}
      >
        <div>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#e2e8f0", margin: "0 0 4px" }}>
            ✏️ Edit Config
          </h3>
          <code style={{ fontSize: "0.8rem", color: "#00d4ff" }}>
            {editKey}
            {isSensitive && <span style={{ color: "#f59e0b", marginLeft: 6 }}>🔒 sensitive</span>}
          </code>
        </div>

        <input
          autoFocus
          value={editVal}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter")  onSave();
            if (e.key === "Escape") onCancel();
          }}
          type={isSensitive ? "password" : "text"}
          placeholder="New value…"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(0,212,255,0.3)",
            borderRadius: 8, padding: "10px 14px",
            color: "#e2e8f0", fontSize: "0.9rem",
            outline: "none", width: "100%",
            fontFamily: "monospace",
            boxSizing: "border-box",
          }}
        />

        <p style={{ fontSize: "0.7rem", color: "rgba(226,232,240,0.3)", margin: 0 }}>
          true / false → boolean &nbsp;·&nbsp; 0–100 → number &nbsp;·&nbsp; text → string
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(226,232,240,0.6)", borderRadius: 8, padding: "8px 18px",
            fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <button onClick={onSave} disabled={saving} style={{
            background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)",
            color: "#22c55e", borderRadius: 8, padding: "8px 18px",
            fontSize: "0.82rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "inherit", opacity: saving ? 0.6 : 1,
          }}>
            {saving ? "Saving…" : "💾 Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Config row ─────────────────────────────────────────────────────────────

function ConfigRow({ cfgKey, val, onEdit }: {
  cfgKey: string; val: ConfigValue; onEdit: () => void;
}) {
  const sensitive   = SENSITIVE.has(cfgKey);
  const displayVal  = displayValue(val, sensitive);
  const color       = getValueColor(val);

  return (
    <div style={{
      display: "flex", alignItems: "center",
      padding: "10px 16px", gap: 12,
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      transition: "background 0.15s",
    }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
    >
      {/* Key */}
      <div style={{ minWidth: 0, flex: "0 0 auto", width: "40%", maxWidth: 240 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <code style={{
            fontSize: "0.78rem", color: "#00d4ff",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {cfgKey}
          </code>
          {sensitive && <span style={{ fontSize: "0.65rem", color: "#f59e0b", flexShrink: 0 }}>🔒</span>}
        </div>
      </div>

      {/* Value */}
      <div style={{
        flex: 1, minWidth: 0,
        fontFamily: "monospace", fontSize: "0.78rem", color,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {displayVal}
      </div>

      {/* Edit button */}
      <button
        onClick={onEdit}
        style={{
          flexShrink: 0,
          background: "rgba(0,212,255,0.07)", border: "1px solid rgba(0,212,255,0.18)",
          color: "#00d4ff", borderRadius: 6, padding: "3px 10px",
          fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}
      >
        ✏️ Edit
      </button>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function ConfigTab() {
  const [config,  setConfig]  = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState("");
  const [editKey, setEditKey] = useState("");
  const [editVal, setEditVal] = useState("");

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getConfig();
      setConfig(data);
    } catch (e: unknown) {
      setToast(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const openEdit = (key: string) => {
    const raw = config[key];
    setEditKey(key);
    setEditVal(Array.isArray(raw) ? raw.join(", ") : String(raw ?? ""));
  };

  const saveValue = async () => {
    if (!editKey) return;
    setSaving(true);
    try {
      await updateConfig({ [editKey]: castValue(editVal) });
      setToast(`✅ Saved: ${editKey}`);
      setEditKey("");
      setEditVal("");
      await fetchConfig();
    } catch (e: unknown) {
      setToast(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const groups = groupKeys(config);

  return (
    <>
      <style>{`
        @keyframes cfg-up { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;} }
      `}</style>

      {/* Edit modal */}
      {editKey && (
        <EditModal
          editKey={editKey} editVal={editVal} saving={saving}
          onChange={setEditVal}
          onSave={saveValue}
          onCancel={() => { setEditKey(""); setEditVal(""); }}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#e2e8f0", margin: "0 0 3px" }}>
              ⚙️ Configuration
            </h2>
            <p style={{ fontSize: "0.72rem", color: "rgba(226,232,240,0.35)", margin: 0 }}>
              Klik ✏️ Edit pada baris untuk mengubah nilai · perubahan langsung tersimpan ke config.json
            </p>
          </div>
          <button
            onClick={fetchConfig}
            disabled={loading}
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(226,232,240,0.6)", borderRadius: 8, padding: "7px 14px",
              fontSize: "0.78rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit",
            }}
          >
            <span style={{ display: "inline-block", animation: loading ? "cfg-spin 0.7s linear infinite" : "none" }}>
              🔄
            </span>
            Refresh
          </button>
        </div>

        {/* Toast */}
        {toast && <Toast msg={toast} onDone={() => setToast("")} />}

        {/* ── Config groups ────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 60, gap: 12,
            color: "rgba(226,232,240,0.3)", fontSize: "0.85rem" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%",
              border: "2px solid rgba(0,212,255,0.3)", borderTopColor: "#00d4ff",
              display: "inline-block", animation: "cfg-up 0.7s linear infinite" }} />
            Loading config…
          </div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40,
            color: "rgba(226,232,240,0.3)", fontSize: "0.85rem" }}>
            No configuration found
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {groups.map(({ group, keys }) => (
              <div key={group} style={{
                background: "rgba(6,10,22,0.6)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, overflow: "hidden",
                animation: "cfg-up 0.3s ease both",
              }}>
                {/* Group header */}
                <div style={{
                  padding: "10px 16px",
                  background: "rgba(0,212,255,0.03)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  fontSize: "0.7rem", fontWeight: 700,
                  color: "rgba(226,232,240,0.4)",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                  {group}
                </div>

                {/* Rows */}
                {keys.map(key => (
                  <ConfigRow
                    key={key}
                    cfgKey={key}
                    val={config[key]}
                    onEdit={() => openEdit(key)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── Danger zone ──────────────────────────────────────────── */}
        <div style={{
          background: "rgba(239,68,68,0.05)",
          border: "1px solid rgba(239,68,68,0.15)",
          borderRadius: 12, padding: "14px 16px",
        }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(239,68,68,0.6)",
            letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            ⚠️ Catatan Penting
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              "Perubahan config langsung tersimpan ke config.json di PC target.",
              "Mengubah telegram_token memerlukan restart JARVIS agar efektif.",
              "allowed_users berisi Telegram User ID — pisahkan dengan koma jika lebih dari satu.",
              "Nilai 🔒 (sensitive) ditampilkan sebagian — nilai asli tersimpan di server.",
            ].map((note, i) => (
              <li key={i} style={{ fontSize: "0.75rem", color: "rgba(226,232,240,0.4)" }}>
                {note}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}