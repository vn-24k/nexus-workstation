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
    const { url, start = "0", end, duration = "30", bridgeUrl } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ ok: false, error: "Link do YouTube não fornecido." }, { status: 400 });
    }

    const cleanUrl = url.trim();
    if (!cleanUrl.includes("youtube.com/") && !cleanUrl.includes("youtu.be/")) {
      return NextResponse.json({ ok: false, error: "URL inválida. Envie um link válido do YouTube." }, { status: 400 });
    }

    const targetBridge = getBridgeUrl(bridgeUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const bridgeRes = await fetch(`${targetBridge}/youtube-audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: cleanUrl, start, end, duration }),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!bridgeRes.ok) {
      const errData = await bridgeRes.json().catch(() => ({ error: `Falha HTTP ${bridgeRes.status}` }));
      return NextResponse.json({ ok: false, error: errData.error || "Falha na ponte de extração do YouTube." }, { status: bridgeRes.status });
    }

    const data = await bridgeRes.json();
    if (data.streamUrl && !data.streamUrl.startsWith("http")) {
      data.streamUrl = `${targetBridge}${data.streamUrl}`;
    }
    if (data.sampleUrl && !data.sampleUrl.startsWith("http")) {
      data.sampleUrl = `${targetBridge}${data.sampleUrl}`;
    }
    return NextResponse.json(data);
  } catch (err: any) {
    if (err.name === "AbortError") {
      return NextResponse.json({ ok: false, error: "Tempo limite excedido na extração do vídeo." }, { status: 504 });
    }
    return NextResponse.json({ ok: false, error: err.message || "Erro interno no servidor de áudio." }, { status: 500 });
  }
}
