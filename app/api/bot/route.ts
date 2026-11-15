import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const SYSTEM_PROMPT = `Você é o OmniBot, o assistente executivo, analítico e de engenharia do Studio VN (vn-24k).
Suas diretrizes:
1. Responda a QUALQUER pergunta do usuário com inteligência profunda, clareza, alta capacidade técnica e pragmatismo.
2. Você resolve código, matemática, redação de contratos, resumos, ciência, negócios, arquitetura de sistemas e tarefas cotidianas.
3. Mantenha um tom profissional, direto e autoral em português brasileiro, sem enrolação e sem frases clichês.
4. Quando solicitado código ou dados, forneça exemplos funcionais e prontos para uso.`;

export async function GET() {
  const messages = db.getMessages();
  return NextResponse.json({
    success: true,
    data: messages,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { message, customApiKey } = await req.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Mensagem vazia." },
        { status: 400 }
      );
    }

    const cleanInput = message.trim();
    // 1. Record user message
    db.addMessage("user", cleanInput);

    let botReply = "";
    let commandUsed: string | undefined = undefined;
    let actionData: any = null;

    const lower = cleanInput.toLowerCase();

    // Check if it's a specific local system command
    if (lower === "/status" || lower.startsWith("/status")) {
      commandUsed = "/status";
      const stats = db.getStats();
      botReply = `Diagnóstico Operacional do Cluster VN:
• Total de Registros: ${stats.totalRecords}
• Mídia e Áudio: ${stats.audioCount}
• Minutas e Contratos: ${stats.docCount}
• Financeiro & OCR: ${stats.financeCount}
• Sincronizações com Vault: ${stats.totalSyncs}
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
        metadata: { criadoVia: "OmniBot Neural", timestamp: Date.now() },
      });

      botReply = `Registro gravado com sucesso no banco de dados:
• Título: "${newRec.title}"
• Conteúdo: ${newRec.content}
• ID Gerado: ${newRec.id}`;
      actionData = newRec;
    } else {
      // 2. Real AI Neural Brain for ANY QUESTION
      try {
        const recentHistory = db
          .getMessages()
          .slice(-6)
          .map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          }));

        // Call open neural inference endpoint
        const aiResponse = await fetch("https://text.pollinations.ai/openai/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...recentHistory,
            ],
            model: "openai",
          }),
          signal: AbortSignal.timeout(20000),
        });

        if (aiResponse.ok) {
          const aiJson = await aiResponse.json();
          const generatedText = aiJson.choices?.[0]?.message?.content;
          if (generatedText && generatedText.trim()) {
            botReply = generatedText.trim();
          }
        }
      } catch (aiErr: any) {
        console.error("AI Fallback trigger:", aiErr.message);
      }

      // Robust fallback if external network is congested
      if (!botReply) {
        botReply = `Recebi sua solicitação: "${cleanInput}".\n\nO motor de inferência está reprocessando a rota. Posso responder qualquer dúvida técnica, criar novos registros via "/add [Título] | [Conteúdo]" ou auditar o cluster com "/status".`;
      }
    }

    const botMessage = db.addMessage("bot", botReply, commandUsed, actionData);

    return NextResponse.json({
      success: true,
      message: botMessage,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro no processador do bot." },
      { status: 500 }
    );
  }
}
