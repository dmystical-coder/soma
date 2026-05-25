import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchWalletSummary } from "@/lib/blockscout";
import { FOLLOWUP_SYSTEM_PROMPT, buildFollowUpUserMessage } from "@/lib/prompt";
import { verifyPaymentTx, QueryType } from "@/lib/somaPay";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { address, txHash, question, originalReading } = await req.json();

    if (!address || !txHash || !question) {
      return Response.json({ error: "address, txHash, and question required" }, { status: 400 });
    }

    const valid = await verifyPaymentTx(txHash, address, QueryType.FOLLOWUP);
    if (!valid) {
      return Response.json(
        { error: "Payment not verified. Your USDC was not charged." },
        { status: 402 }
      );
    }

    const summary = await fetchWalletSummary(address);

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: FOLLOWUP_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildFollowUpUserMessage(summary, originalReading ?? "", question),
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    return Response.json({ answer: text });
  } catch (err) {
    console.error("Follow-up error:", err);
    return Response.json({ error: "Could not process question." }, { status: 500 });
  }
}
