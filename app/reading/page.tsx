"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { connectWallet } from "@/lib/wallet";
import { payForReading, QueryType } from "@/lib/somaPay";

const STARS = [
  { x:  8, y:  4, r: 1.5, o: 0.20 }, { x: 23, y: 11, r: 1.0, o: 0.14 },
  { x: 71, y:  6, r: 2.0, o: 0.16 }, { x: 89, y:  3, r: 1.0, o: 0.24 },
  { x:  5, y: 21, r: 1.0, o: 0.11 }, { x: 94, y: 18, r: 2.0, o: 0.13 },
  { x: 15, y: 37, r: 1.0, o: 0.17 }, { x: 82, y: 41, r: 1.0, o: 0.18 },
  { x:  3, y: 54, r: 2.0, o: 0.10 }, { x: 92, y: 64, r: 1.0, o: 0.14 },
  { x: 87, y: 77, r: 1.5, o: 0.11 }, { x: 12, y: 87, r: 1.0, o: 0.17 },
  { x: 96, y: 87, r: 1.0, o: 0.18 }, { x: 85, y: 29, r: 1.0, o: 0.21 },
  { x:  6, y: 69, r: 1.5, o: 0.14 }, { x: 50, y: 14, r: 1.5, o: 0.19 },
];

function ReadingContent() {
  const params  = useSearchParams();
  const router  = useRouter();
  const address = params.get("address") as `0x${string}` | null;
  const txHash  = params.get("tx");

  const [reading, setReading]           = useState("");
  const [status, setStatus]             = useState<"loading" | "streaming" | "done" | "error">("loading");
  const [question, setQuestion]         = useState("");
  const [answer, setAnswer]             = useState("");
  const [askStatus, setAskStatus]       = useState<"idle" | "paying" | "loading" | "done">("idle");
  const [walletClient, setWalletClient] = useState<any>(null);
  const readingRef = useRef("");

  useEffect(() => {
    connectWallet()
      .then(({ walletClient: wc }) => setWalletClient(wc))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!address || !txHash) { setStatus("error"); return; }
    const controller = new AbortController();

    async function fetchReading() {
      try {
        const res = await fetch("/api/oracle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, txHash }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Oracle unavailable");
        }
        const ct = res.headers.get("Content-Type") ?? "";
        if (ct.includes("application/json")) {
          const data = await res.json();
          readingRef.current = data.reading;
          setReading(data.reading);
          setStatus("done");
          return;
        }
        setStatus("streaming");
        const reader  = res.body!.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          readingRef.current += decoder.decode(value, { stream: true });
          setReading(readingRef.current);
        }
        setStatus("done");
      } catch (e: any) {
        if (e.name !== "AbortError") setStatus("error");
      }
    }

    fetchReading();
    return () => controller.abort();
  }, [address, txHash]);

  async function handleAsk() {
    if (!question.trim() || !address || !walletClient) return;
    try {
      setAskStatus("paying");
      const followTx = await payForReading(walletClient, address, QueryType.FOLLOWUP);
      setAskStatus("loading");
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          txHash: followTx,
          question,
          originalReading: readingRef.current,
        }),
      });
      const data = await res.json();
      setAnswer(data.answer ?? data.error ?? "Could not get answer");
      setAskStatus("done");
    } catch {
      setAskStatus("idle");
    }
  }

  return (
    <main className="relative min-h-screen" style={{ backgroundColor: "#090B14", color: "#F0F0F0" }}>

      {/* ── Cosmic star field ──────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          {STARS.map((s, i) => (
            <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="white" opacity={s.o} />
          ))}
        </svg>
      </div>

      {/* ── Ambient top glow ───────────────────────────────────────── */}
      <div
        className="fixed top-[-60px] left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: 320,
          height: 320,
          background: "radial-gradient(ellipse at center, rgba(124,111,205,0.10) 0%, transparent 68%)",
        }}
        aria-hidden
      />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="relative flex items-center px-5 pt-12 pb-5" style={{ gap: 12 }}>
        <button
          onClick={() => router.push("/")}
          style={{ color: "#6B7280", fontSize: 20, lineHeight: 1 }}
          aria-label="Go back"
        >
          ←
        </button>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#F0F0F0" }}>
          Your Reading
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#4B5060" }}>
          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </header>

      {/* ── Scrollable content ──────────────────────────────────────── */}
      <div className="relative px-5 pb-20" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Loading */}
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-24" style={{ gap: 20 }}>
            <div className="relative flex items-center justify-center" style={{ width: 88, height: 88 }}>
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: "radial-gradient(ellipse at center, rgba(124,111,205,0.18) 0%, transparent 70%)" }}
              />
              <div
                className="absolute inset-0 rounded-full animate-ping"
                style={{ border: "1px solid rgba(245,158,11,0.22)", animationDuration: "1.7s" }}
              />
              <div
                className="absolute rounded-full"
                style={{ inset: 16, border: "1px solid rgba(245,158,11,0.12)" }}
              />
              <span
                className="relative z-10 select-none"
                style={{ fontSize: 32, color: "rgba(245,158,11,0.65)", lineHeight: 1 }}
              >
                ◈
              </span>
            </div>
            <p style={{ color: "#6B7280", fontSize: 13 }}>Reading your wallet…</p>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div
            className="text-center"
            style={{
              backgroundColor: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: 20,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <p style={{ color: "#F87171", fontSize: 14, fontWeight: 600 }}>Reading unavailable</p>
            <p style={{ color: "#6B7280", fontSize: 13 }}>Your USDC was not charged.</p>
            <button onClick={() => router.push("/")} style={{ color: "#F59E0B", fontSize: 13, fontWeight: 500 }}>
              ← Go back
            </button>
          </div>
        )}

        {/* Reading cards */}
        {(status === "streaming" || status === "done") && reading && (
          <ReadingCard text={reading} />
        )}

        {/* Follow-up section */}
        {status === "done" && (
          <>
            <div
              style={{
                backgroundColor: "#0E1220",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <p style={{ fontSize: 11, color: "#6B7280", letterSpacing: "0.04em" }}>
                Follow-up question <span style={{ color: "#F59E0B" }}>· 0.02 USDC</span>
              </p>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What else do you want to know?"
                rows={2}
                className="w-full resize-none outline-none transition-all"
                style={{
                  backgroundColor: "#141829",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 14,
                  padding: "12px 16px",
                  fontSize: 14,
                  color: "#F0F0F0",
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(245,158,11,0.28)"; }}
                onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.05)"; }}
              />
              <button
                onClick={handleAsk}
                disabled={!question.trim() || askStatus === "paying" || askStatus === "loading"}
                className="w-full transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: "#F59E0B",
                  color: "#080A11",
                  fontWeight: 700,
                  borderRadius: 999,
                  fontSize: 14,
                  letterSpacing: "-0.01em",
                  padding: "16px 0",
                  opacity: (!question.trim() || askStatus === "paying" || askStatus === "loading") ? 0.40 : 1,
                  cursor: (!question.trim() || askStatus === "paying" || askStatus === "loading") ? "not-allowed" : "pointer",
                }}
              >
                {askStatus === "paying"
                  ? "Settling payment…"
                  : askStatus === "loading"
                  ? "Getting answer…"
                  : "Ask · 0.02 USDC"}
              </button>
            </div>

            {answer && (
              <div
                style={{
                  backgroundColor: "#0E1220",
                  border: "1px solid rgba(96,165,250,0.12)",
                  borderRadius: 20,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#60A5FA", flexShrink: 0 }} />
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#60A5FA" }}>
                    Answer
                  </p>
                </div>
                <p style={{ fontSize: 15, color: "#F0F0F0", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                  {answer}
                </p>
              </div>
            )}

            <button
              onClick={() => router.push("/")}
              className="w-full"
              style={{ color: "#6B7280", fontSize: 13, padding: "16px 0" }}
            >
              ← New reading
            </button>
          </>
        )}
      </div>
    </main>
  );
}

// ── ReadingCard ──────────────────────────────────────────────────────
const SECTIONS = [
  { key: "MONEY SUMMARY",  color: "#F59E0B" },
  { key: "PATTERN",        color: "#10B981" },
  { key: "ORACLE INSIGHT", color: "#60A5FA" },
  { key: "YOUR TIP",       color: "#F59E0B" },
] as const;

function ReadingCard({ text }: { text: string }) {
  const blocks: { label: string; color: string; body: string }[] = [];

  for (let i = 0; i < SECTIONS.length; i++) {
    const start = text.indexOf(SECTIONS[i].key);
    if (start === -1) continue;
    const end  = i + 1 < SECTIONS.length
      ? text.indexOf(SECTIONS[i + 1].key)
      : text.length;
    const body = text
      .slice(start + SECTIONS[i].key.length, end === -1 ? undefined : end)
      .replace(/^[\s\-—]+/, "")
      .trim();
    blocks.push({ label: SECTIONS[i].key, color: SECTIONS[i].color, body });
  }

  if (blocks.length === 0) {
    return (
      <div
        style={{
          backgroundColor: "#0E1220",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 20,
          padding: 20,
        }}
      >
        <p style={{ fontSize: 15, color: "#F0F0F0", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
          {text}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {blocks.map((b) => (
        <div
          key={b.label}
          style={{
            backgroundColor: "#0E1220",
            border: `1px solid ${b.color}1F`,
            borderRadius: 20,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: b.color, flexShrink: 0 }} />
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: b.color }}>
              {b.label}
            </p>
          </div>
          <p style={{ fontSize: 15, color: "#F0F0F0", lineHeight: 1.75 }}>{b.body}</p>
        </div>
      ))}
    </div>
  );
}

export default function ReadingPage() {
  return (
    <Suspense>
      <ReadingContent />
    </Suspense>
  );
}
