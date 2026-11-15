import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const messages = db.getMessages();
  return NextResponse.json({
    success: true,
    data: messages,
  });
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
    // 1. Record user message
    db.addMessage("user", cleanInput);

    let botReply = "";
    let actionData: any = null;
    let commandUsed: string | undefined = undefined;

    const lower = cleanInput.toLowerCase();

    // Command Dispatcher
    if (lower === "/help" || lower.includes("ajuda") || lower === "help") {
      commandUsed = "/help";
      botReply = `Comandos do Nexus Bot:
• /status — Relatório operacional do cluster e banco de dados.
• /db [termo] — Consulta e filtra registros no banco relacional.
• /add [Título] | [Conteúdo] — Grava um novo registro diretamente no banco.
• /sync — Dispara snapshot de backup no cofre de dados privado.
• /ocr [arquivo] — Simula extração de dados e texto de imagens e recibos.
• Linguagem natural — Faça perguntas sobre seus dados, áudios e arquivos.`;
    } else if (lower.startsWith("/status") || lower.includes("status do sistema") || lower.includes("como esta o sistema")) {
      commandUsed = "/status";
      const stats = db.getStats();
      botReply = `Cluster Operacional 100% Ativo:
• Registros no Banco: ${stats.totalRecords}
• Mídia & Áudios: ${stats.audioCount}
• Documentos & Minutas: ${stats.docCount}
• Financeiro & OCR: ${stats.financeCount}
• Sincronizações com o Vault: ${stats.totalSyncs}
• Repositório Seguro: vns24k/vault-backup (Ativo)`;
      actionData = stats;
    } else if (lower.startsWith("/sync") || lower.includes("sincronizar") || lower.includes("fazer backup")) {
      commandUsed = "/sync";
      const syncEvent = db.triggerSync();
      botReply = `Snapshot do banco gerado com sucesso!
• Arquivo: ${syncEvent.snapshotName}
• Hash SHA-256: ${syncEvent.hash.substring(0, 16)}...
• Total de arquivos indexados: ${syncEvent.fileCount}
• Tamanho: ${syncEvent.totalSizeMb} MB
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
        metadata: { criadoVia: "Nexus Bot", timestamp: Date.now() },
      });

      botReply = `Novo registro gravado com sucesso no banco de dados:
• ID: ${newRec.id}
• Título: "${newRec.title}"
• Categoria: Sistema
• Conteúdo: ${newRec.content}`;
      actionData = newRec;
    } else if (lower.startsWith("/db") || lower.startsWith("/records") || lower.includes("consultar banco") || lower.includes("ver registros")) {
      commandUsed = "/db";
      const term = lower.replace("/db", "").replace("/records", "").trim();
      const records = db.getRecords(undefined, term || undefined);
      botReply = `Consulta ao banco retornou ${records.length} registro(s)${term ? ` para "${term}"` : ""}:
${records.slice(0, 3).map((r) => `• [${r.category.toUpperCase()}] ${r.title} (${r.status})`).join("\n")}${records.length > 3 ? `\n... e mais ${records.length - 3} itens.` : ""}`;
      actionData = records;
    } else if (lower.startsWith("/ocr") || lower.includes("ocr") || lower.includes("ler imagem")) {
      commandUsed = "/ocr";
      const newRec = db.addRecord({
        title: "Relatório de Reconhecimento Óptico (OCR)",
        category: "financeiro",
        content: "Extrato processado via Tesseract 5.5. Dados validados: 3 transações, valor líquido total apurado de R$ 8.940,00.",
        status: "processado",
        metadata: { engine: "tesseract-por", accuracy: "99.4%" },
      });
      botReply = `Execução de OCR finalizada com sucesso! O resultado foi arquivado no banco de dados:
• Título: ${newRec.title}
• Precisão apurada: 99.4%
• Registro ID: ${newRec.id}`;
      actionData = newRec;
    } else {
      // Natural dialogue response
      botReply = `Compreendido. Sua instrução foi processada pelo Nexus Bot.

Comandos rápidos que você pode executar:
• Digite "/status" para auditar o banco e o cluster.
• Digite "/sync" para salvar um snapshot no cofre da nuvem.
• Digite "/add Minha Ideia | Detalhes da anotação" para gravar no banco.
• Digite "/db" para listar tudo o que está arquivado.`;
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
