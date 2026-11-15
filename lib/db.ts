import fs from "fs";
import path from "path";

export interface RecordItem {
  id: string;
  title: string;
  category: "audio" | "documento" | "sistema" | "financeiro" | "pesquisa";
  content: string;
  status: "processado" | "pendente" | "arquivado" | "em_analise";
  metadata: Record<string, any>;
  createdAt: string;
}

export interface BotMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  command?: string;
  data?: any;
  createdAt: string;
}

export interface SyncEvent {
  id: string;
  snapshotName: string;
  hash: string;
  status: "sincronizado" | "pendente" | "falha";
  fileCount: number;
  totalSizeMb: number;
  createdAt: string;
}

// Initial seed data
const initialRecords: RecordItem[] = [
  {
    id: "rec_001",
    title: "Mastering de Áudio Vocálico — Preset SP",
    category: "audio",
    content: "Arquivo processado com microfade Hann e equalização acústica limpa (+1.5dB em 220Hz / -1.8dB em 6kHz).",
    status: "processado",
    metadata: { sampleRate: "48kHz", bitDepth: "24-bit", duration: "02:45" },
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "rec_002",
    title: "Comprovante de Liquidação Bancária #8921",
    category: "financeiro",
    content: "OCR extraído com precisão de 99.8%. Valor apurado: R$ 14.850,00. Autenticação bancária confirmada.",
    status: "processado",
    metadata: { ocrEngine: "Tesseract 5.5", confianca: "99.8%", operacao: "TED" },
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: "rec_003",
    title: "Snapshot de Configuração — Obsidian Second Brain",
    category: "sistema",
    content: "Cópia compactada dos esquemas de templates, rotas de contato e notas de arquitetura.",
    status: "processado",
    metadata: { vaultRepo: "vns24k/vault-backup", sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: "rec_004",
    title: "Diretrizes de Acordo de Prestação de Serviços",
    category: "documento",
    content: "Minuta contratual com cláusulas de entrega contínua, responsabilidade técnica e escopo fechado.",
    status: "em_analise",
    metadata: { paginas: 12, versao: "2.4" },
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

const initialMessages: BotMessage[] = [
  {
    id: "msg_init_1",
    role: "bot",
    content: "Nexus Core online. Sistema operacional e banco de dados prontos para comandos. Como posso ajudar agora?",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

const initialSyncEvents: SyncEvent[] = [
  {
    id: "sync_001",
    snapshotName: "vault_daily_20261115.zip",
    hash: "a4f8b2c1d9e7f5a3b1c9d8e7f6a5b4c3",
    status: "sincronizado",
    fileCount: 42,
    totalSizeMb: 18.4,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
];

// In-Memory store with optional file fallback
declare global {
  var __nexus_db: {
    records: RecordItem[];
    messages: BotMessage[];
    syncEvents: SyncEvent[];
  } | undefined;
}

if (!global.__nexus_db) {
  global.__nexus_db = {
    records: [...initialRecords],
    messages: [...initialMessages],
    syncEvents: [...initialSyncEvents],
  };
}

export const db = {
  // Records
  getRecords: (category?: string, search?: string): RecordItem[] => {
    let list = global.__nexus_db!.records;
    if (category && category !== "todos") {
      list = list.filter((r) => r.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q)
      );
    }
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  addRecord: (record: Omit<RecordItem, "id" | "createdAt">): RecordItem => {
    const newItem: RecordItem = {
      ...record,
      id: `rec_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    global.__nexus_db!.records.unshift(newItem);
    return newItem;
  },

  deleteRecord: (id: string): boolean => {
    const initialLen = global.__nexus_db!.records.length;
    global.__nexus_db!.records = global.__nexus_db!.records.filter(
      (r) => r.id !== id
    );
    return global.__nexus_db!.records.length < initialLen;
  },

  // Messages
  getMessages: (): BotMessage[] => {
    return [...global.__nexus_db!.messages];
  },

  addMessage: (role: "user" | "bot", content: string, command?: string, data?: any): BotMessage => {
    const msg: BotMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      role,
      content,
      command,
      data,
      createdAt: new Date().toISOString(),
    };
    global.__nexus_db!.messages.push(msg);
    return msg;
  },

  // Sync Events
  getSyncEvents: (): SyncEvent[] => {
    return [...global.__nexus_db!.syncEvents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  triggerSync: (snapshotName?: string): SyncEvent => {
    const name = snapshotName || `vault_snapshot_${Date.now()}.zip`;
    const newEvent: SyncEvent = {
      id: `sync_${Date.now()}`,
      snapshotName: name,
      hash: Math.random().toString(16).substring(2, 18) + Math.random().toString(16).substring(2, 18),
      status: "sincronizado",
      fileCount: global.__nexus_db!.records.length + 8,
      totalSizeMb: parseFloat(((global.__nexus_db!.records.length * 0.45) + 3.2).toFixed(2)),
      createdAt: new Date().toISOString(),
    };
    global.__nexus_db!.syncEvents.unshift(newEvent);
    return newEvent;
  },

  getStats: () => {
    const records = global.__nexus_db!.records;
    return {
      totalRecords: records.length,
      audioCount: records.filter((r) => r.category === "audio").length,
      docCount: records.filter((r) => r.category === "documento").length,
      financeCount: records.filter((r) => r.category === "financeiro").length,
      systemCount: records.filter((r) => r.category === "sistema").length,
      totalSyncs: global.__nexus_db!.syncEvents.length,
      lastSync: global.__nexus_db!.syncEvents[0]?.createdAt || null,
      activeStatus: "OPERACIONAL 100%",
    };
  },
};
