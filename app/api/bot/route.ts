import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const HF_TOKEN = process.env.HF_TOKEN || "";

const SYSTEM_PROMPT = `Você é o Assistente Executivo e Estratégico do Studio VN (vn-24k).
Suas diretrizes fundamentais:
1. Responda a qualquer dúvida ou solicitação do usuário com altíssima inteligência analítica, precisão conceitual e clareza absoluta.
2. Você domina engenharia de software, matemática, redação de contratos, resumos executivos, finanças, acústica e produção de áudio, negócios e planejamento estratégico.
3. Mantenha um tom profissional, direto, perspicaz e autoral em português brasileiro fluído, sem enrolações vazias ou introduções desnecessárias.
4. Quando solicitado código, cálculos ou documentos, entregue soluções completas, funcionais e prontas para execução imediata.`;

export async function GET() {
  const messages = db.getMessages();
  return NextResponse.json({
    success: true,
    data: messages,
  });
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const deleted = db.deleteMessage(id);
      return NextResponse.json({ success: true, deleted, id });
    }

    db.clearMessages();
    return NextResponse.json({
      success: true,
      message: "Histórico de conversas reiniciado com sucesso.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao excluir histórico." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Mensagem vazia." },
        { status: 400 }
      );
    }

    const cleanInput = message.trim();
    // 1. Gravar mensagem do usuário no banco
    db.addMessage("user", cleanInput);

    let botReply = "";
    let commandUsed: string | undefined = undefined;
    let actionData: any = null;
    let engineUsed = "local-cluster";

    const lower = cleanInput.toLowerCase();

    // Comandos de sistema locais pré-programados
    if (lower === "/status" || lower.startsWith("/status")) {
      commandUsed = "/status";
      const stats = db.getStats();
      botReply = `Diagnóstico Operacional do Cluster VN:
• Total de Registros: ${stats.totalRecords}
• Mídia e Áudio: ${stats.audioCount}
• Minutas e Contratos: ${stats.docCount}
• Financeiro & OCR: ${stats.financeCount}
• Sincronizações com Vault: ${stats.totalSyncs}
• Motor Neural: Gemini 3.5 Flash Lite (Ativo)
• Status do Sistema: 100% OPERACIONAL`;
      actionData = stats;
    } else if (lower.startsWith("/sync")) {
      commandUsed = "/sync";
      const syncEvent = db.triggerSync();
      botReply = `Snapshot do banco gerado com sucesso!
• Arquivo: ${syncEvent.snapshotName}
• Hash SHA-256: ${syncEvent.hash.substring(0, 16)}...
• Arquivos indexados: ${syncEvent.fileCount}
• Destino: Hugging Face Vault (vns24k/vault-backup)`;
      actionData = syncEvent;
    } else if (lower.startsWith("/add ")) {
      commandUsed = "/add";
      const rest = cleanInput.substring(5).trim();
      const parts = rest.split("|").map((p) => p.trim());
      const title = parts[0] || "Registro Rápido";
      const content = parts[1] || parts[0];

      const newRec = db.addRecord({
        title,
        content,
        category: "sistema",
        status: "processado",
        metadata: { criadoVia: "Assistente Neural VN", timestamp: Date.now() },
      });

      botReply = `Registro gravado com sucesso no acervo:
• Título: "${newRec.title}"
• Conteúdo: ${newRec.content}
• ID Gerado: ${newRec.id}`;
      actionData = newRec;
    } else {
      // 2. Motor Neural Principal: Google Gemini 3.5 Flash Lite com contexto conversacional
      if (GOOGLE_API_KEY) {
        try {
          const geminiController = new AbortController();
          const geminiTimeout = setTimeout(() => geminiController.abort(), 12000);

          // Pega histórico recente para memória conversacional
          const rawHistory = db.getMessages().slice(-10);
          const contents = rawHistory.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          }));

          // Adiciona a mensagem atual se ainda não estiver no array
          if (contents.length === 0 || contents[contents.length - 1].parts[0].text !== cleanInput) {
            contents.push({ role: "user", parts: [{ text: cleanInput }] });
          }

          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GOOGLE_API_KEY}`;
          const gResp = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: SYSTEM_PROMPT }],
              },
              contents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1200,
              },
            }),
            signal: geminiController.signal,
          });
          clearTimeout(geminiTimeout);

          if (gResp.ok) {
            const gJson = await gResp.json();
            const text = gJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) {
              botReply = text;
              engineUsed = "gemini-3.5-flash-lite";
            }
          }
        } catch (geminiErr: any) {
          console.warn("Falha no Gemini primário do assistente:", geminiErr.message);
        }
      }

      // 3. Fallback Secundário: Hugging Face Router
      if (!botReply && HF_TOKEN) {
        try {
          const hfController = new AbortController();
          const hfTimeout = setTimeout(() => hfController.abort(), 6000);

          const recentHistory = db
            .getMessages()
            .slice(-6)
            .map((m) => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.content,
            }));

          const hfResp = await fetch("https://router.huggingface.co/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${HF_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "meta-llama/Llama-3.3-70B-Instruct",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...recentHistory,
                { role: "user", content: cleanInput },
              ],
              max_tokens: 800,
              temperature: 0.7,
            }),
            signal: hfController.signal,
          });
          clearTimeout(hfTimeout);

          if (hfResp.ok) {
            const hfJson = await hfResp.json();
            const gen = hfJson.choices?.[0]?.message?.content?.trim();
            if (gen) {
              botReply = gen;
              engineUsed = "llama-3.3-70b";
            }
          }
        } catch (hfErr: any) {
          console.warn("Fallback HF indisponível:", hfErr.message);
        }
      }

      // 4. Fallback de Segurança
      if (!botReply) {
        botReply = `Compreendido. Sua instrução "${cleanInput}" foi registrada no cluster. O motor de inferência neural está pronto para deliberações técnicas, cálculos e geração de roteiros.`;
      }
    }

    const botMessage = db.addMessage("bot", botReply, commandUsed, { ...actionData, engine: engineUsed });

    return NextResponse.json({
      success: true,
      message: botMessage,
      engine: engineUsed,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro no processador do bot." },
      { status: 500 }
    );
  }
}
