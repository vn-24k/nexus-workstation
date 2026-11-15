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
    const {
      image,
      audio,
      text,
      engine = "liveportrait",
      enhanceFace = true,
      drivingMultiplier = 1.0,
    } = body;

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

    const { Client, handle_file } = await import("@gradio/client");
    const connectOptions: any = {};
    if (HF_TOKEN) {
      connectOptions.token = HF_TOKEN as `hf_${string}`;
    }

    // 3. Optional Face Enhancement (CodeFormer HD 2x Upscaling)
    let faceWasEnhanced = false;
    if (enhanceFace) {
      try {
        const codeFormerClient = await Client.connect("sczhou/CodeFormer", connectOptions);
        const rawFaceBuf = fs.readFileSync(imageFilePath);
        const faceFile = new File([rawFaceBuf], "portrait.jpg", { type: "image/jpeg" });
        const restoreResult: any = await codeFormerClient.predict("/inference", {
          image: faceFile,
          face_align: true,
          background_enhance: true,
          face_upsample: true,
          upscale: 2,
          codeformer_fidelity: 0.7,
        });

        const restoredUrl = restoreResult?.data?.[0]?.url;
        if (restoredUrl) {
          const resImg = await fetch(restoredUrl);
          if (resImg.ok) {
            const restoredBuf = Buffer.from(await resImg.arrayBuffer());
            const enhancedPath = path.join("/tmp", `lip_enhanced_${Date.now()}.png`);
            fs.writeFileSync(enhancedPath, restoredBuf);
            imageFilePath = enhancedPath;
            tempFilesToClean.push(enhancedPath);
            faceWasEnhanced = true;
          }
        }
      } catch (enhErr) {
        console.warn("Aviso: CodeFormer não pôde ser aplicado, mantendo imagem original:", enhErr);
      }
    }

    // 4. Generate Video: LivePortrait (Primary) or Wav2Lip (Fallback)
    let finalVideoUrl = "";
    let actualEngine = engine;

    if (engine === "liveportrait") {
      try {
        const lpClient = await Client.connect("FabrizioBassanesi/liveportrait-audio", connectOptions);
        const rawImg = fs.readFileSync(imageFilePath);
        const rawAudio = fs.readFileSync(audioFilePath);
        const imgFile = new File([rawImg], "portrait.jpg", { type: "image/jpeg" });
        const audioFile = new File([rawAudio], "speech.mp3", { type: "audio/mpeg" });

        const lpResult: any = await lpClient.predict("/animate", {
          image_path: imgFile,
          audio_path: audioFile,
          driving_multiplier: Number(drivingMultiplier) || 1.0,
          cfg_scale: 3.0,
        });

        finalVideoUrl = lpResult?.data?.[0]?.video?.url || "";
      } catch (lpErr: any) {
        console.warn("LivePortrait falhou ou tempo esgotado, acionando fallback Wav2Lip:", lpErr?.message);
        actualEngine = "wav2lip";
      }
    }

    if (!finalVideoUrl) {
      // Wav2Lip Fallback
      actualEngine = "wav2lip";
      const w2lClient = await Client.connect("pragnakalp/Wav2lip-ZeroGPU", connectOptions);
      const w2lResult: any = await w2lClient.predict("/run_infrence", {
        input_image: handle_file(imageFilePath),
        input_audio: handle_file(audioFilePath),
      });
      finalVideoUrl = w2lResult?.data?.[0]?.video?.url || "";
    }

    if (!finalVideoUrl) {
      return NextResponse.json(
        { ok: false, error: "Hugging Face ZeroGPU não retornou o vídeo final." },
        { status: 502 }
      );
    }

    // 5. Download Video from HF into Buffer to return base64
    const vidResp = await fetch(finalVideoUrl);
    let videoBase64 = "";
    if (vidResp.ok) {
      const vidBuffer = Buffer.from(await vidResp.arrayBuffer());
      videoBase64 = vidBuffer.toString("base64");
    }

    return NextResponse.json({
      ok: true,
      videoUrl: finalVideoUrl,
      videoBase64: videoBase64 ? `data:video/mp4;base64,${videoBase64}` : undefined,
      engineUsed: actualEngine,
      faceEnhanced: faceWasEnhanced,
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
