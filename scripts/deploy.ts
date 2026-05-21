import { ethers } from "hardhat";

// USDC on Celo mainnet (6 decimals)
const USDC_CELO = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
// USDC on Celo Sepolia testnet
const USDC_SEPOLIA = "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const isMainnet = network.chainId === 42220n;
  const usdcAddress = isMainnet ? USDC_CELO : USDC_SEPOLIA;

  console.log("Deploying SomaPay...");
  console.log("  Network :", isMainnet ? "Celo Mainnet" : "Celo Sepolia");
  console.log("  Deployer:", deployer.address);
  console.log("  USDC    :", usdcAddress);

  const SomaPay = await ethers.getContractFactory("SomaPay");
  const somaPay = await SomaPay.deploy(usdcAddress);
  await somaPay.waitForDeployment();

  const address = await somaPay.getAddress();
  console.log("\n✅ SomaPay deployed to:", address);
  console.log("   Celoscan:", isMainnet
    ? `https://celoscan.io/address/${address}`
    : `https://alfajores.celoscan.io/address/${address}`
  );
  console.log("\nNext: add to .env.local:");
  console.log(`  NEXT_PUBLIC_SOMA_PAY_ADDRESS=${address}`);
  console.log("\nThen verify:");
  console.log(`  npx hardhat verify --network ${isMainnet ? "celo" : "celoSepolia"} ${address} "${usdcAddress}"`);
}

main().catch((e) => { console.error(e); process.exit(1); });
