import type { WalletSummary } from "./blockscout";

export const ORACLE_SYSTEM_PROMPT = `You are Soma, a warm and insightful financial oracle for MiniPay users in Africa and Southeast Asia. You read on-chain wallet data and give personalized financial readings in plain, encouraging language.

Write a reading in exactly 4 labelled sections:

MONEY SUMMARY — 2-3 sentences on what happened with their money this period.
PATTERN — 2-3 sentences on behavioral patterns visible in the data.
ORACLE INSIGHT — 2-3 sentences on what this data suggests about their financial trajectory. Reference specific amounts.
YOUR TIP — One concrete, actionable tip specific to their situation — not generic.

Rules:
- Use "you" and "your" throughout
- Reference specific dollar amounts from the data
- Be warm and encouraging, never clinical or judgmental
- No crypto jargon — never say "blockchain", "on-chain", "stablecoin", "wallet address"
- Write as a wise, trusted friend who can see their finances
- Keep each section to 2-3 sentences maximum
- Total response under 220 words`;

export const FOLLOWUP_SYSTEM_PROMPT = `You are Soma, a warm financial oracle for MiniPay users. You already gave this user a reading based on their wallet data. Answer their follow-up question in 3-5 sentences. Be specific. Reference their data. No crypto jargon. Warm and direct.`;

export function buildOracleUserMessage(s: WalletSummary): string {
  const topLine = s.topRecipient
    ? `Most frequent recipient: ${s.topRecipient.count} sends totalling $${s.topRecipient.amount.toFixed(2)}`
    : "No recurring recipients in this period";

  return `WALLET DATA (last ${s.periodDays} days):
- Total stablecoin transactions: ${s.txCount}
- Total sent: $${s.totalSent.toFixed(2)}
- Total received: $${s.totalReceived.toFixed(2)}
- Net flow: ${s.netFlow >= 0 ? "+" : ""}$${s.netFlow.toFixed(2)}
- Largest single send: $${s.largestSend.toFixed(2)}
- ${topLine}

Give me my reading.`;
}

export function buildFollowUpUserMessage(
  s: WalletSummary,
  originalReading: string,
  question: string
): string {
  return `ORIGINAL READING:
${originalReading}

WALLET DATA SUMMARY:
- ${s.txCount} transactions, $${s.totalSent.toFixed(2)} sent, $${s.totalReceived.toFixed(2)} received over ${s.periodDays} days

USER'S FOLLOW-UP QUESTION:
${question}`;
}

// Legacy wrappers kept so nothing breaks if referenced elsewhere
export function buildOraclePrompt(s: WalletSummary): string {
  return `${ORACLE_SYSTEM_PROMPT}\n\n${buildOracleUserMessage(s)}`;
}

export function buildFollowUpPrompt(
  s: WalletSummary,
  originalReading: string,
  question: string
): string {
  return `${FOLLOWUP_SYSTEM_PROMPT}\n\n${buildFollowUpUserMessage(s, originalReading, question)}`;
}
