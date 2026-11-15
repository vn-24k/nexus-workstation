"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Play,
  Pause,
  Upload,
  Send,
  Trash2,
  BookmarkPlus,
  Check,
  Search,
  Plus,
  LogOut,
  Sparkles,
  Lock,
  User,
  Volume2,
  RefreshCw,
  FolderOpen,
  MessageSquare,
  Radio,
} from "lucide-react";

interface VoiceAnchor {
  id: string;
  name: string;
  mood: "firme" | "empolgado" | "calmo" | "descontraido";
  accent: "sp" | "carioca" | "baiano" | "neutro";
  audioUrl: string;
  duration?: string;
  createdAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface RecordNote {
  id: string;
  title: string;
  content: string;
  category: "voz" | "ideia" | "documento" | "pesquisa";
  createdAt: string;
}

const STORAGE_KEYS = {
  AUTH: "nexus_apple_auth",
  VOICE_ANCHORS: "nexus_voice_anchors_v1",
  MESSAGES: "nexus_apple_chat_v1",
  RECORDS: "nexus_apple_records_v1",
};

// Default high-grade voice reference samples
const initialVoiceAnchors: VoiceAnchor[] = [
  {
    id: "anchor_01",
    name: "Tom Firme & Decisão",
    mood: "firme",
    accent: "sp",
    audioUrl: "",
    duration: "0:06",
    createdAt: new Date().toISOString(),
  },
  {
    id: "anchor_02",
    name: "Energia & Entusiasmo",
    mood: "empolgado",
    accent: "sp",
    audioUrl: "",
    duration: "0:05",
    createdAt: new Date().toISOString(),
  },
  {
    id: "anchor_03",
    name: "Cadência Descontraída",
    mood: "descontraido",
    accent: "carioca",
    audioUrl: "",
    duration: "0:07",
    createdAt: new Date().toISOString(),
  },
];

const initialRecords: RecordNote[] = [
  {
    id: "rec_01",
    title: "Diretrizes de Identidade Vocal",
    content: "Articulação firme em negociações e cadência solta em momentos de descontração. Preservar respiração natural.",
    category: "voz",
    createdAt: new Date().toISOString(),
  },
  {
    id: "rec_02",
    title: "Planejamento Estratégico 2026",
    content: "Estruturação de novos ativos digitais com interfaces de alta fidelidade e automação contínua.",
    category: "ideia",
    createdAt: new Date().toISOString(),
  },
];

export default function StudioNexus() {
  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  // Navigation
  const [currentTab, setCurrentTab] = useState<"assistant" | "voice" | "records">("assistant");

  // Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Audio Playback
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Voice Lab
  const [voiceAnchors, setVoiceAnchors] = useState<VoiceAnchor[]>([]);
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadMood, setUploadMood] = useState<VoiceAnchor["mood"]>("firme");
  const [uploadAccent, setUploadAccent] = useState<VoiceAnchor["accent"]>("sp");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Records / Acervo
  const [records, setRecords] = useState<RecordNote[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  // Load from LocalStorage
  useEffect(() => {
    // Auth
    const authSaved = localStorage.getItem(STORAGE_KEYS.AUTH);
    setIsAuthenticated(authSaved === "true");

    // Chat
    const chatSaved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (chatSaved) {
      try {
        setMessages(JSON.parse(chatSaved));
      } catch (e) {
        setMessages(getDefaultMessages());
      }
    } else {
      setMessages(getDefaultMessages());
    }

    // Voice Anchors
    const voiceSaved = localStorage.getItem(STORAGE_KEYS.VOICE_ANCHORS);
    if (voiceSaved) {
      try {
        setVoiceAnchors(JSON.parse(voiceSaved));
      } catch (e) {
        setVoiceAnchors(initialVoiceAnchors);
      }
    } else {
      setVoiceAnchors(initialVoiceAnchors);
    }

    // Records
    const recsSaved = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (recsSaved) {
      try {
        setRecords(JSON.parse(recsSaved));
      } catch (e) {
        setRecords(initialRecords);
      }
    } else {
      setRecords(initialRecords);
    }
  }, []);

  function getDefaultMessages(): Message[] {
    return [
      {
        id: "msg_intro",
        role: "assistant",
        content: "Studio Nexus ativo. Sistema calibrado para raciocínio analítico, síntese de voz e gestão de acervo. O que deseja explorar hoje?",
        createdAt: new Date().toISOString(),
      },
    ];
  }

  // Sync to LocalStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (voiceAnchors.length > 0) {
      localStorage.setItem(STORAGE_KEYS.VOICE_ANCHORS, JSON.stringify(voiceAnchors));
    }
  }, [voiceAnchors]);

  useEffect(() => {
    if (records.length > 0) {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
    }
  }, [records]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isReplying]);

  // Auth Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const u = loginUser.trim().toLowerCase();
    const p = loginPass.trim();

    if ((u === "vns24k" || u === "vn-24k" || u === "admin") && (p === "24k" || p === "studio24k" || p === "admin")) {
      localStorage.setItem(STORAGE_KEYS.AUTH, "true");
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Credenciais não reconhecidas. Acesso restrito ao estúdio.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    setIsAuthenticated(false);
  };

  // Chat Handler
  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const textToSend = customPrompt || prompt;
    if (!textToSend.trim() || isReplying) return;

    const userText = textToSend.trim();
    setPrompt("");
    setIsReplying(true);

    const userMsg: Message = {
      id: `msg_u_${Date.now()}`,
      role: "user",
      content: userText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.message.id || `msg_a_${Date.now()}`,
            role: "assistant",
            content: data.message.content,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReplying(false);
    }
  };

  // Play Speech (TTS)
  const handlePlayVoice = async (msgId: string, text: string) => {
    if (playingMessageId === msgId) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      setPlayingMessageId(null);
      return;
    }

    setLoadingAudioId(msgId);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Erro na síntese vocal");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeAudioRef.current = audio;

      audio.onended = () => {
        setPlayingMessageId(null);
        activeAudioRef.current = null;
      };

      setPlayingMessageId(msgId);
      audio.play();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudioId(null);
    }
  };

  // Save Assistant Message to Records
  const handleSaveToRecords = (content: string, id: string) => {
    const titleSnippet = content.substring(0, 42).replace(/[*#\n]/g, " ").trim() + "...";
    const newNote: RecordNote = {
      id: `rec_${Date.now()}`,
      title: titleSnippet,
      content,
      category: "pesquisa",
      createdAt: new Date().toISOString(),
    };
    setRecords((prev) => [newNote, ...prev]);
    setSavedSuccessId(id);
    setTimeout(() => setSavedSuccessId(null), 2500);
  };

  // Voice Lab: Upload Audio File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const audioUrl = URL.createObjectURL(file);
    const newAnchor: VoiceAnchor = {
      id: `anchor_${Date.now()}`,
      name: uploadName.trim() || file.name.replace(/\.[^/.]+$/, ""),
      mood: uploadMood,
      accent: uploadAccent,
      audioUrl: audioUrl,
      duration: "0:08",
      createdAt: new Date().toISOString(),
    };

    setVoiceAnchors((prev) => [newAnchor, ...prev]);
    setUploadName("");
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteAnchor = (id: string) => {
    setVoiceAnchors((prev) => prev.filter((a) => a.id !== id));
  };

  // Records Actions
  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    const newNote: RecordNote = {
      id: `rec_${Date.now()}`,
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      category: "ideia",
      createdAt: new Date().toISOString(),
    };
    setRecords((prev) => [newNote, ...prev]);
    setNewNoteTitle("");
    setNewNoteContent("");
    setIsNewNoteOpen(false);
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const filteredRecords = records.filter((r) => {
    const matchCat = selectedCategory === "todos" || r.category === selectedCategory;
    const matchSearch =
      !searchFilter ||
      r.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.content.toLowerCase().includes(searchFilter.toLowerCase());
    return matchCat && matchSearch;
  });

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  // APPLE-STYLE LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
        {/* Subtle Ambient Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-black to-black pointer-events-none"></div>

        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="apple-glass rounded-3xl w-full max-w-sm p-8 sm:p-10 shadow-2xl">
            {/* Minimal Brand Mark */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto mb-4 text-white font-semibold text-sm tracking-tight shadow-lg">
                VN
              </div>
              <h1 className="text-lg font-semibold tracking-tight text-white">Studio Nexus</h1>
              <p className="text-xs text-zinc-500 mt-1">Autenticação do Estúdio</p>
            </div>

            {loginError && (
              <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-[11px] text-red-400 text-center">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">Usuário</label>
                <input
                  type="text"
                  required
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="vns24k"
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">Senha</label>
                <input
                  type="password"
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 apple-button font-medium rounded-xl text-xs mt-2"
              >
                Entrar
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/5 text-center">
              <span className="text-[10px] text-zinc-600 font-mono">
                Credencial padrão: vns24k / 24k
              </span>
            </div>
          </div>
        </div>

        <footer className="text-center text-[11px] text-zinc-600 relative z-10">
          <p>© 2026 Studio VN. Arquitetura Proprietária de Alta Fidelidade.</p>
        </footer>
      </div>
    );
  }

  // APPLE-STYLE MAIN WORKSTATION
  return (
    <div className="min-h-screen bg-black text-[#f5f5f7] flex flex-col justify-between selection:bg-white/20">
      {/* Sleek Minimalist Navbar */}
      <header className="sticky top-0 z-40 bg-black/75 backdrop-blur-xl border-b border-white/[0.06] px-6 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-xs font-semibold text-white">
              VN
            </span>
            <span className="text-xs font-medium tracking-tight text-white">Studio Nexus</span>
          </div>

          {/* Segmented Control Pill */}
          <nav className="flex items-center p-1 rounded-full bg-zinc-900/80 border border-white/[0.08] text-xs">
            <button
              onClick={() => setCurrentTab("assistant")}
              className={`px-4 py-1.5 rounded-full transition-all duration-200 ${
                currentTab === "assistant"
                  ? "bg-white text-black font-medium shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Assistente
            </button>
            <button
              onClick={() => setCurrentTab("voice")}
              className={`px-4 py-1.5 rounded-full transition-all duration-200 flex items-center space-x-1.5 ${
                currentTab === "voice"
                  ? "bg-white text-black font-medium shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Voz Real</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </button>
            <button
              onClick={() => setCurrentTab("records")}
              className={`px-4 py-1.5 rounded-full transition-all duration-200 ${
                currentTab === "records"
                  ? "bg-white text-black font-medium shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Acervo
            </button>
          </nav>

          <button
            onClick={handleLogout}
            className="text-zinc-500 hover:text-zinc-300 transition p-1.5 rounded-lg"
            title="Encerrar sessão"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="max-w-4xl mx-auto w-full px-5 py-8 flex-1 flex flex-col justify-between">
        {/* TAB 1: ASSISTENTE CONVERSACIONAL */}
        {currentTab === "assistant" && (
          <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full space-y-6">
            {/* Quick Inspiration Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {[
                "Elabore uma proposta de consultoria sênior",
                "Explique a física de som e ressonância acústica",
                "Quais as melhores estratégias para marcas de luxo?",
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(undefined, suggestion)}
                  className="px-3 py-1.5 rounded-full bg-zinc-900/60 hover:bg-zinc-800 border border-white/[0.06] text-[11px] text-zinc-400 hover:text-white transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div className="flex-1 space-y-6 overflow-y-auto py-4 min-h-[420px] max-h-[580px] pr-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-5 py-3.5 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#2c2c2e] text-white font-normal"
                        : "apple-glass text-zinc-200"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Assistant Actions: Audio & Bookmark */}
                    {msg.role === "assistant" && (
                      <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center space-x-3 text-[11px]">
                        <button
                          onClick={() => handlePlayVoice(msg.id, msg.content)}
                          disabled={loadingAudioId === msg.id}
                          className="flex items-center space-x-1.5 text-zinc-400 hover:text-white transition"
                        >
                          <Volume2 size={13} />
                          <span>
                            {loadingAudioId === msg.id
                              ? "Gerando voz..."
                              : playingMessageId === msg.id
                              ? "Pausar"
                              : "Ouvir com Minha Voz"}
                          </span>
                        </button>

                        <button
                          onClick={() => handleSaveToRecords(msg.content, msg.id)}
                          className="flex items-center space-x-1.5 text-zinc-400 hover:text-white transition"
                        >
                          {savedSuccessId === msg.id ? (
                            <>
                              <Check size={13} className="text-emerald-400" />
                              <span className="text-emerald-400">Salvo no Acervo</span>
                            </>
                          ) : (
                            <>
                              <BookmarkPlus size={13} />
                              <span>Salvar no Acervo</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isReplying && (
                <div className="flex items-start">
                  <div className="apple-glass rounded-2xl px-4 py-3 text-xs text-zinc-400 flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse"></span>
                    <span>Sintetizando raciocínio...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Apple Minimal Input Bar */}
            <form
              onSubmit={(e) => handleSendMessage(e)}
              className="sticky bottom-4 w-full flex items-center bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl focus-within:border-white/30 transition"
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Pergunte qualquer coisa ou digite uma instrução..."
                className="flex-1 bg-transparent px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isReplying || !prompt.trim()}
                className="w-9 h-9 rounded-xl bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition disabled:opacity-20"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: LABORATÓRIO VOCAL (VOICE ANCHORS) */}
        {currentTab === "voice" && (
          <div className="max-w-3xl mx-auto w-full space-y-8 py-2">
            {/* Header Description */}
            <div className="text-center max-w-xl mx-auto">
              <h2 className="text-xl font-semibold tracking-tight text-white mb-2">
                Âncoras de Voz Real
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Armazene pequenos áudios da sua fala real para o modelo aprender nuances de postura corporal, sotaques e energia emocional.
              </p>
            </div>

            {/* Upload & Add Anchor Card */}
            <div className="apple-glass rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="text-xs font-semibold text-white tracking-tight flex items-center space-x-2">
                <Mic size={15} className="text-emerald-400" />
                <span>Adicionar Nova Referência de Voz</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Identificação</label>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="Ex: Argumentação Firme"
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Intenção / Humor</label>
                  <select
                    value={uploadMood}
                    onChange={(e) => setUploadMood(e.target.value as any)}
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="firme">Firme / Autoridade</option>
                    <option value="empolgado">Empolgado / Energia</option>
                    <option value="calmo">Calmo / Reflexivo</option>
                    <option value="descontraido">Descontraído / Zoeira</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Cadência / Sotaque</label>
                  <select
                    value={uploadAccent}
                    onChange={(e) => setUploadAccent(e.target.value as any)}
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="sp">Padrão São Paulo</option>
                    <option value="carioca">Carioca</option>
                    <option value="baiano">Baiano</option>
                    <option value="neutro">Neutro</option>
                  </select>
                </div>
              </div>

              {/* Upload Drop Button */}
              <div className="pt-1 flex items-center justify-between">
                <input
                  type="file"
                  accept="audio/*"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  id="voice-file-input"
                />
                <label
                  htmlFor="voice-file-input"
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-xs text-white font-medium cursor-pointer flex items-center space-x-2 transition"
                >
                  <Upload size={13} />
                  <span>Selecionar Áudio do Celular / WhatsApp</span>
                </label>

                <span className="text-[11px] text-zinc-500 font-mono">
                  {voiceAnchors.length} âncoras salvas
                </span>
              </div>
            </div>

            {/* Gallery of Voice Anchors */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
                Galeria de Referências Vocais
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {voiceAnchors.map((anchor) => (
                  <div
                    key={anchor.id}
                    className="apple-card rounded-2xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-medium text-white">{anchor.name}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 capitalize">
                            {anchor.mood}
                          </span>
                          <span className="text-[10px] text-zinc-500 uppercase font-mono">
                            {anchor.accent}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteAnchor(anchor.id)}
                        className="text-zinc-600 hover:text-red-400 p-1 transition"
                        title="Remover âncora"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-500">
                      <span>{new Date(anchor.createdAt).toLocaleDateString()}</span>
                      <span className="text-emerald-400 text-[10px] font-mono">Pronta para síntese</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACERVO (RECORDS) */}
        {currentTab === "records" && (
          <div className="max-w-3xl mx-auto w-full space-y-6 py-2">
            {/* Top Bar Filter & Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                {["todos", "ideia", "voz", "pesquisa"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs capitalize transition ${
                      selectedCategory === cat
                        ? "bg-white text-black font-medium"
                        : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-white/[0.06]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative flex-1 sm:w-48">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar notas..."
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => setIsNewNoteOpen(true)}
                  className="px-3 py-1.5 bg-white hover:bg-zinc-200 text-black font-medium rounded-xl text-xs flex items-center space-x-1 transition"
                >
                  <Plus size={14} />
                  <span>Nova Nota</span>
                </button>
              </div>
            </div>

            {/* Records List */}
            {filteredRecords.length === 0 ? (
              <div className="apple-glass rounded-3xl p-12 text-center text-xs text-zinc-500">
                Nenhum registro encontrado no acervo.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredRecords.map((item) => (
                  <div
                    key={item.id}
                    className="apple-card rounded-2xl p-5 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/[0.06]">
                          {item.category}
                        </span>
                        <button
                          onClick={() => handleDeleteRecord(item.id)}
                          className="text-zinc-600 hover:text-red-400 p-1 transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <h4 className="text-xs font-semibold text-white mb-1.5 leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap line-clamp-4">
                        {item.content}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/[0.04] text-[10px] text-zinc-500 font-mono">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal: New Note */}
      {isNewNoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="apple-glass rounded-3xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-xs font-semibold text-white">Criar Registro no Acervo</h3>
              <button
                onClick={() => setIsNewNoteOpen(false)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Ex: Insight sobre Produção Acústica"
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Conteúdo</label>
                <textarea
                  required
                  rows={4}
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Escreva sua anotação ou diretriz..."
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewNoteOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 apple-button font-medium rounded-xl text-xs"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clean Apple Footer */}
      <footer className="border-t border-white/[0.04] py-5 px-6 text-center text-[11px] text-zinc-600">
        <p>© 2026 Studio VN (vn-24k). Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
