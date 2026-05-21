"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { connectWallet, getUSDCBalance } from "@/lib/wallet";
import { payForReading, QueryType } from "@/lib/somaPay";
import type { WalletSummary } from "@/lib/blockscout";

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
      window.location.href = "https://link.minipay.xyz/add_cash?tokens=USDC,USDT";
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

  return (
    <main className="min-h-screen bg-[#0F1117] text-[#F0F0F0] flex flex-col">
      <header className="flex items-center justify-between px-4 pt-6 pb-2">
        <span className="text-lg font-bold tracking-tight">Soma</span>
        {balance !== null && (
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${
            lowBalance ? "bg-red-500/20 text-red-400" : "bg-[#1A1D27] text-[#F59E0B]"
          }`}>
            {parseFloat(balance).toFixed(2)} USDC
          </span>
        )}
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        <div className="relative flex items-center justify-center w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-[#F59E0B]/10 animate-pulse" />
          <span className="text-4xl select-none">◈</span>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">
            {!address ? "Connecting…" : hasHistory ? "Your wallet has spoken." : "Soma is ready."}
          </h1>
          <p className="text-[#8C8FA3] text-sm">
            {hasHistory
              ? `${summary!.txCount} transactions in 90 days · ready to be read`
              : "Pay 0.05 USDC per reading. No subscription."}
          </p>
        </div>

        {hasHistory && (
          <div className="w-full max-w-xs bg-[#1A1D27] rounded-2xl p-4 space-y-2 text-sm">
            <Row label="Sent"         value={`$${summary!.totalSent.toFixed(2)}`} />
            <Row label="Received"     value={`$${summary!.totalReceived.toFixed(2)}`} />
            <Row label="Transactions" value={String(summary!.txCount)} />
          </div>
        )}

        {!hasHistory && address && (
          <div className="w-full max-w-xs space-y-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="w-full text-left text-sm bg-[#1A1D27] rounded-xl px-4 py-3 text-[#8C8FA3] hover:text-[#F0F0F0] transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="w-full max-w-xs bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
            <p className="text-red-400 text-sm font-medium">Payment didn&apos;t go through</p>
            <p className="text-[#8C8FA3] text-xs mt-1">{errorMsg || "Your USDC was not charged."}</p>
            <button onClick={() => setStatus("idle")} className="mt-3 text-sm text-[#F59E0B] underline">Try again</button>
          </div>
        )}

        {status !== "error" && (
          <button
            onClick={handleGetReading}
            disabled={status === "paying" || !address}
            className="w-full max-w-xs bg-[#F59E0B] text-[#0F1117] font-bold py-4 rounded-2xl text-base disabled:opacity-50 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]"
          >
            {status === "paying" ? "Settling payment…" : lowBalance ? "Add USDC to start" : "Get My Reading · 0.05 USDC"}
          </button>
        )}

        <p className="text-[#4B5060] text-xs">0.05 USDC per reading · 0.02 USDC per follow-up</p>
      </div>

      <footer className="px-4 py-4 flex justify-between text-xs text-[#4B5060]">
        <a href="/stats">Stats</a>
        <a href="https://t.me/soma_support" target="_blank" rel="noreferrer">Support</a>
        <a href="/privacy">Privacy</a>
      </footer>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#8C8FA3]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

