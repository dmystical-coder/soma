export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0F1117] text-[#F0F0F0] px-4 pt-10 pb-16 max-w-prose mx-auto">
      <a href="/" className="text-[#8C8FA3] text-sm">← Back</a>

      <h1 className="text-2xl font-bold mt-6 mb-1">Privacy Policy</h1>
      <p className="text-[#8C8FA3] text-xs mb-8">Effective date: May 2026</p>

      <Section title="What Soma reads">
        <p>
          Soma reads publicly available on-chain transaction data associated with the wallet
          address you connect. This includes token transfer amounts, timestamps, and counterparty
          addresses — all of which are already public on the Celo blockchain.
        </p>
        <p className="mt-2">
          Soma never asks for your seed phrase, private key, or any personal identifying
          information.
        </p>
      </Section>

      <Section title="What Soma sends to AI">
        <p>
          When you pay for a reading, aggregated statistics derived from your transaction history
          (total sent, total received, transaction count, net flow) are sent to Anthropic&apos;s
          Claude API to generate your reading. Raw wallet addresses and individual transaction
          details are not included in the prompt.
        </p>
      </Section>

      <Section title="Payments">
        <p>
          Payment is handled on-chain through the SomaPay smart contract on Celo mainnet.
          Soma does not store your payment card details, bank information, or any off-chain
          payment data.
        </p>
      </Section>

      <Section title="Data retention">
        <p>
          Soma does not maintain a database of users or readings. Each reading is stateless —
          your wallet data is fetched, processed, and discarded per request. No account is
          created.
        </p>
      </Section>

      <Section title="Third parties">
        <p>
          Soma uses the following third-party services:
        </p>
        <ul className="mt-2 space-y-1 text-sm text-[#8C8FA3]">
          <li>• <span className="text-[#F0F0F0]">Blockscout</span> — to fetch public on-chain transaction history</li>
          <li>• <span className="text-[#F0F0F0]">Anthropic</span> — to generate AI readings (subject to Anthropic&apos;s privacy policy)</li>
          <li>• <span className="text-[#F0F0F0]">Vercel</span> — to host the application</li>
        </ul>
      </Section>

      <Section title="Contact">
        <p>
          Questions? Reach us at{" "}
          <a href="https://t.me/soma_support" className="text-[#F59E0B] underline" target="_blank" rel="noreferrer">
            t.me/soma_support
          </a>
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-[#F59E0B] mb-2">{title}</h2>
      <div className="text-sm text-[#C0C2D0] leading-relaxed">{children}</div>
    </section>
  );
}
