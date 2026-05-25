# Soma — Your On-Chain Financial Oracle

> **Read your wallet. Know your money.**

Soma is a MiniPay MiniApp that reads your on-chain stablecoin transaction history and delivers a personalized AI financial reading — for **0.05 USDC**. No subscription. No sign-up. Just pay and ask.

Built for the 14M+ MiniPay users across Africa and Southeast Asia who move real money on-chain every day but have no simple way to understand what their wallet history is actually telling them.

---

## How It Works

1. Open Soma inside MiniPay — wallet auto-connects, no "Connect Wallet" button
2. Soma fetches your last 90 days of USDC/USDT/USDm activity from Celo
3. Tap **Get My Reading** — pay 0.05 USDC directly through the `SomaPay` contract
4. The on-chain `QueryPaid` event is verified before the AI is called
5. Claude Haiku streams back a 4-section personalized oracle reading:
   - **Money Summary** — what happened with your money this period
   - **Pattern** — behavioral patterns visible in your transactions
   - **Oracle Insight** — what the data says about your financial trajectory
   - **Your Tip** — one concrete action specific to your situation
6. Ask follow-up questions for 0.02 USDC each

---

## Live Deployment

| | |
|---|---|
| **App** | https://soma-protocol.vercel.app |
| **SomaPay contract** | [`0xebFb9E2dD4d932fdA3A39247959c29FAc6F44d8A`](https://celoscan.io/address/0xebFb9E2dD4d932fdA3A39247959c29FAc6F44d8A) — Celo Mainnet |
| **ERC-8004 Agent** | [8004scan.io/agents/celo/...](http://8004scan.io/agents/celo/) |
| **Self Agent ID** | [selfagentid.xyz](https://selfagentid.xyz) |
| **Chain** | Celo Mainnet (chainId 42220) |

---

## AI Track — Proof of Ship Season 2

Soma qualifies for the **+$250 AI Track bonus** by satisfying all three requirements:

| Requirement | Implementation |
|---|---|
| ERC-8004 registered agent | Agent NFT minted on Identity Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Self Agent ID via selfxyz | Soulbound NFT on `SelfAgentRegistry` `0xaC3DF9ABf80d0F5c020C06B04Cced27763355944` |
| On-chain wallet transactions | Every reading = 1 `SomaPay.payForReading()` call settling USDC on Celo mainnet |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Wallet | viem + MiniPay (`window.ethereum.isMiniPay`) |
| Payment | `SomaPay.sol` on Celo mainnet + thirdweb x402 |
| AI | Claude Haiku (Anthropic), streamed response |
| On-chain data | Blockscout public API — no API key required |
| Agent identity | ERC-8004 (`@chaoschain/sdk`) + Self Agent ID |
| Deployment | Vercel (serverless API routes) |
| Analytics | The Graph subgraph indexing `QueryPaid` events |

---

## Smart Contract

**`SomaPay.sol`** — deployed and verified on Celo mainnet.

```
Oracle reading:  0.05 USDC  → payForReading(QueryType.ORACLE)
Follow-up:       0.02 USDC  → payForReading(QueryType.FOLLOWUP)
```

Every payment emits a `QueryPaid(address user, QueryType, uint256 amount, uint256 timestamp)` event. The API verifies this event on-chain before calling the AI — so the AI is never called without a confirmed on-chain payment.

```solidity
event QueryPaid(
    address indexed user,
    QueryType indexed queryType,
    uint256 amount,
    uint256 timestamp
);
```

→ [View on Celoscan](https://celoscan.io/address/0xebFb9E2dD4d932fdA3A39247959c29FAc6F44d8A)
→ [View QueryPaid events](https://celoscan.io/address/0xebFb9E2dD4d932fdA3A39247959c29FAc6F44d8A#events)

---

## Supported Tokens

| Token | Address | Decimals |
|---|---|---|
| USDC | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` | 6 |
| USDT | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` | 6 |
| USDm | `0x765DE816845861e75A25fCA122bb6898B8B1282a` | 18 |

Soma reads balances and history for all three. Payment goes through USDC. Gas is paid via CIP-64 fee abstraction (no CELO needed).

---

## Local Development

### Prerequisites

- Node.js 18+
- A physical Android device with MiniPay installed
- ngrok (for MiniPay WebView testing)

### Setup

```bash
git clone https://github.com/dmystical-coder/soma
cd soma
npm install
cp .env.local.example .env.local   # fill in your keys
npm run dev
```

### Environment variables

```bash
# Smart contract
NEXT_PUBLIC_SOMA_PAY_ADDRESS=       # deployed SomaPay address
DEPLOYER_PRIVATE_KEY=               # wallet for deployment scripts

# AI
ANTHROPIC_API_KEY=                  # claude.ai/settings

# Thirdweb (x402)
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=     # thirdweb.com/dashboard
THIRDWEB_SECRET_KEY=

# Celoscan (contract verification)
CELOSCAN_API_KEY=                   # celoscan.io/myapikey

# App
NEXT_PUBLIC_URL=https://your-app.vercel.app
```

### Testing in MiniPay

MiniPay requires a physical Android device and HTTPS — it cannot load localhost.

```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000
```

1. Open MiniPay → Settings → About → tap version 7× to enable Developer Settings
2. Enable Developer Mode
3. Enter your ngrok HTTPS URL in **Load Test Page**
4. Use Chrome DevTools (`chrome://inspect`) via USB for debugging

---

## Contract Deployment

```bash
# Deploy to Celo mainnet
npx hardhat run scripts/deploy.ts --network celo

# Verify source on Celoscan
npx hardhat verify --network celo <DEPLOYED_ADDRESS> "0xcebA9300f2b948710d2653dD7B07f33A8B32118C"
```

## ERC-8004 Agent Registration

```bash
# One-time — run after deployment, requires DEPLOYER_PRIVATE_KEY
npx ts-node scripts/register-8004.ts
```

Then complete **Self Agent ID** registration at [selfagentid.xyz](https://selfagentid.xyz) — requires scanning your passport with the Self mobile app.

---

## Project Structure

```
soma/
├── contracts/
│   └── SomaPay.sol          # Payment contract — core on-chain deployment
├── scripts/
│   ├── deploy.ts            # Hardhat deploy to Celo mainnet
│   └── register-8004.ts     # One-time ERC-8004 agent registration
├── app/
│   ├── page.tsx             # Home — wallet preview + reading CTA
│   ├── reading/page.tsx     # Streaming oracle output + follow-up
│   ├── stats/page.tsx       # Public analytics dashboard
│   └── api/
│       ├── oracle/          # Verify payment → call Claude → stream
│       ├── followup/        # Follow-up Q&A (0.02 USDC)
│       └── summary/         # Wallet preview (unauthenticated)
├── lib/
│   ├── wallet.ts            # MiniPay auto-connect, USDC balance
│   ├── blockscout.ts        # 90-day transaction history parser
│   ├── somaPay.ts           # Contract interaction + payment verification
│   └── prompt.ts            # Oracle + follow-up prompt builders
└── public/
    ├── agent-metadata.json  # ERC-8004 agent metadata
    └── .well-known/
        └── agent.json       # A2A protocol discovery endpoint
```

---

## Why Soma

Most AI tools cost $20/month — more than many MiniPay users earn in a day. Soma flips the model: pay 5 cents, get a reading grounded in your actual financial behavior. No account. No recurring charge. The AI only sees what your wallet already shows the world.

The name is Swahili for *"to read."*

---

## Celo Proof of Ship — Season 2

Built for the [Celo Proof of Ship Season 2](https://celopg.eco) builder program.

**Category:** AI Agents — *"pay as you go access to LLMs as an alternative to subscriptions"*

---

## License

MIT
