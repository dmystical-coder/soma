const BLOCKSCOUT = "https://explorer.celo.org/mainnet/api/v2";

const STABLECOINS: Record<string, { symbol: string; decimals: number }> = {
  "0xceba9300f2b948710d2653ddd7b07f33a8b32118c": { symbol: "USDC", decimals: 6  },
  "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e": { symbol: "USDT", decimals: 6  },
  "0x765de816845861e75a25fca122bb6898b8b1282a": { symbol: "USDm", decimals: 18 },
};

export interface WalletSummary {
  address:       string;
  txCount:       number;
  totalSent:     number;
  totalReceived: number;
  netFlow:       number;
  largestSend:   number;
  topRecipient:  { address: string; amount: number; count: number } | null;
  periodDays:    number;
  hasHistory:    boolean;
}

interface BlockscoutTransfer {
  token:     { address: string };
  from:      { hash: string };
  to:        { hash: string };
  total:     { value: string };
  timestamp: string;
}

export async function fetchWalletSummary(address: string): Promise<WalletSummary> {
  const url = `${BLOCKSCOUT}/addresses/${address}/token-transfers?type=ERC-20&limit=100`;
  const res = await fetch(url, { next: { revalidate: 300 } });

  if (!res.ok) {
    return emptyWalletSummary(address);
  }

  const json = await res.json();
  const items: BlockscoutTransfer[] = json.items ?? [];
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;

  const txs = items
    .filter((tx) => STABLECOINS[tx.token?.address?.toLowerCase()])
    .filter((tx) => new Date(tx.timestamp).getTime() > cutoff)
    .map((tx) => {
      const meta   = STABLECOINS[tx.token.address.toLowerCase()];
      const amount = Number(tx.total?.value ?? 0) / 10 ** meta.decimals;
      const isSend = tx.from?.hash?.toLowerCase() === address.toLowerCase();
      return {
        amount,
        isSend,
        counterparty: isSend ? tx.to?.hash : tx.from?.hash,
      };
    });

  if (txs.length === 0) return emptyWalletSummary(address);

  const sends    = txs.filter((t) => t.isSend);
  const receives = txs.filter((t) => !t.isSend);
  const totalSent     = sends.reduce((s, t) => s + t.amount, 0);
  const totalReceived = receives.reduce((s, t) => s + t.amount, 0);

  // top recipient by total value
  const byRecipient: Record<string, { amount: number; count: number }> = {};
  sends.forEach((t) => {
    if (!t.counterparty) return;
    const key = t.counterparty.toLowerCase();
    if (!byRecipient[key]) byRecipient[key] = { amount: 0, count: 0 };
    byRecipient[key].amount += t.amount;
    byRecipient[key].count  += 1;
  });
  const topEntry = Object.entries(byRecipient).sort((a, b) => b[1].amount - a[1].amount)[0];

  return {
    address,
    txCount:       txs.length,
    totalSent,
    totalReceived,
    netFlow:       totalReceived - totalSent,
    largestSend:   sends.length ? Math.max(...sends.map((t) => t.amount)) : 0,
    topRecipient:  topEntry
      ? { address: topEntry[0], amount: topEntry[1].amount, count: topEntry[1].count }
      : null,
    periodDays:    90,
    hasHistory:    true,
  };
}

function emptyWalletSummary(address: string): WalletSummary {
  return {
    address,
    txCount: 0, totalSent: 0, totalReceived: 0,
    netFlow: 0, largestSend: 0, topRecipient: null,
    periodDays: 90, hasHistory: false,
  };
}
