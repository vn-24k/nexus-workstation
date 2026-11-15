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
  Share2,
  Phone,
  MessageCircle,
  Download,
  CheckCircle2,
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

// Preset Contacts
const PRESET_CONTACTS = [
  { id: "mae", name: "Mãe", phone: "5511976909265", label: "Mãe", icon: "👩‍👦" },
  { id: "tawan", name: "Tawan", phone: "66832024232", label: "Tawan (Namorada)", icon: "💖" },
  { id: "nina", name: "Nina", phone: "5511910765838", label: "Nina", icon: "👧" },
  { id: "outro", name: "Outro", phone: "", label: "Outro Número", icon: "📱" },
];

export default function StudioNexus() {
  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  // Navigation: assistant | dispatch | voice | records
  const [currentTab, setCurrentTab] = useState<"assistant" | "dispatch" | "voice" | "records">("dispatch");

  // Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Audio Playback in Chat
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Dispatch Tab (Disparo Vocal)
  const [dispatchText, setDispatchText] = useState("");
  const [selectedContact, setSelectedContact] = useState(PRESET_CONTACTS[0]);
  const [customPhone, setCustomPhone] = useState("");
  const [dispatchMood, setDispatchMood] = useState<string>("sp");
  const [isSynthesizingDispatch, setIsSynthesizingDispatch] = useState(false);
  const [dispatchAudioBlob, setDispatchAudioBlob] = useState<Blob | null>(null);
  const [dispatchAudioUrl, setDispatchAudioUrl] = useState<string | null>(null);
  const [isPlayingDispatchAudio, setIsPlayingDispatchAudio] = useState(false);
  const dispatchAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Voice Lab
  const [voiceAnchors, setVoiceAnchors] = useState<VoiceAnchor[]>([]);
  const [uploadName, setUploadName] = useState("");
  const [uploadMood, setUploadMood] = useState<VoiceAnchor["mood"]>("firme");
  const [uploadAccent, setUploadAccent] = useState<VoiceAnchor["accent"]>("sp");
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
    const authSaved = localStorage.getItem(STORAGE_KEYS.AUTH);
    setIsAuthenticated(authSaved === "true");

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

    const voiceSaved = localStorage.getItem(STORAGE_KEYS.VOICE_ANCHORS);
    if (voiceSaved) {
      try {
        setVoiceAnchors(JSON.parse(voiceSaved));
      } catch (e) {
        setVoiceAnchors([]);
      }
    }

    const recsSaved = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (recsSaved) {
      try {
        setRecords(JSON.parse(recsSaved));
      } catch (e) {
        setRecords([]);
      }
    }
  }, []);

  function getDefaultMessages(): Message[] {
    return [
      {
        id: "msg_intro",
        role: "assistant",
        content: "Studio Nexus ativo. Sistema calibrado para síntese de voz nativa, raciocínio e disparo direto. Como posso ajudar?",
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

  // Play Speech (TTS in Chat)
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

  // DISPATCH TAB: Generate Audio with My Voice
  const handleSynthesizeDispatch = async () => {
    if (!dispatchText.trim() || isSynthesizingDispatch) return;

    setIsSynthesizingDispatch(true);
    setDispatchAudioBlob(null);
    setDispatchAudioUrl(null);
    setIsPlayingDispatchAudio(false);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: dispatchText.trim(), mood: dispatchMood }),
      });

      if (!res.ok) throw new Error("Falha na síntese de áudio");

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);

      setDispatchAudioBlob(blob);
      setDispatchAudioUrl(audioUrl);
    } catch (err) {
      console.error(err);
      alert("Não foi possível gerar a síntese vocal no momento.");
    } finally {
      setIsSynthesizingDispatch(false);
    }
  };

  // DISPATCH TAB: Play / Pause generated dispatch audio
  const handleToggleDispatchAudio = () => {
    if (!dispatchAudioUrl) return;

    if (isPlayingDispatchAudio && dispatchAudioPlayerRef.current) {
      dispatchAudioPlayerRef.current.pause();
      setIsPlayingDispatchAudio(false);
    } else {
      if (!dispatchAudioPlayerRef.current) {
        dispatchAudioPlayerRef.current = new Audio(dispatchAudioUrl);
        dispatchAudioPlayerRef.current.onended = () => setIsPlayingDispatchAudio(false);
      }
      dispatchAudioPlayerRef.current.play();
      setIsPlayingDispatchAudio(true);
    }
  };

  // DISPATCH TAB: Share on WhatsApp (Mobile Native Share or WhatsApp Web Link)
  const handleSendToWhatsApp = async () => {
    if (!dispatchAudioBlob) return;

    const targetPhone = selectedContact.id === "outro" ? customPhone.replace(/\D/g, "") : selectedContact.phone;

    // Check if navigator.share with files is supported (iOS Safari / Android Chrome)
    if (navigator.share && navigator.canShare) {
      try {
        const audioFile = new File([dispatchAudioBlob], "audio_mensagem.mp3", { type: "audio/mpeg" });
        if (navigator.canShare({ files: [audioFile] })) {
          await navigator.share({
            files: [audioFile],
            title: "Mensagem de Voz",
            text: dispatchText.substring(0, 100),
          });
          return;
        }
      } catch (err: any) {
        if (err.name !== "AbortError") console.error("Web Share failed:", err);
      }
    }

    // Desktop / Fallback: Download audio and open WhatsApp chat
    const downloadLink = document.createElement("a");
    downloadLink.href = dispatchAudioUrl!;
    downloadLink.download = "mensagem_de_voz.mp3";
    downloadLink.click();

    if (targetPhone) {
      const cleanTarget = targetPhone.replace(/\D/g, "");
      window.open(`https://wa.me/${cleanTarget}`, "_blank");
    } else {
      window.open("https://web.whatsapp.com", "_blank");
    }
  };

  // Voice Lab: Upload Audio File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-black to-black pointer-events-none"></div>

        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="apple-glass rounded-3xl w-full max-w-sm p-8 sm:p-10 shadow-2xl">
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

          {/* Segmented Control Pill with 4 Tabs */}
          <nav className="flex items-center p-1 rounded-full bg-zinc-900/80 border border-white/[0.08] text-xs">
            <button
              onClick={() => setCurrentTab("dispatch")}
              className={`px-3.5 py-1.5 rounded-full transition-all duration-200 flex items-center space-x-1.5 ${
                currentTab === "dispatch"
                  ? "bg-white text-black font-medium shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Disparo Vocal</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>
            <button
              onClick={() => setCurrentTab("assistant")}
              className={`px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                currentTab === "assistant"
                  ? "bg-white text-black font-medium shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Assistente
            </button>
            <button
              onClick={() => setCurrentTab("voice")}
              className={`px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                currentTab === "voice"
                  ? "bg-white text-black font-medium shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Voz Real
            </button>
            <button
              onClick={() => setCurrentTab("records")}
              className={`px-3.5 py-1.5 rounded-full transition-all duration-200 ${
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
        {/* TAB 1: DISPARO VOCAL (VOZ EM TEMPO REAL COM ENVIO WHATSAPP) */}
        {currentTab === "dispatch" && (
          <div className="max-w-2xl mx-auto w-full space-y-6 py-2">
            <div className="text-center max-w-md mx-auto">
              <h2 className="text-xl font-semibold tracking-tight text-white mb-1.5">
                Disparo Vocal em Tempo Real
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Digite sua mensagem. O sistema sintetiza com sua voz humana e envia diretamente para o WhatsApp.
              </p>
            </div>

            {/* Recipient Selection */}
            <div className="apple-glass rounded-3xl p-5 space-y-3">
              <label className="text-[11px] font-medium text-zinc-400 block px-1">
                Destinatário no WhatsApp
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_CONTACTS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    className={`p-2.5 rounded-2xl border text-left transition flex items-center space-x-2 ${
                      selectedContact.id === c.id
                        ? "bg-white text-black border-white font-medium shadow-md"
                        : "bg-zinc-900/50 text-zinc-300 border-white/[0.06] hover:bg-zinc-800"
                    }`}
                  >
                    <span className="text-base">{c.icon}</span>
                    <span className="text-xs truncate">{c.name}</span>
                  </button>
                ))}
              </div>

              {selectedContact.id === "outro" && (
                <div className="pt-2">
                  <input
                    type="tel"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="DDD + Número (ex: 11999998888)"
                    className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                  />
                </div>
              )}
            </div>

            {/* Text & Tone Input Card */}
            <div className="apple-glass rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-zinc-400">
                  O que você quer falar?
                </label>

                {/* Mood Select */}
                <select
                  value={dispatchMood}
                  onChange={(e) => setDispatchMood(e.target.value)}
                  className="bg-zinc-900/80 border border-white/10 rounded-xl px-3 py-1.5 text-[11px] text-zinc-300 focus:outline-none"
                >
                  <option value="sp">Padrão São Paulo</option>
                  <option value="firme">Firme / Autoridade</option>
                  <option value="calmo">Calmo / Afeto</option>
                  <option value="empolgado">Empolgado / Energia</option>
                  <option value="carioca">Carioca</option>
                  <option value="baiano">Baiano</option>
                </select>
              </div>

              <textarea
                rows={3}
                value={dispatchText}
                onChange={(e) => setDispatchText(e.target.value)}
                placeholder="Digite sua fala como você falaria... (ex: 'Oi, tudo bem? Tô saindo agora do estúdio e te ligo em 10 minutos...')"
                className="w-full bg-zinc-900/70 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition resize-none leading-relaxed"
              />

              {/* Quick Preset Phrases */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Tô na correria aqui, já já te ligo!",
                  "Oi amor, bom dia! Como você tá?",
                  "Recebi aqui, tô analisando e te aviso.",
                ].map((phrase, i) => (
                  <button
                    key={i}
                    onClick={() => setDispatchText(phrase)}
                    className="px-2.5 py-1 rounded-full bg-zinc-900/60 hover:bg-zinc-800 border border-white/[0.04] text-[10px] text-zinc-400 hover:text-white transition"
                  >
                    {phrase}
                  </button>
                ))}
              </div>

              {/* Action Button: Synthesize */}
              <button
                onClick={handleSynthesizeDispatch}
                disabled={isSynthesizingDispatch || !dispatchText.trim()}
                className="w-full py-3.5 apple-button font-medium rounded-2xl text-xs flex items-center justify-center space-x-2 transition disabled:opacity-30 mt-2 shadow-lg"
              >
                {isSynthesizingDispatch ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Sintetizando com sua voz...</span>
                  </>
                ) : (
                  <>
                    <Mic size={14} />
                    <span>Gerar Áudio da Minha Voz</span>
                  </>
                )}
              </button>
            </div>

            {/* Generated Audio Card (When Ready) */}
            {dispatchAudioUrl && (
              <div className="apple-card rounded-3xl p-6 border-white/20 bg-zinc-900/80 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-semibold text-white">Áudio Pronto para Envio</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">Alta Fidelidade</span>
                </div>

                {/* Audio Player Row */}
                <div className="flex items-center space-x-4 bg-black/40 p-3 rounded-2xl border border-white/[0.04]">
                  <button
                    onClick={handleToggleDispatchAudio}
                    className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transition shadow-md hover:scale-105 active:scale-95"
                  >
                    {isPlayingDispatchAudio ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                  </button>

                  <div className="flex-1">
                    <div className="text-xs font-medium text-white truncate">{dispatchText}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center space-x-2">
                      <span>Voz Humana</span>
                      <span>•</span>
                      <span className="capitalize">{dispatchMood}</span>
                    </div>
                  </div>
                </div>

                {/* Dispatch Trigger Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleSendToWhatsApp}
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-900/20"
                  >
                    <MessageCircle size={15} />
                    <span>Enviar no WhatsApp</span>
                  </button>

                  <a
                    href={dispatchAudioUrl}
                    download="mensagem_vocal.mp3"
                    className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs flex items-center justify-center space-x-2 transition border border-white/[0.06]"
                  >
                    <Download size={14} />
                    <span>Baixar MP3</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ASSISTENTE CONVERSACIONAL */}
        {currentTab === "assistant" && (
          <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full space-y-6">
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

        {/* TAB 3: LABORATÓRIO VOCAL (VOICE ANCHORS) */}
        {currentTab === "voice" && (
          <div className="max-w-3xl mx-auto w-full space-y-8 py-2">
            <div className="text-center max-w-xl mx-auto">
              <h2 className="text-xl font-semibold tracking-tight text-white mb-2">
                Âncoras de Voz Real
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Armazene pequenos áudios da sua fala real para o modelo aprender nuances de postura corporal, sotaques e energia emocional.
              </p>
            </div>

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

        {/* TAB 4: ACERVO (RECORDS) */}
        {currentTab === "records" && (
          <div className="max-w-3xl mx-auto w-full space-y-6 py-2">
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
