"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Database,
  Cloud,
  Code2,
  Send,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  Terminal,
  Activity,
  Layers,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  HardDrive,
  Copy,
  Check,
  Volume2,
  BookmarkPlus,
  Sparkles,
  Lock,
  User,
  LogOut,
  AlertCircle,
  KeyRound,
} from "lucide-react";

interface RecordItem {
  id: string;
  title: string;
  category: "audio" | "documento" | "sistema" | "financeiro" | "pesquisa";
  content: string;
  status: "processado" | "pendente" | "arquivado" | "em_analise";
  metadata: Record<string, any>;
  createdAt: string;
}

interface BotMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  command?: string;
  data?: any;
  createdAt: string;
}

interface SyncEvent {
  id: string;
  snapshotName: string;
  hash: string;
  status: "sincronizado" | "pendente" | "falha";
  fileCount: number;
  totalSizeMb: number;
  createdAt: string;
}

const STORAGE_KEYS = {
  AUTH: "nexus_auth_session",
  MESSAGES: "nexus_chat_history_v2",
  RECORDS: "nexus_records_store_v2",
};

export default function NexusDashboard() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<"bot" | "database" | "api" | "vault">("bot");

  // Bot State
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [botLoading, setBotLoading] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Database State
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<RecordItem["category"]>("sistema");

  // Sync / Vault State
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [syncing, setSyncing] = useState(false);

  // API Explorer State
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  // Check Auth & LocalStorage on Mount
  useEffect(() => {
    // 1. Auth check
    const savedAuth = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }

    // 2. Chat history from localStorage
    const savedChat = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        } else {
          fetchInitialMessages();
        }
      } catch (e) {
        fetchInitialMessages();
      }
    } else {
      fetchInitialMessages();
    }

    // 3. Records from localStorage
    const savedRecs = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (savedRecs) {
      try {
        const parsed = JSON.parse(savedRecs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecords(parsed);
        } else {
          fetchRecords();
        }
      } catch (e) {
        fetchRecords();
      }
    } else {
      fetchRecords();
    }

    fetchSyncEvents();
  }, []);

  // Save Messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    }
  }, [messages]);

  // Save Records to localStorage whenever they change
  useEffect(() => {
    if (records.length > 0) {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
    }
  }, [records]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botLoading]);

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    const u = loginUser.trim().toLowerCase();
    const p = loginPass.trim();

    // Credenciais: vns24k / 24k (ou qualquer acesso do estúdio vn-24k)
    if ((u === "vns24k" || u === "vn-24k" || u === "admin") && (p === "24k" || p === "studio24k" || p === "admin")) {
      setTimeout(() => {
        localStorage.setItem(STORAGE_KEYS.AUTH, "true");
        setIsAuthenticated(true);
        setLoginLoading(false);
      }, 400);
    } else {
      setTimeout(() => {
        setLoginError("Credenciais inválidas. Dica: Usuário vns24k | Senha: 24k");
        setLoginLoading(false);
      }, 300);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    setIsAuthenticated(false);
  };

  const handleClearChat = () => {
    if (confirm("Deseja realmente limpar o histórico do chat?")) {
      const resetMsg: BotMessage[] = [
        {
          id: `msg_init_${Date.now()}`,
          role: "bot",
          content: "Histórico de conversa reiniciado. O que você gostaria de perguntar ou registrar agora?",
          createdAt: new Date().toISOString(),
        },
      ];
      setMessages(resetMsg);
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(resetMsg));
    }
  };

  // Fetch helpers
  const fetchInitialMessages = async () => {
    try {
      const res = await fetch("/api/bot");
      const json = await res.json();
      if (json.success && json.data) {
        setMessages(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecords = async () => {
    setRecordsLoading(true);
    try {
      const url = new URL("/api/records", window.location.origin);
      if (selectedCategory !== "todos") url.searchParams.set("category", selectedCategory);
      if (searchQuery) url.searchParams.set("q", searchQuery);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success && json.data) {
        // Merge with existing localStorage records to prevent any loss
        setRecords((prev) => {
          const map = new Map<string, RecordItem>();
          for (const item of prev) map.set(item.id, item);
          for (const item of json.data) map.set(item.id, item);
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(merged));
          return merged;
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRecordsLoading(false);
    }
  };

  const fetchSyncEvents = async () => {
    try {
      const res = await fetch("/api/vault/sync");
      const json = await res.json();
      if (json.success && json.data) {
        setSyncEvents(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Bot Handler
  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || inputMessage;
    if (!promptToSend.trim() || botLoading) return;

    const userText = promptToSend.trim();
    setInputMessage("");
    setBotLoading(true);

    const tempUserMsg: BotMessage = {
      id: `temp_${Date.now()}`,
      role: "user",
      content: userText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });
      const json = await res.json();
      if (json.success && json.message) {
        setMessages((prev) => [...prev, json.message]);
        fetchRecords();
        fetchSyncEvents();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBotLoading(false);
    }
  };

  // Play Speech (TTS)
  const handlePlayTTS = async (msgId: string, text: string) => {
    if (playingAudioId === msgId) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }

    setAudioLoadingId(msgId);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Falha na síntese de áudio");

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setPlayingAudioId(null);
        currentAudioRef.current = null;
      };

      setPlayingAudioId(msgId);
      audio.play();
    } catch (e) {
      console.error(e);
      alert("Não foi possível reproduzir a voz no momento.");
    } finally {
      setAudioLoadingId(null);
    }
  };

  // Save Bot Answer to Database (Persistent!)
  const handleSaveToDatabase = async (content: string, id: string) => {
    try {
      const title = content.substring(0, 45).replace(/[*#\n]/g, " ").trim() + "...";
      const newRec: RecordItem = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: `Nota: ${title}`,
        content: content,
        category: "pesquisa",
        status: "processado",
        metadata: { salvoVia: "OmniBot", msgId: id },
        createdAt: new Date().toISOString(),
      };

      // 1. Instant local persistence
      setRecords((prev) => {
        const updated = [newRec, ...prev];
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
        return updated;
      });

      setSavedSuccessId(id);
      setTimeout(() => setSavedSuccessId(null), 3000);

      // 2. Server persistence
      await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRec),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Create record manually
  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newRec: RecordItem = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newTitle,
      content: newContent,
      category: newCategory,
      status: "processado",
      metadata: { criadoManualmente: true },
      createdAt: new Date().toISOString(),
    };

    // 1. Instant local persistence
    setRecords((prev) => {
      const updated = [newRec, ...prev];
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
      return updated;
    });

    setIsAddModalOpen(false);
    setNewTitle("");
    setNewContent("");

    // 2. Server persistence
    try {
      await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRec),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Delete record
  const handleDeleteRecord = async (id: string) => {
    // 1. Instant local persistence
    setRecords((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(filtered));
      return filtered;
    });

    // 2. Server sync
    try {
      await fetch(`/api/records?id=${id}`, { method: "DELETE" });
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Sync
  const handleTriggerSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/vault/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSyncEvents((prev) => [json.data, ...prev]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  // Test API Route
  const handleTestApi = async (endpoint: string, method: string = "GET", bodyData?: any) => {
    setTestingEndpoint(endpoint);
    const start = performance.now();
    try {
      const opts: RequestInit = { method };
      if (bodyData) {
        opts.headers = { "Content-Type": "application/json" };
        opts.body = JSON.stringify(bodyData);
      }
      const res = await fetch(endpoint, opts);
      const json = await res.json();
      const end = performance.now();
      setApiLatency(Math.round(end - start));
      setApiResponse(json);
    } catch (err: any) {
      setApiResponse({ error: err.message });
      setApiLatency(null);
    } finally {
      setTestingEndpoint(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchCat = selectedCategory === "todos" || r.category === selectedCategory;
    const matchSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Loading Screen while reading localStorage
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#07080c] flex items-center justify-center">
        <div className="flex items-center space-x-3 text-amber-400 font-mono text-xs">
          <RefreshCw size={16} className="animate-spin" />
          <span>Carregando ambiente seguro...</span>
        </div>
      </div>
    );
  }

  // TELA DE LOGIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07080c] flex flex-col justify-between p-6 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl"></div>
        </div>

        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="glass-panel rounded-3xl w-full max-w-md p-8 border border-white/10 shadow-2xl relative">
            {/* Header / Logo */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center font-bold text-black text-2xl shadow-xl mx-auto mb-4">
                VN
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">NEXUS WORKSTATION</h1>
              <p className="text-xs text-zinc-400 mt-1">Acesso à Central de Inteligência e Banco de Dados</p>
            </div>

            {/* Error message */}
            {loginError && (
              <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center space-x-2 text-xs text-red-400">
                <AlertCircle size={15} />
                <span>{loginError}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5 flex items-center space-x-1.5">
                  <User size={13} className="text-amber-400" />
                  <span>Usuário</span>
                </label>
                <input
                  type="text"
                  required
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="vns24k"
                  className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5 flex items-center space-x-1.5">
                  <Lock size={13} className="text-amber-400" />
                  <span>Senha de Acesso</span>
                </label>
                <input
                  type="password"
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={14} />
                    <span>Acessar Plataforma</span>
                  </>
                )}
              </button>
            </form>

            {/* Credential Hint */}
            <div className="mt-6 pt-5 border-t border-white/5 text-center">
              <span className="text-[11px] text-zinc-500 font-mono">
                Acesso do Estúdio: <strong className="text-amber-400">vns24k</strong> | Senha: <strong className="text-amber-400">24k</strong>
              </span>
            </div>
          </div>
        </div>

        <footer className="text-center text-xs text-zinc-600 relative z-10">
          <p>© 2026 Studio VN (vn-24k). Todos os direitos reservados.</p>
        </footer>
      </div>
    );
  }

  // DASHBOARD PRINCIPAL (AUTENTICADO)
  return (
    <div className="flex flex-col min-h-screen bg-[#07080c] text-zinc-100">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0d14]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center font-bold text-black text-lg shadow-lg">
              VN
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-tight text-white">NEXUS WORKSTATION</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  v2.6 Pro
                </span>
              </div>
              <p className="text-xs text-zinc-400">Sessão Ativa: <span className="text-amber-300 font-mono">vns24k</span></p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-zinc-900/60 border border-white/5 text-xs text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Motor Neural Online</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition text-xs font-semibold"
              title="Sair da sessão"
            >
              <LogOut size={13} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col space-y-6">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto pb-2 scrollbar-none space-x-2 border-b border-white/5">
          <button
            onClick={() => setActiveTab("bot")}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              activeTab === "bot"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/5"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/40"
            }`}
          >
            <Bot size={16} />
            <span>OmniBot Neural</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          </button>

          <button
            onClick={() => setActiveTab("database")}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              activeTab === "database"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/5"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/40"
            }`}
          >
            <Database size={16} />
            <span>Banco de Dados</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-amber-400 font-bold">
              {records.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("api")}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              activeTab === "api"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/5"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/40"
            }`}
          >
            <Code2 size={16} />
            <span>API REST Explorer</span>
          </button>

          <button
            onClick={() => setActiveTab("vault")}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              activeTab === "vault"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/5"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/40"
            }`}
          >
            <Cloud size={16} />
            <span>Cloud Vault Sync</span>
          </button>
        </div>

        {/* TAB 1: OMNIBOT NEURAL */}
        {activeTab === "bot" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
            {/* Sidebar with Prompt Suggestions */}
            <div className="lg:col-span-1 space-y-4">
              <div className="glass-panel rounded-2xl p-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center space-x-2">
                  <Sparkles size={14} />
                  <span>Perguntas & Ações Rápidas</span>
                </h2>
                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                  O bot responde qualquer assunto e você pode salvar a resposta no banco com um clique:
                </p>

                <div className="space-y-2">
                  {[
                    "Como funciona a física quântica?",
                    "Escreva uma minuta de contrato de desenvolvimento",
                    "Qual a melhor estratégia para vender serviços?",
                    "Crie um script em Python para automação",
                    "Explique a Teoria da Relatividade em 3 pontos",
                    "/add Análise de Mercado | Metas do trimestre",
                  ].map((promptText, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(undefined, promptText)}
                      className="w-full text-left p-2.5 rounded-xl bg-zinc-900/50 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 transition text-xs group"
                    >
                      <div className="text-zinc-300 font-medium line-clamp-2 group-hover:text-amber-300 transition">
                        {promptText}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status and Memory Indicator */}
              <div className="glass-panel rounded-2xl p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Memória Persistente</div>
                    <div className="text-[11px] text-zinc-400">Zero perda ao atualizar a página</div>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Histórico de chat e banco de dados salvos de forma contínua no seu navegador e sincronizados com o servidor.
                </p>
              </div>
            </div>

            {/* Chat Timeline */}
            <div className="lg:col-span-3 flex flex-col glass-panel rounded-2xl overflow-hidden min-h-[580px] max-h-[780px]">
              {/* Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <div className="flex items-center space-x-2 text-xs text-zinc-300">
                  <Bot size={15} className="text-amber-400" />
                  <span className="font-semibold text-white">OmniBot Neural Terminal</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-[11px] text-emerald-400">{messages.length} mensagens salvas</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleClearChat}
                    className="px-2.5 py-1 rounded-lg text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Limpar histórico de chat"
                  >
                    Limpar Chat
                  </button>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center space-x-2 text-[10px] text-zinc-500 mb-1 px-1">
                      <span>{msg.role === "user" ? "Você" : "OmniBot Neural"}</span>
                      <span>•</span>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-amber-500 text-black font-medium rounded-tr-none shadow-md shadow-amber-500/10"
                          : "bg-zinc-900/90 border border-white/10 text-zinc-200 rounded-tl-none whitespace-pre-wrap"
                      }`}
                    >
                      {msg.content}

                      {/* Bot Actions: Play Voice (TTS) & Save to Database */}
                      {msg.role === "bot" && (
                        <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handlePlayTTS(msg.id, msg.content)}
                            disabled={audioLoadingId === msg.id}
                            className={`flex items-center space-x-1.5 text-[11px] px-2.5 py-1 rounded-lg border transition ${
                              playingAudioId === msg.id
                                ? "bg-amber-500 text-black border-amber-500 font-bold animate-pulse"
                                : "bg-black/40 text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
                            }`}
                          >
                            <Volume2 size={13} />
                            <span>
                              {audioLoadingId === msg.id
                                ? "Gerando voz..."
                                : playingAudioId === msg.id
                                ? "Pausar Voz"
                                : "Ouvir Resposta"}
                            </span>
                          </button>

                          <button
                            onClick={() => handleSaveToDatabase(msg.content, msg.id)}
                            className="flex items-center space-x-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-black/40 text-zinc-400 border border-white/10 hover:text-white hover:bg-white/5 transition"
                          >
                            {savedSuccessId === msg.id ? (
                              <>
                                <Check size={13} className="text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Salvo no Banco!</span>
                              </>
                            ) : (
                              <>
                                <BookmarkPlus size={13} />
                                <span>Salvar no Banco</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => copyToClipboard(msg.content)}
                            className="flex items-center space-x-1 text-[11px] px-2 py-1 text-zinc-500 hover:text-zinc-300 transition"
                          >
                            <Copy size={12} />
                            <span>Copiar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {botLoading && (
                  <div className="flex flex-col items-start">
                    <div className="text-[10px] text-zinc-500 mb-1">OmniBot Neural</div>
                    <div className="bg-zinc-900/90 border border-white/10 rounded-2xl rounded-tl-none px-4 py-3 flex items-center space-x-2 text-xs text-amber-400">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                      <span className="font-medium text-xs">Pensando e sintetizando resposta inteligente...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => handleSendMessage(e)}
                className="p-3 border-t border-white/5 bg-black/40 flex items-center space-x-3"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Pergunte qualquer coisa (física, código, negócios, contratos, cálculos)..."
                  className="flex-1 bg-zinc-900/90 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition"
                />
                <button
                  type="submit"
                  disabled={botLoading || !inputMessage.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-amber-500/10"
                >
                  <span>Enviar</span>
                  <Send size={13} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: DATABASE */}
        {activeTab === "database" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {["todos", "pesquisa", "audio", "documento", "financeiro", "sistema"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                      selectedCategory === cat
                        ? "bg-amber-500 text-black shadow-md shadow-amber-500/20 font-bold"
                        : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-white/5"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative flex-1 sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar registros..."
                    className="w-full bg-zinc-900/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-lg shadow-amber-500/10"
                >
                  <Plus size={15} />
                  <span>Novo Registro</span>
                </button>
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="glass-panel rounded-2xl p-12 text-center">
                <Database size={32} className="mx-auto text-zinc-600 mb-3" />
                <div className="text-sm font-semibold text-zinc-300">Nenhum registro encontrado</div>
                <p className="text-xs text-zinc-500 mt-1">Crie um novo registro ou clique em &quot;Salvar no Banco&quot; no chat.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="glass-panel rounded-2xl p-5 hover:border-amber-500/30 transition flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-amber-400 border border-white/5">
                          {rec.category}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
                            <CheckCircle2 size={11} />
                            <span>{rec.status}</span>
                          </span>
                          <button
                            onClick={() => handleDeleteRecord(rec.id)}
                            className="text-zinc-500 hover:text-red-400 transition p-1"
                            title="Excluir registro"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-white mb-2 leading-snug">{rec.title}</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{rec.content}</p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
                      <span className="font-mono text-[10px]">{rec.id}</span>
                      <span className="flex items-center space-x-1">
                        <Clock size={11} />
                        <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: API EXPLORER */}
        {activeTab === "api" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                Endpoints REST Disponíveis
              </div>

              {[
                {
                  method: "POST",
                  url: "/api/bot",
                  label: "Perguntar Qualquer Coisa (IA)",
                  body: { message: "Qual é a velocidade da luz e como ela foi calculada?" },
                },
                {
                  method: "POST",
                  url: "/api/tts",
                  label: "Sintetizar Voz Humana (Fish Audio)",
                  body: { text: "Olá! A síntese de voz está 100% operacional no seu servidor." },
                },
                { method: "GET", url: "/api/system/status", label: "Status do Cluster & Uptime", body: null },
                { method: "GET", url: "/api/records", label: "Listar Registros do Banco", body: null },
                {
                  method: "POST",
                  url: "/api/records",
                  label: "Inserir Novo Registro",
                  body: { title: "Planejamento 2026", content: "Metas de expansão do estúdio", category: "sistema" },
                },
              ].map((ep, idx) => (
                <div
                  key={idx}
                  className="glass-panel rounded-xl p-3 hover:border-amber-500/30 transition flex flex-col space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        ep.method === "GET"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {ep.method}
                    </span>
                    <button
                      onClick={() => handleTestApi(ep.url, ep.method, ep.body)}
                      disabled={testingEndpoint === ep.url}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition flex items-center space-x-1"
                    >
                      <span>Executar</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="font-mono text-xs text-zinc-300 truncate">{ep.url}</div>
                  <div className="text-[11px] text-zinc-400">{ep.label}</div>
                </div>
              ))}
            </div>

            {/* Response Viewer */}
            <div className="lg:col-span-2 glass-panel rounded-2xl p-5 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Resposta da Requisição</span>
                  {apiLatency !== null && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
                      {apiLatency}ms
                    </span>
                  )}
                </div>

                {apiResponse && (
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(apiResponse, null, 2))}
                    className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-white transition"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? "Copiado!" : "Copiar JSON"}</span>
                  </button>
                )}
              </div>

              <div className="flex-1 bg-black/60 rounded-xl p-4 font-mono text-xs overflow-auto max-h-[500px] border border-white/5 text-amber-200">
                {apiResponse ? (
                  <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
                ) : (
                  <div className="text-zinc-500 text-center py-20">
                    Selecione um endpoint ao lado e clique em &quot;Executar&quot; para disparar uma requisição ao vivo.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CLOUD VAULT */}
        {activeTab === "vault" && (
          <div className="space-y-6">
            <div className="glass-panel-gold rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="text-amber-400" size={20} />
                  <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Cofre de Alta Segurança</span>
                </div>
                <h2 className="text-2xl font-bold text-white font-display">Hugging Face Vault Sync</h2>
                <p className="text-xs text-zinc-300 max-w-xl leading-relaxed">
                  Repositório de dataset 100% privado (<span className="font-mono text-amber-300">vns24k/vault-backup</span>). Permite sincronizar snapshots completos do banco de dados e arquivos com hash SHA-256.
                </p>
              </div>

              <button
                onClick={handleTriggerSync}
                disabled={syncing}
                className="px-6 py-3.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-bold rounded-2xl text-xs flex items-center space-x-2 shadow-xl shadow-amber-500/20 transition disabled:opacity-50"
              >
                <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
                <span>{syncing ? "Sincronizando..." : "Sincronizar Banco Agora"}</span>
              </button>
            </div>

            {/* Sync Events History */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Histórico de Snapshots</h3>
                <span className="text-xs text-zinc-400">{syncEvents.length} sincronização(ões)</span>
              </div>

              <div className="space-y-3">
                {syncEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 rounded-xl bg-zinc-900/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-white font-mono">{evt.snapshotName}</div>
                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          SHA: {evt.hash}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 text-[11px] text-zinc-400">
                      <div>
                        <span className="text-zinc-500">Arquivos: </span>
                        <span className="text-zinc-200 font-semibold">{evt.fileCount}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Tamanho: </span>
                        <span className="text-zinc-200 font-semibold">{evt.totalSizeMb} MB</span>
                      </div>
                      <div className="text-zinc-500">
                        {new Date(evt.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add New Record */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel rounded-3xl w-full max-w-md p-6 space-y-4 border border-amber-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Novo Registro no Banco de Dados</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Contrato de Prestação de Serviços"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Categoria</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="pesquisa">Pesquisa</option>
                  <option value="sistema">Sistema</option>
                  <option value="audio">Áudio</option>
                  <option value="documento">Documento</option>
                  <option value="financeiro">Financeiro</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Conteúdo / Descrição</label>
                <textarea
                  required
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Detalhes, metadados ou observações do registro..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl text-xs shadow-lg shadow-amber-500/10"
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-6 text-center text-xs text-zinc-500">
        <p>© 2026 Studio VN (vn-24k). Todos os direitos reservados. Arquitetura Proprietária de Alta Performance.</p>
      </footer>
    </div>
  );
}
