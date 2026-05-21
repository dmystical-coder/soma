"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { connectWallet } from "@/lib/wallet";
import { payForReading, QueryType } from "@/lib/somaPay";
import { Suspense } from "react";

function ReadingContent() {
  const params   = useSearchParams();
  const router   = useRouter();
  const address  = params.get("address") as `0x${string}` | null;
  const txHash   = params.get("tx");

  const [reading, setReading]       = useState("");
  const [status, setStatus]         = useState<"loading" | "streaming" | "done" | "error">("loading");
  const [question, setQuestion]     = useState("");
  const [answer, setAnswer]         = useState("");
  const [askStatus, setAskStatus]   = useState<"idle" | "paying" | "loading" | "done">("idle");
  const [walletClient, setWalletClient] = useState<any>(null);
  const readingRef = useRef("");

  // Connect wallet
  useEffect(() => {
    connectWallet().then(({ walletClient: wc }) => setWalletClient(wc)).catch(() => {});
  }, []);

  // Fetch oracle reading
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

        // Handle non-streaming JSON (no tx history)
        const ct = res.headers.get("Content-Type") ?? "";
        if (ct.includes("application/json")) {
          const data = await res.json();
          readingRef.current = data.reading;
          setReading(data.reading);
          setStatus("done");
          return;
        }

        setStatus("streaming");
        const reader = res.body!.getReader();
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
          address, txHash: followTx, question,
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
    <main className="min-h-screen bg-[#0F1117] text-[#F0F0F0] flex flex-col">
      <header className="flex items-center px-4 pt-6 pb-2 gap-3">
        <button onClick={() => router.push("/")} className="text-[#8C8FA3] text-sm">
          ←
        </button>
        <span className="text-base font-semibold">Your Reading</span>
        <span className="ml-auto text-xs text-[#4B5060]">
          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </header>

      <div className="flex-1 px-4 pb-6 space-y-4 overflow-y-auto">
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-10 h-10 rounded-full bg-[#F59E0B]/20 flex items-center justify-center animate-pulse">
              <span className="text-xl">◈</span>
            </div>
            <p className="text-[#8C8FA3] text-sm">Reading your wallet…</p>
          </div>
        )}

        {status === "error" && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-center space-y-2">
            <p className="text-red-400 font-medium">Reading unavailable</p>
            <p className="text-[#8C8FA3] text-sm">Your USDC was not charged.</p>
            <button onClick={() => router.push("/")} className="text-[#F59E0B] text-sm underline">
              Go back
            </button>
          </div>
        )}

        {(status === "streaming" || status === "done") && reading && (
          <ReadingCard text={reading} />
        )}

        {status === "done" && (
          <>
            <div className="bg-[#1A1D27] rounded-2xl p-4 space-y-3">
              <p className="text-sm text-[#8C8FA3]">
                Ask a follow-up question <span className="text-[#F59E0B]">· 0.02 USDC</span>
              </p>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What else do you want to know?"
                rows={2}
                className="w-full bg-[#252836] rounded-xl px-3 py-2 text-sm text-[#F0F0F0] placeholder-[#4B5060] resize-none outline-none"
              />
              <button
                onClick={handleAsk}
                disabled={!question.trim() || askStatus === "paying" || askStatus === "loading"}
                className="w-full bg-[#F59E0B] text-[#0F1117] font-bold py-3 rounded-xl text-sm disabled:opacity-50"
              >
                {askStatus === "paying"
                  ? "Settling payment…"
                  : askStatus === "loading"
                  ? "Getting answer…"
                  : "Ask · 0.02 USDC"}
              </button>
            </div>

            {answer && (
              <div className="bg-[#1A1D27] rounded-2xl p-4">
                <p className="text-xs text-[#F59E0B] font-semibold uppercase tracking-wider mb-2">Answer</p>
                <p className="text-sm text-[#F0F0F0] leading-relaxed whitespace-pre-wrap">{answer}</p>
              </div>
            )}

            <button
              onClick={() => router.push("/")}
              className="w-full text-[#8C8FA3] text-sm py-3"
            >
              ← New reading
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function ReadingCard({ text }: { text: string }) {
  // Parse the 4 sections
  const sections = [
    { key: "MONEY SUMMARY",  color: "text-[#F59E0B]" },
    { key: "PATTERN",        color: "text-[#10B981]" },
    { key: "ORACLE INSIGHT", color: "text-[#60A5FA]" },
    { key: "YOUR TIP",       color: "text-[#F59E0B]" },
  ];

  const blocks: { label: string; color: string; body: string }[] = [];

  for (let i = 0; i < sections.length; i++) {
    const start = text.indexOf(sections[i].key);
    if (start === -1) continue;
    const end = i + 1 < sections.length ? text.indexOf(sections[i + 1].key) : text.length;
    const body = text
      .slice(start + sections[i].key.length, end === -1 ? undefined : end)
      .replace(/^[\s\-—]+/, "")
      .trim();
    blocks.push({ label: sections[i].key, color: sections[i].color, body });
  }

  if (blocks.length === 0) {
    return (
      <div className="bg-[#1A1D27] rounded-2xl p-5">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((b) => (
        <div key={b.label} className="bg-[#1A1D27] rounded-2xl p-4 space-y-1">
          <p className={`text-xs font-semibold uppercase tracking-wider ${b.color}`}>
            {b.label}
          </p>
          <p className="text-sm text-[#F0F0F0] leading-relaxed">{b.body}</p>
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
