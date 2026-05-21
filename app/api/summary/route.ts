import { NextRequest } from "next/server";
import { fetchWalletSummary } from "@/lib/blockscout";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return Response.json({ error: "address required" }, { status: 400 });
  }
  const summary = await fetchWalletSummary(address);
  return Response.json(summary);
}
