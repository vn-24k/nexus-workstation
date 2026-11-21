import { NextRequest, NextResponse } from "next/server";
import fs from "fs";

export const dynamic = "force-dynamic";

const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY || "sk-fish-RFtQu0UUESjwP6F9hPPwA9keMox40MXL_E5WZtK0TkQ";
const DEFAULT_VOICE_REF_ID = "d34eb157e1e7474c98c9c63d79f7ce9a";

// Contact resolver matching local phone directory & rules
function resolvePhone(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "mae" || lower === "mãe" || lower.includes("mãe") || lower.includes("mae")) {
    return "5511976909265";
  }
  if (lower === "namorada" || lower === "tawan" || lower.includes("namorada") || lower.includes("tawan")) {
    return "66832024232";
  }
  if (lower === "nina" || lower.includes("nina")) {
    return "5511910765838";
  }

  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) return "";

  // 1. If user explicitly typed +, trust the full E.164 digits directly for ANY country in the world
  if (hadPlus) return digits;

  // 2. If 12 or more digits, it is already an international number with DDI
  if (digits.length >= 12) return digits;

  // 3. If already starts with 55
  if (digits.startsWith("55")) return digits;

  // 4. Only prefix 55 if typical Brazilian local DDD + number (10 or 11 digits, DDD 11-99) without leading 0
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("0")) {
    const ddd = parseInt(digits.slice(0, 2), 10);
    if (ddd >= 11 && ddd <= 99) {
      return `55${digits}`;
    }
  }

  return digits;
}

function getBridgeUrl(custom?: string): string {
  if (custom && custom.startsWith("http")) return custom.trim().replace(/\/$/, "");

  try {
    const configPath = "/root/.config/bridge_tunnel_url";
    if (fs.existsSync(configPath)) {
      const saved = fs.readFileSync(configPath, "utf8").trim();
      if (saved.startsWith("http")) return saved.replace(/\/$/, "");
    }
  } catch (e) {}

  return (process.env.WHATSAPP_BRIDGE_URL || "https://launched-threats-constitute-cellular.trycloudflare.com").replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      phone,
      audioBase64,
      videoBase64,
      type,
      ptv,
      caption,
      bridgeUrl,
      account = "primary",
      voiceId,
      referenceId,
      viewOnce
    } = body;

    const targetPhone = resolvePhone(phone);
    if (!targetPhone) {
      return NextResponse.json({ ok: false, error: "Número de telefone ou destinatário não informado." }, { status: 400 });
    }

    const activeBridge = getBridgeUrl(bridgeUrl);
    const activeVoiceRef = referenceId || voiceId || DEFAULT_VOICE_REF_ID;

    // 1. VIDEO DISPATCH (Standard MP4 or Push-to-Video Note)
    if (type === "video" || videoBase64) {
      if (!videoBase64) {
        return NextResponse.json({ ok: false, error: "Dados do vídeo (base64) não informados." }, { status: 400 });
      }

      let rawVideoBase64 = videoBase64;
      if (rawVideoBase64.includes(";base64,")) {
        rawVideoBase64 = rawVideoBase64.split(";base64,")[1];
      }

      const bridgeController = new AbortController();
      const bridgeTimeout = setTimeout(() => bridgeController.abort(), 40000);

      const bridgeResp = await fetch(`${activeBridge}/send-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: targetPhone,
          videoBase64: rawVideoBase64,
          caption: caption || text || undefined,
          ptv: ptv === true,
          account,
          viewOnce: viewOnce === true,
        }),
        signal: bridgeController.signal,
      });
      clearTimeout(bridgeTimeout);

      if (!bridgeResp.ok) {
        const errDetail = await bridgeResp.text();
        return NextResponse.json({
          ok: false,
          error: `Erro ao enviar vídeo via WhatsApp Bridge (${bridgeResp.status}): ${errDetail}`,
          bridgeUrl: activeBridge,
        }, { status: 502 });
      }

      const bridgeResult = await bridgeResp.json();
      return NextResponse.json({
        ok: true,
        type: "video",
        ptv: ptv === true,
        account: bridgeResult.account || account,
        sender: bridgeResult.sentFrom || (account === "secondary" ? "6285142001939" : "5511995685756"),
        sentTo: bridgeResult.sentTo || targetPhone,
        messageId: bridgeResult.messageId,
        bridgeUrl: activeBridge,
        status: "delivered",
      });
    }

    // 2. AUDIO DISPATCH (Native Push-To-Talk Voice Note)
    let audioData = audioBase64;
    if (!audioData) {
      if (!text || typeof text !== "string" || !text.trim()) {
        return NextResponse.json({ ok: false, error: "Texto obrigatório para sintetização de voz." }, { status: 400 });
      }

      const cleanText = text.replace(/[*#_`]/g, "").trim();

      const ttsResp = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FISH_AUDIO_API_KEY}`,
          "Content-Type": "application/json",
          model: "s2.1-pro-free",
        },
        body: JSON.stringify({
          text: cleanText,
          reference_id: activeVoiceRef,
          format: "mp3",
          temperature: 0.85,
          top_p: 0.88,
        }),
      });

      if (!ttsResp.ok) {
        const errText = await ttsResp.text();
        return NextResponse.json({ ok: false, error: `Falha na sintetização: ${errText}` }, { status: 502 });
      }

      const buffer = await ttsResp.arrayBuffer();
      audioData = Buffer.from(buffer).toString("base64");
    }

    const bridgeController = new AbortController();
    const bridgeTimeout = setTimeout(() => bridgeController.abort(), 25000);

    const bridgeResp = await fetch(`${activeBridge}/send-audio`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: targetPhone,
        audioBase64: audioData,
        ptt: true,
        account,
        viewOnce: viewOnce === true,
      }),
      signal: bridgeController.signal,
    });
    clearTimeout(bridgeTimeout);

    if (!bridgeResp.ok) {
      const errDetail = await bridgeResp.text();
      return NextResponse.json({
        ok: false,
        error: `Erro ao enviar via WhatsApp Bridge (${bridgeResp.status}): ${errDetail}`,
        bridgeUrl: activeBridge,
      }, { status: 502 });
    }

    const bridgeResult = await bridgeResp.json();

    return NextResponse.json({
      ok: true,
      type: "audio",
      account: bridgeResult.account || account,
      sender: bridgeResult.sentFrom || (account === "secondary" ? "6285142001939" : "5511995685756"),
      sentTo: bridgeResult.sentTo || targetPhone,
      messageId: bridgeResult.messageId,
      bridgeUrl: activeBridge,
      ptt: true,
      status: "delivered",
    });
  } catch (err: any) {
    const isTimeout = err.name === "AbortError";
    return NextResponse.json({
      ok: false,
      error: isTimeout
        ? "Tempo limite esgotado ao contatar a ponte WhatsApp. Certifique-se de que o daemon está ativo (`start-whatsapp`)."
        : err.message || "Erro interno ao processar disparo WhatsApp.",
    }, { status: 500 });
  }
}
