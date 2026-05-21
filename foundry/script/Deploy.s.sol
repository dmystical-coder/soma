// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SomaPay.sol";

contract DeployScript is Script {
    // USDC on Celo mainnet (6 decimals)
    address constant USDC_MAINNET = 0xcebA9300f2b948710d2653dD7B07f33A8B32118C;
    // USDC on Celo Alfajores testnet
    address constant USDC_TESTNET = 0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B;

    function run() external {
        uint256 chainId = block.chainid;
        address usdc    = chainId == 42220 ? USDC_MAINNET : USDC_TESTNET;

        console.log("Deploying SomaPay...");
        console.log("  Chain ID :", chainId);
        console.log("  Network  :", chainId == 42220 ? "Celo Mainnet" : "Celo Alfajores");
        console.log("  USDC     :", usdc);

        vm.startBroadcast();
        SomaPay somaPay = new SomaPay(usdc);
        vm.stopBroadcast();

        console.log("\n  SomaPay deployed to:", address(somaPay));
        console.log("  Owner              :", somaPay.owner());
        console.log("  ORACLE_PRICE       :", somaPay.ORACLE_PRICE(), "USDC units (0.05 USDC)");

        if (chainId == 42220) {
            console.log("\n  Celoscan: https://celoscan.io/address/", address(somaPay));
            console.log("\n  Verify with:");
            console.log("    forge verify-contract --chain-id 42220 --compiler-version 0.8.20");
            console.log("    --constructor-args $(cast abi-encode 'constructor(address)' ", usdc, ")");
            console.log("    <ADDRESS> src/SomaPay.sol:SomaPay --verifier-url https://api.celoscan.io/api --etherscan-api-key $CELOSCAN_API_KEY");
        }
    }
}
