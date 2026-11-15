import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Secure environment token loading
const FISH_AUDIO_API_KEY = (process.env.FISH_AUDIO_API_KEY || "").trim();
const VOICE_REF_ID = "d34eb157e1e7474c98c9c63d79f7ce9a";
const HF_TOKEN = (process.env.HF_TOKEN || "").trim();

export async function POST(req: NextRequest) {
  const tempFilesToClean: string[] = [];
  try {
    const body = await req.json();
    const { image, audio, text, mood } = body;

    if (!image) {
      return NextResponse.json(
        { ok: false, error: "Retrato ou imagem facial obrigatória para o Lip-Sync." },
        { status: 400 }
      );
    }

    // 1. Prepare Audio
    let audioFilePath = "";
    if (audio && typeof audio === "string" && audio.trim()) {
      let rawBase64 = audio;
      if (rawBase64.includes(";base64,")) {
        rawBase64 = rawBase64.split(";base64,")[1];
      }
      audioFilePath = path.join("/tmp", `lip_audio_in_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);
      fs.writeFileSync(audioFilePath, Buffer.from(rawBase64, "base64"));
      tempFilesToClean.push(audioFilePath);
    } else if (text && typeof text === "string" && text.trim()) {
      const cleanText = text.replace(/[*#_`]/g, "").trim().substring(0, 300);
      const ttsResp = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FISH_AUDIO_API_KEY}`,
          "Content-Type": "application/json",
          model: "s2.1-pro-free",
        },
        cache: "no-store",
        body: JSON.stringify({
          text: cleanText,
          reference_id: VOICE_REF_ID,
          format: "mp3",
        }),
      });

      if (!ttsResp.ok) {
        const errTxt = await ttsResp.text();
        return NextResponse.json({ ok: false, error: `Falha na sintetização de voz: ${errTxt}` }, { status: 502 });
      }

      const audioBuffer = Buffer.from(await ttsResp.arrayBuffer());
      audioFilePath = path.join("/tmp", `lip_audio_tts_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);
      fs.writeFileSync(audioFilePath, audioBuffer);
      tempFilesToClean.push(audioFilePath);
    } else {
      return NextResponse.json({ ok: false, error: "Áudio ou texto para sintetizar é obrigatório." }, { status: 400 });
    }

    // 2. Prepare Image
    let imageFilePath = "";
    if (typeof image === "string" && image.startsWith("data:image")) {
      const rawImgBase64 = image.split(";base64,")[1];
      imageFilePath = path.join("/tmp", `lip_img_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
      fs.writeFileSync(imageFilePath, Buffer.from(rawImgBase64, "base64"));
      tempFilesToClean.push(imageFilePath);
    } else if (typeof image === "string" && image.startsWith("http")) {
      const imgResp = await fetch(image);
      if (!imgResp.ok) {
        return NextResponse.json({ ok: false, error: "Não foi possível carregar a imagem do link fornecido." }, { status: 400 });
      }
      const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
      imageFilePath = path.join("/tmp", `lip_img_remote_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
      fs.writeFileSync(imageFilePath, imgBuffer);
      tempFilesToClean.push(imageFilePath);
    } else if (typeof image === "string" && image.startsWith("/")) {
      const localPath = path.join(process.cwd(), "public", image.replace(/^\//, ""));
      if (fs.existsSync(localPath)) {
        imageFilePath = localPath;
      } else if (fs.existsSync(image)) {
        imageFilePath = image;
      } else {
        return NextResponse.json({ ok: false, error: "Arquivo de imagem local não encontrado." }, { status: 404 });
      }
    } else {
      imageFilePath = path.join("/tmp", `lip_img_raw_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
      fs.writeFileSync(imageFilePath, Buffer.from(image, "base64"));
      tempFilesToClean.push(imageFilePath);
    }

    // 3. Connect to Hugging Face ZeroGPU Space and Run Inference
    const { Client, handle_file } = await import("@gradio/client");
    const connectOptions: any = {};
    if (HF_TOKEN) {
      connectOptions.token = HF_TOKEN as `hf_${string}`;
    }
    const client = await Client.connect("pragnakalp/Wav2lip-ZeroGPU", connectOptions);

    const result: any = await client.predict("/run_infrence", {
      input_image: handle_file(imageFilePath),
      input_audio: handle_file(audioFilePath),
    });

    const videoData = result?.data?.[0]?.video;
    if (!videoData?.url) {
      return NextResponse.json(
        { ok: false, error: "Hugging Face ZeroGPU não retornou o vídeo final." },
        { status: 502 }
      );
    }

    // 4. Download video from HF into Buffer to return base64
    const vidResp = await fetch(videoData.url);
    let videoBase64 = "";
    if (vidResp.ok) {
      const vidBuffer = Buffer.from(await vidResp.arrayBuffer());
      videoBase64 = vidBuffer.toString("base64");
    }

    return NextResponse.json({
      ok: true,
      videoUrl: videoData.url,
      videoBase64: videoBase64 ? `data:video/mp4;base64,${videoBase64}` : undefined,
    });
  } catch (err: any) {
    console.error("Lip-Sync error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err.message || "Erro durante o processamento do Lip-Sync no Hugging Face.",
      },
      { status: 500 }
    );
  } finally {
    for (const f of tempFilesToClean) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch (e) {}
    }
  }
}
