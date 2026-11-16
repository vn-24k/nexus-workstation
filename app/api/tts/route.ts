import { NextRequest, NextResponse } from "next/server";
import { encode } from "@msgpack/msgpack";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY || "sk-fish-RFtQu0UUESjwP6F9hPPwA9keMox40MXL_E5WZtK0TkQ";
const DEFAULT_VOICE_REF_ID = "d34eb157e1e7474c98c9c63d79f7ce9a";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      modelMode = "default", // 'default' | 'my-voice-cadence' | 'exact-video-voice'
      referenceAudioBase64,
      referenceAudioText,
      referenceId,
      temperature = 0.85,
      top_p = 0.88
    } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Texto vazio para sintetização." }, { status: 400 });
    }

    // Clean text (limit to 1000 chars)
    const cleanText = text.replace(/[*#_`]/g, "").trim().substring(0, 1000);

    let fetchHeaders: Record<string, string> = {
      "Authorization": `Bearer ${FISH_AUDIO_API_KEY}`,
      "model": "s2.1-pro-free",
    };
    let fetchBody: any = null;

    // Se temos um áudio de referência do YouTube / Acervo:
    if ((modelMode === "my-voice-cadence" || modelMode === "exact-video-voice") && referenceAudioBase64) {
      const rawB64 = referenceAudioBase64.replace(/^data:audio\/\w+;base64,/, "");
      const sampleBytes = Buffer.from(rawB64, "base64");

      // No modo de clonagem de alta fidelidade (exact-video-voice),
      // temperatura em 0.70 e top_p em 0.85 ancoram o modelo com rigidez máxima
      // ao timbre, aos formantes de voz e ao sotaque original da amostra!
      const targetTemperature = modelMode === "exact-video-voice"
        ? 0.70
        : (Number(temperature) || 0.85);
      const targetTopP = modelMode === "exact-video-voice"
        ? 0.85
        : (Number(top_p) || 0.88);

      const msgpackPayload: any = {
        text: cleanText,
        format: "mp3",
        temperature: targetTemperature,
        top_p: targetTopP,
        references: [
          {
            audio: sampleBytes,
            text: referenceAudioText ? String(referenceAudioText).trim() : "",
          }
        ]
      };

      // No modo "my-voice-cadence", preservamos o timbre do usuário (reference_id)
      // e aplicamos a cadência, tom e sotaque do vídeo via references!
      if (modelMode === "my-voice-cadence") {
        msgpackPayload.reference_id = referenceId || DEFAULT_VOICE_REF_ID;
      }
      // No modo "exact-video-voice", não enviamos reference_id, gerando clone 100% do locutor do vídeo!

      fetchHeaders["Content-Type"] = "application/msgpack";
      fetchBody = Buffer.from(encode(msgpackPayload));
    } else {
      // Modo Padrão: Síntese direta com a voz do usuário
      fetchHeaders["Content-Type"] = "application/json";
      fetchBody = JSON.stringify({
        text: cleanText,
        reference_id: referenceId || DEFAULT_VOICE_REF_ID,
        format: "mp3",
        temperature: Number(temperature) || 0.85,
        top_p: Number(top_p) || 0.88,
      });
    }

    const res = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: fetchHeaders,
      cache: "no-store",
      body: fetchBody,
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Falha no motor de áudio (${res.status}): ${errText}` }, { status: res.status });
    }

    const audioBuffer = await res.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro interno de áudio." }, { status: 500 });
  }
}
