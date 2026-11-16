import { NextRequest, NextResponse } from "next/server";
import fs from "fs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getBridgeUrl(custom?: string): string {
  if (custom && custom.startsWith("http")) return custom.trim().replace(/\/$/, "");

  try {
    const configPath = "/root/.config/bridge_tunnel_url";
    if (fs.existsSync(configPath)) {
      const saved = fs.readFileSync(configPath, "utf8").trim();
      if (saved.startsWith("http")) return saved.replace(/\/$/, "");
    }
  } catch (e) {}

  return (process.env.WHATSAPP_BRIDGE_URL || "https://always-chairs-evaluated-flyer.trycloudflare.com").replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, start = "0", end = "30", bridgeUrl } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ ok: false, error: "Link do YouTube não fornecido." }, { status: 400 });
    }

    const targetBridge = getBridgeUrl(bridgeUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const bridgeRes = await fetch(`${targetBridge}/youtube-transcript`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), start, end }),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    const data = await bridgeRes.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Erro ao obter transcrição da fala." }, { status: 500 });
  }
}
