import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY || "sk-fish-RFtQu0UUESjwP6F9hPPwA9keMox40MXL_E5WZtK0TkQ";
const VOICE_REF_ID = "d34eb157e1e7474c98c9c63d79f7ce9a";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Texto vazio para sintetização." }, { status: 400 });
    }

    // Clean text (limit to 500 chars for fast speech preview)
    const cleanText = text.replace(/[*#_`]/g, "").trim().substring(0, 500);

    const res = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FISH_AUDIO_API_KEY}`,
        "Content-Type": "application/json",
        "model": "s2.1-pro-free",
      },
      cache: "no-store",
      body: JSON.stringify({
        text: cleanText,
        reference_id: VOICE_REF_ID,
        format: "mp3",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Falha no motor de áudio: ${errText}` }, { status: res.status });
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
