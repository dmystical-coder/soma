import { encodeFunctionData, parseAbi, createPublicClient, createWalletClient, http, decodeEventLog } from "viem";
import { celo } from "viem/chains";
import { USDC_ADDRESS, USDC_FEE_ADAPTER } from "./wallet";

export const SOMA_PAY_ABI = parseAbi([
  "function payForReading(uint8 queryType) external",
  "function totalQueries() view returns (uint256)",
  "function readingCount(address) view returns (uint256)",
  "event QueryPaid(address indexed user, uint8 indexed queryType, uint256 amount, uint256 timestamp)",
]);

export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

export enum QueryType {
  ORACLE   = 0,
  FOLLOWUP = 1,
}

export const ORACLE_PRICE   = 50_000n;  // 0.05 USDC
export const FOLLOWUP_PRICE = 20_000n;  // 0.02 USDC

export function getSomaPayAddress(): `0x${string}` {
  const addr = process.env.NEXT_PUBLIC_SOMA_PAY_ADDRESS;
  if (!addr) throw new Error("NEXT_PUBLIC_SOMA_PAY_ADDRESS not set");
  return addr as `0x${string}`;
}

export async function payForReading(
  walletClient: any,
  userAddress: `0x${string}`,
  queryType: QueryType
) {
  const somaPayAddress = getSomaPayAddress();
  const price = queryType === QueryType.ORACLE ? ORACLE_PRICE : FOLLOWUP_PRICE;

  // Step 1: approve USDC spend
  const approveTx = await walletClient.sendTransaction({
    account: userAddress,
    chain: celo,
    to: USDC_ADDRESS,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [somaPayAddress, price],
    }),
    feeCurrency: USDC_FEE_ADAPTER,
  } as any);

  const publicClient = createPublicClient({ chain: celo, transport: http() });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });

  // Step 2: pay — this is the on-chain tx that powers the AI Track requirement
  const payTx = await walletClient.sendTransaction({
    account: userAddress,
    chain: celo,
    to: somaPayAddress,
    data: encodeFunctionData({
      abi: SOMA_PAY_ABI,
      functionName: "payForReading",
      args: [queryType],
    }),
    feeCurrency: USDC_FEE_ADAPTER,
  } as any);

  await publicClient.waitForTransactionReceipt({ hash: payTx });
  return payTx as `0x${string}`;
}

export async function verifyPaymentTx(
  txHash: string,
  expectedPayer: string,
  queryType: QueryType
): Promise<boolean> {
  const publicClient = createPublicClient({ chain: celo, transport: http() });
  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });
    if (receipt.status !== "success") return false;

    const somaPayAddress = getSomaPayAddress().toLowerCase();

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== somaPayAddress) continue;
      try {
        const { eventName, args } = decodeEventLog({
          abi: SOMA_PAY_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (eventName !== "QueryPaid") continue;
        const user  = (args as any).user      as string;
        const qType = (args as any).queryType as number;
        if (user.toLowerCase() !== expectedPayer.toLowerCase()) continue;
        if (Number(qType) !== queryType) continue;
        return true;
      } catch {
        // log doesn't match the ABI — skip
      }
    }
    return false;
  } catch {
    return false;
  }
}
