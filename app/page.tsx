"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { connectWallet, getUSDCBalance, isMiniPay } from "@/lib/wallet";
import { payForReading, QueryType } from "@/lib/somaPay";
import { computeHealthScore } from "@/lib/blockscout";
import type { WalletSummary } from "@/lib/blockscout";

// Deterministic star positions — same on SSR and client
const STARS = [
  { x:  8, y:  4, r: 1.5, o: 0.22 }, { x: 23, y: 11, r: 1.0, o: 0.14 },
  { x: 71, y:  6, r: 2.0, o: 0.18 }, { x: 89, y:  3, r: 1.0, o: 0.28 },
  { x:  5, y: 21, r: 1.0, o: 0.12 }, { x: 42, y: 17, r: 1.5, o: 0.17 },
  { x: 67, y: 24, r: 1.0, o: 0.20 }, { x: 94, y: 18, r: 2.0, o: 0.14 },
  { x: 15, y: 37, r: 1.0, o: 0.19 }, { x: 58, y: 34, r: 1.5, o: 0.23 },
  { x: 82, y: 41, r: 1.0, o: 0.17 }, { x:  3, y: 54, r: 2.0, o: 0.11 },
  { x: 31, y: 61, r: 1.0, o: 0.26 }, { x: 75, y: 57, r: 1.5, o: 0.21 },
  { x: 92, y: 64, r: 1.0, o: 0.14 }, { x: 19, y: 74, r: 2.0, o: 0.17 },
  { x: 47, y: 71, r: 1.0, o: 0.19 }, { x: 63, y: 79, r: 1.0, o: 0.23 },
  { x: 87, y: 77, r: 1.5, o: 0.11 }, { x: 12, y: 87, r: 1.0, o: 0.20 },
  { x: 36, y: 84, r: 2.0, o: 0.14 }, { x: 79, y: 91, r: 1.0, o: 0.26 },
  { x: 54, y: 89, r: 1.5, o: 0.17 }, { x: 96, y: 87, r: 1.0, o: 0.19 },
  { x: 28, y: 47, r: 1.0, o: 0.14 }, { x: 73, y: 43, r: 1.5, o: 0.20 },
  { x: 85, y: 29, r: 1.0, o: 0.23 }, { x:  6, y: 69, r: 1.5, o: 0.17 },
  { x: 43, y: 31, r: 1.0, o: 0.19 }, { x: 50, y: 14, r: 1.5, o: 0.18 },
];

const SUGGESTIONS = [
  "How can I save more each month?",
  "Am I spending too much on transfers?",
  "What does my money pattern say about me?",
];

export default function Home() {
  const router = useRouter();

  const [address, setAddress]           = useState<`0x${string}` | null>(null);
  const [balance, setBalance]           = useState<string | null>(null);
  const [summary, setSummary]           = useState<WalletSummary | null>(null);
  const [walletClient, setWalletClient] = useState<any>(null);
  const [status, setStatus]             = useState<"idle" | "paying" | "error">("idle");
  const [errorMsg, setErrorMsg]         = useState("");

  useEffect(() => {
    async function init() {
      try {
        const { walletClient: wc, address: addr } = await connectWallet();
        setWalletClient(wc);
        setAddress(addr);
        const [bal, summaryRes] = await Promise.all([
          getUSDCBalance(addr),
          fetch(`/api/summary?address=${addr}`).then((r) => r.json()),
        ]);
        setBalance(bal);
        setSummary(summaryRes);
      } catch (e: any) {
        setErrorMsg(e.message ?? "Could not connect wallet");
        setStatus("error");
      }
    }
    init();
  }, []);

  async function handleGetReading() {
    if (!address || !walletClient) return;
    const bal = parseFloat(balance ?? "0");
    if (bal < 0.05) {
      if (isMiniPay()) {
        window.location.href = "https://link.minipay.xyz/add_cash?tokens=USDC,USDT";
      } else {
        setErrorMsg("Add at least 0.05 USDC on Celo to your wallet and try again.");
        setStatus("error");
      }
      return;
    }
    try {
      setStatus("paying");
      const txHash = await payForReading(walletClient, address, QueryType.ORACLE);
      router.push(`/reading?address=${address}&tx=${txHash}`);
    } catch (e: any) {
      setErrorMsg(
        e.message?.includes("rejected")
          ? "Payment cancelled."
          : "Payment didn't go through. Your USDC was not charged."
      );
      setStatus("error");
    }
  }

  const hasHistory = summary?.hasHistory && (summary?.txCount ?? 0) > 0;
  const balanceNum = parseFloat(balance ?? "0");
  const lowBalance = balance !== null && balanceNum < 0.05;
  const health     = hasHistory && summary ? computeHealthScore(summary) : null;

  return (
    <main className="relative min-h-screen overflow-x-hidden" style={{ backgroundColor: "#090B14", color: "#F0F0F0" }}>

      {/* ── Cosmic star field ──────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          {STARS.map((s, i) => (
            <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="white" opacity={s.o} />
          ))}
        </svg>
      </div>

      {/* ── Ambient radial glow behind hero ───────────────────────── */}
      <div
        className="fixed top-[-60px] left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: 400,
          height: 400,
          background: "radial-gradient(ellipse at center, rgba(124,111,205,0.13) 0%, transparent 68%)",
        }}
        aria-hidden
      />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="relative flex items-center justify-between px-5 pt-12 pb-4">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#6B7280" }}>
          SOMA
        </span>
        {balance !== null && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: "5px 12px",
              borderRadius: 999,
              border: `1px solid ${lowBalance ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.20)"}`,
              backgroundColor: lowBalance ? "rgba(239,68,68,0.07)" : "rgba(245,158,11,0.07)",
              color: lowBalance ? "#F87171" : "#F59E0B",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {parseFloat(balance).toFixed(2)} USDC
          </span>
        )}
      </header>

      {/* ── Scrollable body ────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center px-5 gap-7 pb-56">

        {/* Hero */}
        <div className="mt-4">
          {health ? (
            <HealthGauge score={health.score} label={health.label} color={health.color} />
          ) : (
            <OracleMark connecting={!address} />
          )}
        </div>

        {/* Title */}
        <div className="text-center -mt-2" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.3 }}>
            {!address
              ? "Connecting…"
              : hasHistory
              ? "Your wallet has spoken."
              : "Soma is ready."}
          </h1>
          <p style={{ color: "#6B7280", fontSize: 13 }}>
            {hasHistory
              ? `${summary!.txCount} transactions · last 90 days`
              : "0.05 USDC per reading · no subscription"}
          </p>
        </div>

        {/* Stats card */}
        {hasHistory && summary && (
          <div
            className="w-full"
            style={{
              backgroundColor: "#0E1220",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 20,
            }}
          >
            <StatRow label="Received"     value={`$${summary.totalReceived.toFixed(2)}`} positive />
            <div style={{ height: 1, margin: "0 20px", backgroundColor: "rgba(255,255,255,0.05)" }} />
            <StatRow label="Sent"         value={`$${summary.totalSent.toFixed(2)}`} />
            <div style={{ height: 1, margin: "0 20px", backgroundColor: "rgba(255,255,255,0.05)" }} />
            <StatRow label="Transactions" value={`${summary.txCount}`} />
          </div>
        )}

        {/* Suggestions */}
        {!hasHistory && address && (
          <div className="w-full" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="w-full text-left transition-all active:scale-[0.98]"
                style={{
                  fontSize: 13,
                  borderRadius: 16,
                  padding: "14px 16px",
                  color: "#6B7280",
                  backgroundColor: "#0E1220",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div
            className="w-full text-center"
            style={{
              backgroundColor: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: 20,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <p style={{ color: "#F87171", fontSize: 14, fontWeight: 600 }}>
              {errorMsg || "Payment didn't go through"}
            </p>
            <p style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.6 }}>
              Your USDC was not charged.
            </p>
            <button
              onClick={() => setStatus("idle")}
              style={{ color: "#F59E0B", fontSize: 13, fontWeight: 500 }}
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* ── Fixed bottom CTA ───────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0">
        <div
          className="h-12 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, #090B14)" }}
        />
        <div style={{ backgroundColor: "#090B14", padding: "4px 20px 40px" }}>
          <p style={{ textAlign: "center", fontSize: 11, color: "#4B5060", marginBottom: 12, letterSpacing: "0.04em" }}>
            0.05 USDC · reading &nbsp;·&nbsp; 0.02 USDC · follow-up
          </p>

          {status !== "error" && (
            <button
              onClick={handleGetReading}
              disabled={status === "paying" || !address}
              className="w-full transition-all active:scale-[0.98]"
              style={{
                backgroundColor: "#F59E0B",
                color: "#080A11",
                fontWeight: 700,
                borderRadius: 999,
                fontSize: 15,
                letterSpacing: "-0.01em",
                padding: "18px 0",
                opacity: (status === "paying" || !address) ? 0.40 : 1,
                cursor: (status === "paying" || !address) ? "not-allowed" : "pointer",
                boxShadow: (status !== "paying" && !!address) ? "0 0 36px rgba(245,158,11,0.20)" : "none",
              }}
            >
              {status === "paying"
                ? "Settling payment…"
                : lowBalance
                ? "Add USDC to start"
                : "Get My Reading · 0.05 USDC"}
            </button>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, padding: "0 4px" }}>
            <a href="/stats"   style={{ fontSize: 11, color: "#4B5060" }}>Stats</a>
            <a href="/privacy" style={{ fontSize: 11, color: "#4B5060" }}>Privacy</a>
          </div>
        </div>
      </div>
    </main>
  );
}

// ── OracleMark ──────────────────────────────────────────────────────
function OracleMark({ connecting }: { connecting: boolean }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      {/* Purple ambient */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: "radial-gradient(ellipse at center, rgba(124,111,205,0.16) 0%, transparent 72%)" }}
      />
      {/* Atmospheric rings */}
      <div className="absolute inset-0 rounded-full"    style={{ border: "1px solid rgba(245,158,11,0.05)" }} />
      <div className="absolute rounded-full"            style={{ inset: 20, border: "1px solid rgba(245,158,11,0.09)" }} />
      <div className="absolute rounded-full"            style={{ inset: 40, border: "1px solid rgba(245,158,11,0.15)" }} />
      {connecting && (
        <div
          className="absolute rounded-full animate-ping"
          style={{ inset: 40, border: "1px solid rgba(245,158,11,0.30)", animationDuration: "1.8s" }}
        />
      )}
      <span className="relative z-10 select-none" style={{ fontSize: 52, color: "rgba(245,158,11,0.65)", lineHeight: 1 }}>
        ◈
      </span>
    </div>
  );
}

// ── HealthGauge ─────────────────────────────────────────────────────
// 270° SVG arc gauge — r=56, viewBox 128×128, center (64,64)
const CIRC = 2 * Math.PI * 56;
const ARC  = CIRC * 0.75;

function HealthGauge({ score, label, color }: { score: number; label: string; color: string }) {
  const filled   = (score / 100) * ARC;
  const dashArr  = `${filled} ${CIRC - filled}`;
  const trackArr = `${ARC} ${CIRC - ARC}`;

  return (
    <div className="flex flex-col items-center" style={{ gap: 12 }}>
      <div className="relative flex items-center justify-center">
        {/* Colored ambient behind gauge */}
        <div
          className="absolute"
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: `radial-gradient(ellipse at center, ${color}18 0%, transparent 68%)`,
          }}
          aria-hidden
        />
        <svg
          width="160"
          height="160"
          viewBox="0 0 128 128"
          aria-label={`Wallet health score: ${score} out of 100 — ${label}`}
          style={{ position: "relative", zIndex: 1 }}
        >
          {/* Atmospheric outer ring */}
          <circle cx="64" cy="64" r="62" fill="none" stroke={color} strokeWidth="1" opacity="0.07" />
          {/* Track */}
          <circle
            cx="64" cy="64" r="56" fill="none"
            stroke="#141829" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={trackArr} transform="rotate(135 64 64)"
          />
          {/* Score arc */}
          <circle
            cx="64" cy="64" r="56" fill="none"
            stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={dashArr} transform="rotate(135 64 64)"
            style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          />
          {/* Score number */}
          <text
            x="64" y="57" textAnchor="middle" dominantBaseline="middle"
            fill="#F0F0F0" fontSize="32" fontWeight="700"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {score}
          </text>
          {/* /100 label */}
          <text
            x="64" y="76" textAnchor="middle"
            fill="#4B5060" fontSize="11"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            / 100
          </text>
        </svg>
      </div>
      {/* Label badge */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          padding: "5px 12px",
          borderRadius: 999,
          backgroundColor: `${color}1A`,
          color,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── StatRow ──────────────────────────────────────────────────────────
function StatRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6B7280" }}>
        {label}
      </span>
      <span style={{ fontSize: 15, fontWeight: 600, color: positive ? "#10B981" : "#F0F0F0", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}
