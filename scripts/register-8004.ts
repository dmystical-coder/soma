/**
 * One-time ERC-8004 agent registration on Celo mainnet.
 *
 * 1. Host the agentMetadata JSON at a stable public URL (or pin to IPFS).
 * 2. Set DEPLOYER_PRIVATE_KEY in .env.local.
 * 3. Run: npx ts-node scripts/register-8004.ts
 */
import { createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

const IDENTITY_ABI = parseAbi([
  "function register(string agentURI) returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]);

const agentMetadata = {
  type: "Agent",
  name: "Soma",
  description:
    "On-chain financial oracle. Reads MiniPay wallet history and delivers personalized financial insights for users in Africa and Southeast Asia.",
  image: `${process.env.NEXT_PUBLIC_URL}/agent-logo.png`,
  endpoints: [
    { type: "a2a",    url: `${process.env.NEXT_PUBLIC_URL}/.well-known/agent.json` },
    { type: "wallet", address: process.env.TREASURY_ADDRESS ?? "", chainId: 42220 },
  ],
  supportedTrust: ["reputation"],
};

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");

  const account = privateKeyToAccount(pk as `0x${string}`);
  const client  = createWalletClient({ chain: celo, transport: http(), account });

  // Option A: host metadata at a public HTTPS URL
  // Upload agentMetadata JSON to your Vercel deployment and use:
  const agentURI = `${process.env.NEXT_PUBLIC_URL}/agent-metadata.json`;

  // Option B: pin to IPFS (Pinata / web3.storage) and use ipfs://CID

  console.log("Registering Soma agent on ERC-8004 Identity Registry…");
  console.log("Agent metadata:", JSON.stringify(agentMetadata, null, 2));
  console.log("URI:", agentURI);

  const txHash = await client.writeContract({
    address: IDENTITY_REGISTRY,
    abi: IDENTITY_ABI,
    functionName: "register",
    args: [agentURI],
  });

  console.log("\n✅ Registration tx:", txHash);
  console.log("   Celoscan: https://celoscan.io/tx/" + txHash);
  console.log("\nNote: your agentId (tokenId) is in the Transfer event log.");
  console.log("View at: http://8004scan.io/agents/celo/<agentId>");
}

main().catch((e) => { console.error(e); process.exit(1); });
