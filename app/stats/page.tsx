import { createPublicClient, http, formatUnits } from "viem";
import { celo } from "viem/chains";

const SOMA_PAY_ABI = [
  { name: "totalQueries", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
] as const;

async function getStats() {
  const addr = process.env.NEXT_PUBLIC_SOMA_PAY_ADDRESS as `0x${string}` | undefined;
  if (!addr) return { totalQueries: "—", deployed: false };

  try {
    const client = createPublicClient({ chain: celo, transport: http() });
    const total  = await client.readContract({
      address: addr, abi: SOMA_PAY_ABI, functionName: "totalQueries",
    });
    return { totalQueries: total.toString(), deployed: true };
  } catch {
    return { totalQueries: "—", deployed: false };
  }
}

export default async function StatsPage() {
  const stats = await getStats();

  return (
    <main className="min-h-screen bg-[#0F1117] text-[#F0F0F0] px-4 pt-10 pb-16">
      <h1 className="text-2xl font-bold mb-1">Soma Stats</h1>
      <p className="text-[#8C8FA3] text-sm mb-8">Live on-chain data from Celo mainnet</p>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Readings" value={stats.totalQueries} />
        <StatCard label="Chain" value="Celo" />
        <StatCard label="Reading Price" value="0.05 USDC" />
        <StatCard label="Follow-up Price" value="0.02 USDC" />
      </div>

      {stats.deployed && (
        <div className="mt-6">
          <p className="text-xs text-[#4B5060] mb-1">Contract</p>
          <a
            href={`https://celoscan.io/address/${process.env.NEXT_PUBLIC_SOMA_PAY_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#F59E0B] break-all"
          >
            {process.env.NEXT_PUBLIC_SOMA_PAY_ADDRESS} ↗
          </a>
        </div>
      )}

      <p className="mt-8 text-xs text-[#4B5060]">
        Per-user metrics and daily volume will be added via The Graph subgraph indexing QueryPaid events.
      </p>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#1A1D27] rounded-2xl p-4">
      <p className="text-xs text-[#8C8FA3] mb-1">{label}</p>
      <p className="text-xl font-bold text-[#F59E0B]">{value}</p>
    </div>
  );
}
