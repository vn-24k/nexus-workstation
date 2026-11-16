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

// GET: Listar pastas e áudios
export async function GET(req: NextRequest) {
  try {
    const targetBridge = getBridgeUrl();
    const res = await fetch(`${targetBridge}/library`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.audios && Array.isArray(data.audios)) {
      data.audios = data.audios.map((a: any) => ({
        ...a,
        streamUrl: a.streamUrl && !a.streamUrl.startsWith("http") ? `${targetBridge}${a.streamUrl}` : a.streamUrl,
        sampleUrl: a.sampleUrl && !a.sampleUrl.startsWith("http") ? `${targetBridge}${a.sampleUrl}` : a.sampleUrl,
      }));
    }
    return NextResponse.json(data);
  } catch (err: any) {
    // Fallback gracioso com pastas padrão caso a ponte esteja indisponível
    return NextResponse.json({
      ok: true,
      folders: [
        { id: "geral", name: "Geral", icon: "folder" },
        { id: "girias-sp", name: "Gírias SP & Quebrada", icon: "zap" },
        { id: "policia-investigacao", name: "Polícia & Interceptações", icon: "shield" },
        { id: "entrevistas-podcasts", name: "Podcasts & Entrevistas", icon: "mic" }
      ],
      audios: []
    });
  }
}

// POST: Salvar áudio ou criar pasta
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body; // 'folder' | 'save'
    const targetBridge = getBridgeUrl();

    const endpoint = action === "folder" ? "/library/folder" : "/library/save";
    const res = await fetch(`${targetBridge}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json();
    if (data.audios && Array.isArray(data.audios)) {
      data.audios = data.audios.map((a: any) => ({
        ...a,
        streamUrl: a.streamUrl && !a.streamUrl.startsWith("http") ? `${targetBridge}${a.streamUrl}` : a.streamUrl,
        sampleUrl: a.sampleUrl && !a.sampleUrl.startsWith("http") ? `${targetBridge}${a.sampleUrl}` : a.sampleUrl,
      }));
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Erro ao salvar na biblioteca." }, { status: 500 });
  }
}

// DELETE: Remover áudio ou pasta
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const audioId = searchParams.get("audioId");
    const folderId = searchParams.get("folderId");
    const targetBridge = getBridgeUrl();

    let endpoint = "";
    if (audioId) endpoint = `/library/audio/${encodeURIComponent(audioId)}`;
    else if (folderId) endpoint = `/library/folder/${encodeURIComponent(folderId)}`;
    else return NextResponse.json({ ok: false, error: "ID não fornecido." }, { status: 400 });

    const res = await fetch(`${targetBridge}${endpoint}`, {
      method: "DELETE",
      cache: "no-store",
    });

    const data = await res.json();
    if (data.audios && Array.isArray(data.audios)) {
      data.audios = data.audios.map((a: any) => ({
        ...a,
        streamUrl: a.streamUrl && !a.streamUrl.startsWith("http") ? `${targetBridge}${a.streamUrl}` : a.streamUrl,
        sampleUrl: a.sampleUrl && !a.sampleUrl.startsWith("http") ? `${targetBridge}${a.sampleUrl}` : a.sampleUrl,
      }));
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Erro ao deletar da biblioteca." }, { status: 500 });
  }
}
