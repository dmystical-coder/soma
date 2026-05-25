import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  formatUnits,
  encodeFunctionData,
  parseAbi,
} from "viem";
import { celo } from "viem/chains";

export const USDC_ADDRESS   = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as const;
export const USDT_ADDRESS   = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as const;
export const USDM_ADDRESS   = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;
// feeCurrency adapters (CIP-64) — NOT the token addresses
export const USDC_FEE_ADAPTER = "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B" as const;
export const USDT_FEE_ADAPTER = "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72" as const;

const ERC20_ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

export function isMiniPay(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as any).ethereum?.isMiniPay === true
  );
}

export function getPublicClient() {
  return createPublicClient({ chain: celo, transport: http() });
}

export async function connectWallet() {
  if (typeof window === "undefined") throw new Error("Browser only");
  const ethereum = (window as any).ethereum;
  if (!ethereum) throw new Error("No wallet found — open in MiniPay");

  // MiniPay auto-injects the address; other wallets need an explicit request
  if (!isMiniPay()) {
    await ethereum.request({ method: "eth_requestAccounts" });
    // Switch to Celo mainnet (chainId 42220 = 0xa4ec)
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xa4ec" }],
      });
    } catch (switchErr: any) {
      if (switchErr.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0xa4ec",
            chainName: "Celo Mainnet",
            nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
            rpcUrls: ["https://forno.celo.org"],
            blockExplorerUrls: ["https://celoscan.io"],
          }],
        });
      }
    }
  }

  const walletClient = createWalletClient({
    chain: celo,
    transport: custom(ethereum),
  });
  const [address] = await walletClient.getAddresses();
  if (!address) throw new Error("No account connected");
  return { walletClient, address };
}

export async function getUSDCBalance(address: `0x${string}`): Promise<string> {
  const client = getPublicClient();
  const raw = await client.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
  });
  return formatUnits(raw as bigint, 6);
}

export async function approveUSDC(
  walletClient: ReturnType<typeof createWalletClient>,
  spender: `0x${string}`,
  amount: bigint,
  userAddress: `0x${string}`
) {
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spender, amount],
  });
  return walletClient.sendTransaction({
    account: userAddress,
    chain: celo,
    to: USDC_ADDRESS,
    data,
    feeCurrency: USDC_FEE_ADAPTER,
  } as any);
}
