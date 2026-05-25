import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchWalletSummary } from "@/lib/blockscout";
import { ORACLE_SYSTEM_PROMPT, buildOracleUserMessage } from "@/lib/prompt";
import { verifyPaymentTx, QueryType } from "@/lib/somaPay";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { address, txHash } = await req.json();

    if (!address || !txHash) {
      return Response.json({ error: "address and txHash required" }, { status: 400 });
    }

    // Verify the on-chain payment before calling AI
    const valid = await verifyPaymentTx(txHash, address, QueryType.ORACLE);
    if (!valid) {
      return Response.json(
        { error: "Payment not verified. Your USDC was not charged." },
        { status: 402 }
      );
    }

    const summary = await fetchWalletSummary(address);

    if (!summary.hasHistory) {
      return Response.json({
        reading: `MONEY SUMMARY\nYour wallet is just getting started — no stablecoin activity found in the last 90 days yet.\n\nPATTERN\nEvery great financial story starts somewhere. Yours is about to begin.\n\nORACLE INSIGHT\nAdd some USDC or USDT to your wallet and start transacting. Return for your first real reading once you have some history.\n\nYOUR TIP\nStart small — even a $1 transaction gives Soma something to work with.`,
        summary,
      });
    }

    // Stream the oracle reading — system prompt is cached across requests
    const stream = await anthropic.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: ORACLE_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: buildOracleUserMessage(summary) }],
    } as any);

    // Return as a streaming text response
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Wallet-Summary": JSON.stringify({
          txCount: summary.txCount,
          totalSent: summary.totalSent.toFixed(2),
          totalReceived: summary.totalReceived.toFixed(2),
        }),
      },
    });
  } catch (err) {
    console.error("Oracle error:", err);
    return Response.json({ error: "Oracle unavailable. Please try again." }, { status: 500 });
  }
}
