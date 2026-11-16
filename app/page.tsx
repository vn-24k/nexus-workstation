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
  AlertCircle,
  Square,
  Copy,
  Radio,
  ArrowRight,
  Youtube,
  Link as LinkIcon,
  Clock,
  Scissors,
  Headphones,
  ExternalLink,
  Folder,
  FolderPlus,
  Layers,
  Sliders,
  Music,
  Zap,
  Shield,
  FileAudio,
  CheckCheck,
  Database,
  BookOpen,
  Briefcase,
  Scale,
  Target,
  Heart,
  ChevronRight,
  BookMarked,
} from "lucide-react";
import lexiconData from "@/lib/lexicon_data.json";

interface LibraryFolder {
  id: string;
  name: string;
  icon?: string;
  createdAt?: string;
}

interface LibraryAudio {
  id: string;
  type?: "youtube" | "generated";
  title: string;
  url: string;
  folderId: string;
  folderName: string;
  duration: string;
  durationSec?: number;
  timeRange?: string;
  sizeKb: number;
  streamUrl?: string;
  sampleUrl?: string;
  sampleBase64?: string;
  transcript?: string;
  sampleTranscript?: string;
  notes?: string;
  createdAt?: string;
}

interface VoiceAnchor {
  id: string;
  name: string;
  mood: "firme" | "empolgado" | "calmo" | "engracado" | "descontraido";
  accent: "sp" | "carioca" | "baiano" | "neutro";
  audioUrl: string;
  duration?: string;
  createdAt: string;
  energy?: string;
  confidence?: number;
  aiAnalysis?: string;
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
  category: "voz" | "ideia" | "assistente" | "documento" | "pesquisa" | "geral";
  createdAt: string;
  audioBase64?: string;
  mood?: string;
  duration?: string;
}

const STORAGE_KEYS = {
  AUTH: "vntts_auth",
  VOICE_ANCHORS: "vntts_voice_anchors_v1",
  MESSAGES: "vntts_chat_v1",
  RECORDS: "vntts_records_v1",
};

// Preset Contacts
const PRESET_CONTACTS = [
  { id: "mae", name: "Mãe", phone: "5511976909265", label: "Mãe", icon: "👩‍👦" },
  { id: "tawan", name: "Tawan", phone: "66832024232", label: "Tawan (Namorada)", icon: "💖" },
  { id: "nina", name: "Nina", phone: "5511910765838", label: "Nina", icon: "👧" },
  { id: "outro", name: "Outro", phone: "", label: "Outro Número", icon: "📱" },
];

export default function VnTtsStudio() {
  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  // Navigation: assistant | dispatch | voice | records | lexicon
  const [currentTab, setCurrentTab] = useState<"assistant" | "dispatch" | "voice" | "records" | "lexicon">("dispatch");

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
  const [dispatchAudioSourceText, setDispatchAudioSourceText] = useState<string>("");
  const [isPlayingDispatchAudio, setIsPlayingDispatchAudio] = useState(false);
  const dispatchAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsappResult, setWhatsappResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [bridgeConnected, setBridgeConnected] = useState<boolean | null>(null);

  // Voice Lab & Live Recording
  const [voiceAnchors, setVoiceAnchors] = useState<VoiceAnchor[]>([]);
  const [uploadName, setUploadName] = useState("");
  const [uploadMood, setUploadMood] = useState<VoiceAnchor["mood"]>("firme");
  const [uploadAccent, setUploadAccent] = useState<VoiceAnchor["accent"]>("sp");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Microphone Recording & AI Analysis State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);
  const [voiceAnalysis, setVoiceAnalysis] = useState<{
    mood: string;
    moodLabel: string;
    moodIcon: string;
    confidence: number;
    energy: string;
    energyScore: number;
    cadence: string;
    accent: string;
    accentLabel: string;
    suggestedName: string;
    analysis: string;
  } | null>(null);

  const [playingAnchorId, setPlayingAnchorId] = useState<string | null>(null);
  const anchorAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  // YouTube Audio Extraction & Mirroring State
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeStart, setYoutubeStart] = useState("00:00");
  const [youtubeEnd, setYoutubeEnd] = useState("00:30");
  const [isExtractingYoutube, setIsExtractingYoutube] = useState(false);
  const [youtubeResult, setYoutubeResult] = useState<{
    id?: string;
    title: string;
    duration: string;
    thumbnail: string;
    sizeKb: number;
    audioBase64?: string | null;
    sampleBase64?: string | null;
    streamUrl?: string | null;
    sampleUrl?: string | null;
    transcript?: string;
    sampleTranscript?: string;
    transcriptLang?: string;
    subtitlesDisabled?: boolean;
  } | null>(null);

  // Library & Folders State (Banco de Dados de Áudios e Modelos)
  const [libraryFolders, setLibraryFolders] = useState<LibraryFolder[]>([
    { id: "geral", name: "Geral", icon: "folder" },
    { id: "vozes-geradas", name: "Minhas Vozes Geradas", icon: "mic" },
    { id: "girias-sp", name: "Gírias SP & Quebrada", icon: "zap" },
    { id: "policia-investigacao", name: "Polícia & Interceptações", icon: "shield" },
    { id: "entrevistas-podcasts", name: "Podcasts & Entrevistas", icon: "mic" }
  ]);
  const [libraryAudios, setLibraryAudios] = useState<LibraryAudio[]>([]);
  const [activeFolderFilter, setActiveFolderFilter] = useState<string>("todos");
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState("");
  const [selectedFolderForSave, setSelectedFolderForSave] = useState("geral");

  // Selected Reference Model State (O modelo vocal ativo para a síntese)
  const [selectedModelAudio, setSelectedModelAudio] = useState<{
    id: string;
    title: string;
    sampleBase64?: string;
    streamUrl?: string;
    folderName?: string;
    transcript?: string;
    sampleTranscript?: string;
    type?: "youtube" | "generated";
  } | null>(null);

  // Modo de síntese com o modelo:
  // "exact-video-voice": Voz e timbre 100% idênticos ao locutor do vídeo (padrão de alta fidelidade)
  // "my-voice-cadence": Minha voz adotando a cadência, tom e sotaque do vídeo
  // "default": Minha voz padrão
  const [voiceModelMode, setVoiceModelMode] = useState<"my-voice-cadence" | "exact-video-voice" | "default">("exact-video-voice");
  const [playingLibraryAudioId, setPlayingLibraryAudioId] = useState<string | null>(null);
  const libraryAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isFetchingTranscript, setIsFetchingTranscript] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [isPlayingYoutubeAudio, setIsPlayingYoutubeAudio] = useState(false);
  const youtubeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [mirrorText, setMirrorText] = useState("");
  const [isSynthesizingMirror, setIsSynthesizingMirror] = useState(false);
  const [mirrorAudioBlob, setMirrorAudioBlob] = useState<Blob | null>(null);
  const [mirrorAudioUrl, setMirrorAudioUrl] = useState<string | null>(null);
  const [isPlayingMirrorAudio, setIsPlayingMirrorAudio] = useState(false);
  const mirrorAudioRef = useRef<HTMLAudioElement | null>(null);
  const [mirrorSuccessMsg, setMirrorSuccessMsg] = useState<string | null>(null);
  const [isSavingGeneratedAudio, setIsSavingGeneratedAudio] = useState(false);
  const [generatedAudioCustomTitle, setGeneratedAudioCustomTitle] = useState("");
  const [generatedAudioTargetFolder, setGeneratedAudioTargetFolder] = useState("vozes-geradas");

  // Lexicon & Speech Styles (Dicionário de Gírias SP + Biblioteca Técnica/Profissional)
  const [selectedSpeechStyle, setSelectedSpeechStyle] = useState<"sp_quebrada" | "executivo" | "tecnico_juridico" | "persuasao" | "afetivo">("sp_quebrada");
  const [isTransformingText, setIsTransformingText] = useState(false);
  const [lexiconDomain, setLexiconDomain] = useState<"girias_sp" | "tecnico_profissional" | "transformacoes" | "dialogos">("girias_sp");
  const [lexiconCategory, setLexiconCategory] = useState<string>("todos");
  const [lexiconSearch, setLexiconSearch] = useState("");
  const [copiedTermId, setCopiedTermId] = useState<string | null>(null);

  // Mapeamento de estilo para mood do motor
  const handleSelectSpeechStyle = (style: "sp_quebrada" | "executivo" | "tecnico_juridico" | "persuasao" | "afetivo") => {
    setSelectedSpeechStyle(style);
    if (style === "sp_quebrada") setDispatchMood("sp");
    else if (style === "executivo" || style === "tecnico_juridico") setDispatchMood("firme");
    else if (style === "persuasao") setDispatchMood("empolgado");
    else if (style === "afetivo") setDispatchMood("calmo");
  };

  // Transformar texto para o estilo selecionado
  const handleTransformDispatchText = async (targetStyle?: string) => {
    const styleToUse = targetStyle || selectedSpeechStyle;
    const currentText = dispatchText.trim();
    if (!currentText || isTransformingText) return;

    setIsTransformingText(true);
    try {
      const res = await fetch("/api/lexicon/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentText, style: styleToUse }),
      });
      const data = await res.json();
      if (data.ok && data.adapted) {
        handleDispatchTextChange(data.adapted);
      }
    } catch (e) {
      console.error("Erro ao transformar texto:", e);
    } finally {
      setIsTransformingText(false);
    }
  };

  // Inserir termo ou frase no editor de fala e navegar para o disparo
  const handleInsertToDispatch = (textToInsert: string, mode: "replace" | "append" = "replace") => {
    if (mode === "replace") {
      handleDispatchTextChange(textToInsert);
    } else {
      const current = dispatchText.trim();
      const updated = current ? `${current} ${textToInsert}` : textToInsert;
      handleDispatchTextChange(updated);
    }
    setCurrentTab("dispatch");
  };

  // Copiar termo para a área de transferência
  const handleCopyTerm = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTermId(id);
    setTimeout(() => setCopiedTermId(null), 2000);
  };

  // Records / Acervo
  const [records, setRecords] = useState<RecordNote[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState<RecordNote["category"]>("ideia");
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [savedDispatchSuccess, setSavedDispatchSuccess] = useState(false);
  const messageAudioBlobs = useRef<Map<string, Blob>>(new Map());
  const [playingRecordId, setPlayingRecordId] = useState<string | null>(null);
  const recordAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Load from LocalStorage & Check WhatsApp Bridge
  useEffect(() => {
    const authSaved = localStorage.getItem(STORAGE_KEYS.AUTH) || localStorage.getItem("nexus_apple_auth");
    setIsAuthenticated(authSaved === "true");

    fetch("/api/whatsapp/status")
      .then((res) => res.json())
      .then((data) => setBridgeConnected(data.ok && data.connected))
      .catch(() => setBridgeConnected(false));

    const chatSaved = localStorage.getItem(STORAGE_KEYS.MESSAGES) || localStorage.getItem("nexus_apple_chat_v1");
    if (chatSaved) {
      try {
        setMessages(JSON.parse(chatSaved));
      } catch (e) {
        setMessages(getDefaultMessages());
      }
    } else {
      setMessages(getDefaultMessages());
    }

    const voiceSaved = localStorage.getItem(STORAGE_KEYS.VOICE_ANCHORS) || localStorage.getItem("nexus_voice_anchors_v1");
    if (voiceSaved) {
      try {
        setVoiceAnchors(JSON.parse(voiceSaved));
      } catch (e) {
        setVoiceAnchors([]);
      }
    }

    const recsSaved = localStorage.getItem(STORAGE_KEYS.RECORDS) || localStorage.getItem("nexus_apple_records_v1");
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
        content: "VN TTS ativo. Sistema calibrado para síntese de voz nativa, raciocínio e disparo direto no WhatsApp. Como posso ajudar?",
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

  // Helper to handle text updates and cleanly reset stale audio
  const handleDispatchTextChange = (text: string) => {
    setDispatchText(text);
    if (dispatchAudioPlayerRef.current) {
      dispatchAudioPlayerRef.current.pause();
      dispatchAudioPlayerRef.current = null;
    }
    setIsPlayingDispatchAudio(false);
    if (dispatchAudioUrl) {
      URL.revokeObjectURL(dispatchAudioUrl);
      setDispatchAudioUrl(null);
    }
    setDispatchAudioBlob(null);
    setDispatchAudioSourceText("");
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

    // Stop previous audio playback before starting new one
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    setLoadingAudioId(msgId);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ text, timestamp: Date.now() }),
      });

      if (!res.ok) throw new Error("Erro na síntese vocal");

      const blob = await res.blob();
      messageAudioBlobs.current.set(msgId, blob);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeAudioRef.current = audio;

      audio.onended = () => {
        setPlayingMessageId(null);
        activeAudioRef.current = null;
      };

      audio.onerror = () => {
        setPlayingMessageId(null);
        activeAudioRef.current = null;
      };

      setPlayingMessageId(msgId);
      audio.play().catch(() => {
        setPlayingMessageId(null);
        activeAudioRef.current = null;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudioId(null);
    }
  };

  // DISPATCH TAB: Generate Audio with My Voice
  const handleSynthesizeDispatch = async () => {
    const textToSynthesize = dispatchText.trim();
    if (!textToSynthesize || isSynthesizingDispatch) return;

    // Immediately stop and cleanup any previous player & audio URL
    if (dispatchAudioPlayerRef.current) {
      dispatchAudioPlayerRef.current.pause();
      dispatchAudioPlayerRef.current = null;
    }
    if (dispatchAudioUrl) {
      URL.revokeObjectURL(dispatchAudioUrl);
    }

    setIsSynthesizingDispatch(true);
    setDispatchAudioBlob(null);
    setDispatchAudioUrl(null);
    setIsPlayingDispatchAudio(false);
    setDispatchAudioSourceText("");

    try {
      const activeSampleB64 = selectedModelAudio?.sampleBase64 || undefined;
      const activeSampleText = selectedModelAudio?.transcript || "";
      const mode = activeSampleB64 ? voiceModelMode : "default";

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          text: textToSynthesize,
          mood: dispatchMood,
          modelMode: mode,
          referenceAudioBase64: activeSampleB64,
          referenceAudioText: activeSampleText,
          timestamp: Date.now(),
        }),
      });

      if (!res.ok) throw new Error("Falha na síntese de áudio");

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);

      setDispatchAudioBlob(blob);
      setDispatchAudioUrl(audioUrl);
      setDispatchAudioSourceText(textToSynthesize);
      setGeneratedAudioCustomTitle(
        textToSynthesize.length > 40 ? `${textToSynthesize.substring(0, 40)}...` : textToSynthesize
      );
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

    if (isPlayingDispatchAudio) {
      if (dispatchAudioPlayerRef.current) {
        dispatchAudioPlayerRef.current.pause();
      }
      setIsPlayingDispatchAudio(false);
      return;
    }

    // Always stop and recreate player so new audio URL is strictly respected
    if (dispatchAudioPlayerRef.current) {
      dispatchAudioPlayerRef.current.pause();
      dispatchAudioPlayerRef.current = null;
    }

    const audio = new Audio(dispatchAudioUrl);
    dispatchAudioPlayerRef.current = audio;

    audio.onended = () => {
      setIsPlayingDispatchAudio(false);
    };

    audio.onerror = () => {
      setIsPlayingDispatchAudio(false);
    };

    audio.play()
      .then(() => setIsPlayingDispatchAudio(true))
      .catch((e) => {
        console.error("Erro ao tocar áudio:", e);
        setIsPlayingDispatchAudio(false);
      });
  };

  // DISPATCH TAB: Direct Automated Voice Note (PTT) dispatch via WhatsApp Bridge (5511995685756)
  const handleSendToWhatsApp = async (overrideText?: string) => {
    const textToSend = (overrideText || dispatchText).trim();
    const targetPhone = selectedContact.id === "outro" ? customPhone.replace(/\D/g, "") : selectedContact.phone;

    if (!targetPhone) {
      alert("Por favor, selecione ou informe o número do WhatsApp de destino.");
      return;
    }

    if (!textToSend && !dispatchAudioBlob) {
      alert("Por favor, digite uma mensagem ou gere o áudio antes de disparar.");
      return;
    }

    setIsSendingWhatsApp(true);
    setWhatsappResult(null);

    try {
      let audioBase64: string | undefined = undefined;
      // Only reuse existing audio blob if it strictly matches the current textToSend!
      if (dispatchAudioBlob && dispatchAudioSourceText === textToSend && !overrideText) {
        const buffer = await dispatchAudioBlob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        audioBase64 = btoa(binary);
      }

      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          phone: targetPhone,
          text: textToSend,
          audioBase64,
          mood: dispatchMood,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setWhatsappResult({
          ok: true,
          message: `Áudio PTT gravado na hora e entregue com sucesso para ${selectedContact.name || targetPhone} pelo seu WhatsApp (11995685756)!`,
        });
      } else {
        setWhatsappResult({
          ok: false,
          message: data.error || "Falha ao enviar áudio pelo WhatsApp.",
        });
      }
    } catch (err: any) {
      setWhatsappResult({
        ok: false,
        message: err.message || "Erro de conexão ao contatar a ponte WhatsApp.",
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Live Microphone Recording & AI Analysis Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedBlob(audioBlob);
        setRecordedAudioUrl(audioUrl);

        // Stop media tracks
        stream.getTracks().forEach((track) => track.stop());

        // Trigger AI emotion and acoustic analysis
        analyzeVoiceAudio(audioBlob);
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);
      setRecordedBlob(null);
      setRecordedAudioUrl(null);
      setVoiceAnalysis(null);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert("Acesso ao microfone necessário para gravar sua voz: " + (err.message || err));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
    setRecordedBlob(null);
    setRecordedAudioUrl(null);
    setVoiceAnalysis(null);
    setRecordingSeconds(0);
  };

  const analyzeVoiceAudio = async (blob: Blob, textHint?: string) => {
    setIsAnalyzingVoice(true);
    try {
      const arrayBuf = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const audioBase64 = btoa(binary);

      const res = await fetch("/api/voice/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          mimeType: blob.type,
          duration: recordingSeconds || 8,
          textHint,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setVoiceAnalysis(data);
        setUploadName(data.suggestedName || "Amostra Gravada");
        setUploadMood(data.mood || "firme");
        setUploadAccent(data.accent || "sp");
      }
    } catch (e) {
      console.error("Erro na análise acústica:", e);
    } finally {
      setIsAnalyzingVoice(false);
    }
  };

  const handleSaveRecordedAnchor = () => {
    if (!recordedAudioUrl) return;

    const newAnchor: VoiceAnchor = {
      id: `anchor_${Date.now()}`,
      name: uploadName.trim() || voiceAnalysis?.suggestedName || "Amostra Vocal",
      mood: (voiceAnalysis?.mood as any) || uploadMood,
      accent: (voiceAnalysis?.accent as any) || uploadAccent,
      audioUrl: recordedAudioUrl,
      duration: `${recordingSeconds}s`,
      createdAt: new Date().toISOString(),
      energy: voiceAnalysis?.energy,
      confidence: voiceAnalysis?.confidence,
      aiAnalysis: voiceAnalysis?.analysis,
    };

    setVoiceAnchors((prev) => [newAnchor, ...prev]);
    cancelRecording();
    setUploadName("");
  };

  const handleToggleAnchorAudio = (anchor: VoiceAnchor) => {
    if (playingAnchorId === anchor.id) {
      anchorAudioRef.current?.pause();
      setPlayingAnchorId(null);
    } else {
      if (anchorAudioRef.current) {
        anchorAudioRef.current.pause();
      }
      anchorAudioRef.current = new Audio(anchor.audioUrl);
      anchorAudioRef.current.onended = () => setPlayingAnchorId(null);
      anchorAudioRef.current.play();
      setPlayingAnchorId(anchor.id);
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

  // Carregar Biblioteca e Pastas
  const fetchLibrary = async () => {
    try {
      setIsLibraryLoading(true);
      const res = await fetch("/api/library");
      const data = await res.json();
      if (data.ok) {
        if (data.folders && data.folders.length > 0) setLibraryFolders(data.folders);
        if (data.audios) setLibraryAudios(data.audios);
      }
    } catch (e) {
      console.error("Erro ao carregar acervo:", e);
    } finally {
      setIsLibraryLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  // YouTube Audio Extraction & Cadence Mirroring Handlers
  const handleExtractYoutube = async () => {
    if (!youtubeUrl || !youtubeUrl.trim()) {
      setYoutubeError("Cole um link do YouTube para extrair.");
      return;
    }
    setIsExtractingYoutube(true);
    setYoutubeError(null);
    setYoutubeResult(null);
    setMirrorAudioUrl(null);
    setMirrorSuccessMsg(null);

    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: youtubeUrl.trim(),
          start: youtubeStart.trim() || "0",
          end: youtubeEnd.trim() || undefined,
        }),
      });

      const initialData = await res.json();
      if (!res.ok || !initialData.ok) {
        throw new Error(initialData.error || "Falha ao iniciar extração do áudio.");
      }

      let data = initialData;

      // Se o servidor respondeu com trabalho em segundo plano (evita timeout de 30s para áudios longos)
      if (initialData.status === "processing" && initialData.jobId) {
        setMirrorSuccessMsg("Conectando ao YouTube... Processando áudio em segundo plano sem limite de tempo.");
        const pollStart = Date.now();
        let jobFinished = false;

        while (!jobFinished && Date.now() - pollStart < 600000) { // Até 10 minutos
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const pollRes = await fetch(`/api/youtube?jobId=${encodeURIComponent(initialData.jobId)}`);
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              if (pollData.ok) {
                if (pollData.status === "done") {
                  data = pollData;
                  jobFinished = true;
                } else if (pollData.status === "processing") {
                  if (pollData.progress) {
                    setMirrorSuccessMsg(`${pollData.progress} (${pollData.percent || 40}%)`);
                  }
                } else if (pollData.status === "error") {
                  throw new Error(pollData.error || "Erro durante o processamento do vídeo.");
                }
              } else if (pollData.error) {
                throw new Error(pollData.error);
              }
            }
          } catch (pollErr: any) {
            console.warn("Aviso no polling:", pollErr);
            if (pollErr.message && !pollErr.message.includes("fetch")) {
              throw pollErr;
            }
          }
        }

        if (!jobFinished) {
          throw new Error("Tempo limite de processamento excedido após 10 minutos.");
        }
      }

      setYoutubeResult(data);
      if (data.transcript && data.transcript.trim()) {
        setMirrorText(data.transcript.trim());
        setMirrorSuccessMsg(`Áudio de ${data.duration || 'longa duração'} extraído com sucesso! Fala detectada e carregada na caixa de texto.`);
      } else {
        setMirrorText("");
        setMirrorSuccessMsg(`Áudio de ${data.duration || 'longa duração'} extraído com sucesso! O vídeo não possui legendas ativas ou o áudio possui ruído de fundo. Digite na caixa abaixo o texto exato que você quer falar.`);
      }

      // Se ainda não temos um modelo selecionado, define este como modelo ativo e ativa modo de alta fidelidade
      if (data.sampleBase64 || data.audioBase64) {
        setSelectedModelAudio({
          id: data.id || `yt_${Date.now()}`,
          title: data.title || "Áudio do YouTube",
          sampleBase64: data.sampleBase64 || data.audioBase64 || undefined,
          streamUrl: data.streamUrl || undefined,
          transcript: data.transcript || undefined,
        });
        setVoiceModelMode("exact-video-voice"); // Timbre e tom 100% idênticos ao áudio extraído!
      }
    } catch (err: any) {
      setYoutubeError(err.message || "Erro ao conectar com o extrator de áudio.");
    } finally {
      setIsExtractingYoutube(false);
    }
  };

  // Salvar no Banco de Dados em uma Pasta Específica
  const handleSaveToLibrary = async (targetFolderId?: string) => {
    if (!youtubeResult) return;
    const folderId = targetFolderId || selectedFolderForSave || "geral";
    const folder = libraryFolders.find((f) => f.id === folderId) || libraryFolders[0];

    setIsSavingToLibrary(true);
    setYoutubeError(null);
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          id: youtubeResult.id,
          title: youtubeResult.title,
          url: youtubeUrl,
          folderId: folder.id,
          duration: youtubeResult.duration,
          timeRange: `${youtubeStart} - ${youtubeEnd || "Fim"}`,
          transcript: mirrorText || youtubeResult.transcript || "",
          audioBase64: youtubeResult.audioBase64 || undefined,
          sampleBase64: youtubeResult.sampleBase64 || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Erro ao salvar na biblioteca.");

      if (data.audios) setLibraryAudios(data.audios);
      setMirrorSuccessMsg(`Áudio salvo com sucesso na pasta "${folder.name}"!`);
    } catch (err: any) {
      setYoutubeError(err.message || "Erro ao salvar áudio no banco de dados.");
    } finally {
      setIsSavingToLibrary(false);
    }
  };

  // Salvar a Minha Voz Gerada no Banco de Dados / Acervo
  const handleSaveGeneratedAudio = async (source: "mirror" | "dispatch", targetFolderId?: string) => {
    const audioBlob = source === "mirror" ? mirrorAudioBlob : dispatchAudioBlob;
    const textSpoken = source === "mirror" ? mirrorText : dispatchAudioSourceText;
    const modelName = selectedModelAudio?.title || (source === "mirror" ? (youtubeResult?.title || "Modelo YouTube") : "Voz do Usuário");

    if (!audioBlob) {
      alert("Nenhum áudio gerado para salvar.");
      return;
    }

    setIsSavingGeneratedAudio(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      const audioBase64 = await base64Promise;

      const title = generatedAudioCustomTitle.trim() || (textSpoken
        ? `Voz: ${textSpoken.substring(0, 35)}${textSpoken.length > 35 ? "..." : ""}`
        : `Voz Gerada (${modelName.substring(0, 25)})`);
      const folderId = targetFolderId || generatedAudioTargetFolder || "vozes-geradas";

      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          type: "generated",
          title,
          folderId,
          duration: "Gerado",
          transcript: textSpoken,
          audioBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Falha ao salvar voz no banco de dados.");

      if (data.audios) setLibraryAudios(data.audios);
      const targetFolderName = data.audio?.folderName || "Minhas Vozes Geradas";
      setMirrorSuccessMsg(`Áudio com sua voz gerada salvo com sucesso no banco de dados na pasta "${targetFolderName}"!`);
      alert(`Áudio com sua voz gerada foi salvo com sucesso no banco de dados na pasta "${targetFolderName}"! Acesse a aba "Acervo & Pastas" para ouvi-lo ou usá-lo a qualquer momento.`);
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao salvar voz gerada no banco de dados: ${err.message || 'Falha ao salvar.'}`);
    } finally {
      setIsSavingGeneratedAudio(false);
    }
  };

  // Baixar Áudio Gerado (.mp3)
  const handleDownloadGeneratedAudio = (source: "mirror" | "dispatch") => {
    const audioBlob = source === "mirror" ? mirrorAudioBlob : dispatchAudioBlob;
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `minha-voz-gerada-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Criar nova pasta
  const handleCreateFolder = async () => {
    if (!newFolderNameInput.trim()) return;
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "folder",
          name: newFolderNameInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok && data.folders) {
        setLibraryFolders(data.folders);
        setSelectedFolderForSave(data.folders[data.folders.length - 1].id);
        setNewFolderNameInput("");
        setShowNewFolderModal(false);
        setMirrorSuccessMsg("Nova pasta criada com sucesso!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Deletar áudio da biblioteca
  const handleDeleteLibraryAudio = async (audioId: string) => {
    try {
      const res = await fetch(`/api/library?audioId=${encodeURIComponent(audioId)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok && data.audios) {
        setLibraryAudios(data.audios);
        if (selectedModelAudio?.id === audioId) {
          setSelectedModelAudio(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Ativar modelo vocal a partir de um áudio da biblioteca
  const handleSelectModelFromLibrary = (audio: LibraryAudio) => {
    setSelectedModelAudio({
      id: audio.id,
      title: audio.title,
      sampleBase64: audio.sampleBase64,
      streamUrl: audio.streamUrl,
      folderName: audio.folderName,
      transcript: audio.transcript,
      sampleTranscript: audio.sampleTranscript || audio.transcript,
      type: audio.type,
    });
    setVoiceModelMode("exact-video-voice"); // Timbre e sotaque idênticos configurados!
    if (audio.transcript) {
      setMirrorText(audio.transcript);
    }
    setMirrorSuccessMsg(`🎯 Modelo "${audio.title}" ativado com sucesso! Timbre e sotaque idênticos ao áudio configurados.`);
  };

  // Reproduzir áudio da biblioteca
  const handleToggleLibraryAudioPlay = (audio: LibraryAudio) => {
    if (playingLibraryAudioId === audio.id) {
      libraryAudioPlayerRef.current?.pause();
      setPlayingLibraryAudioId(null);
    } else {
      if (libraryAudioPlayerRef.current) libraryAudioPlayerRef.current.pause();
      const playSrc = audio.sampleBase64 || audio.streamUrl || "";
      if (!playSrc) return;
      libraryAudioPlayerRef.current = new Audio(playSrc);
      libraryAudioPlayerRef.current.onended = () => setPlayingLibraryAudioId(null);
      libraryAudioPlayerRef.current.onerror = () => setPlayingLibraryAudioId(null);
      libraryAudioPlayerRef.current.play();
      setPlayingLibraryAudioId(audio.id);
    }
  };

  // Obter ou Recarregar Fala Transcrita do Vídeo
  const handleFetchTranscript = async () => {
    if (!youtubeUrl || !youtubeUrl.trim()) return;
    setIsFetchingTranscript(true);
    setYoutubeError(null);
    try {
      const res = await fetch("/api/youtube/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: youtubeUrl.trim(),
          start: youtubeStart.trim() || "0",
          end: youtubeEnd.trim() || "30",
        }),
      });
      const data = await res.json();
      if (data.ok && data.text) {
        setMirrorText(data.text.trim());
        if (youtubeResult) {
          setYoutubeResult({ ...youtubeResult, transcript: data.text.trim(), transcriptLang: data.language, subtitlesDisabled: false });
        }
        setMirrorSuccessMsg(`Fala capturada com sucesso (${data.language || 'PT'})! Pronto para gerar.`);
      } else if (data.subtitlesDisabled) {
        if (youtubeResult) {
          setYoutubeResult({ ...youtubeResult, subtitlesDisabled: true });
        }
        setYoutubeError("Legendas desativadas pelo criador deste vídeo no YouTube. Digite a frase falada na caixa abaixo.");
      } else {
        setYoutubeError(data.error || "Não foi possível extrair a fala automática deste trecho.");
      }
    } catch (err: any) {
      setYoutubeError(err.message || "Erro ao consultar transcrição do YouTube.");
    } finally {
      setIsFetchingTranscript(false);
    }
  };

  // Ação Imediata: Falar a Mesma Coisa do Vídeo com a Minha Voz
  const handleSpeakSameThing = async () => {
    let textToSpeak = mirrorText.trim();
    if (!textToSpeak && youtubeResult?.transcript) {
      textToSpeak = youtubeResult.transcript.trim();
      setMirrorText(textToSpeak);
    }

    if (!textToSpeak && youtubeUrl && !youtubeResult?.subtitlesDisabled) {
      setIsSynthesizingMirror(true);
      try {
        const res = await fetch("/api/youtube/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: youtubeUrl.trim(),
            start: youtubeStart.trim() || "0",
            end: youtubeEnd.trim() || "30",
          }),
        });
        const data = await res.json();
        if (data.ok && data.text) {
          textToSpeak = data.text.trim();
          setMirrorText(textToSpeak);
          if (youtubeResult) {
            setYoutubeResult({ ...youtubeResult, transcript: data.text.trim(), transcriptLang: data.language });
          }
        } else if (data.subtitlesDisabled) {
          if (youtubeResult) {
            setYoutubeResult({ ...youtubeResult, subtitlesDisabled: true });
          }
        }
      } catch (e) {}
    }

    if (!textToSpeak) {
      if (youtubeResult?.subtitlesDisabled) {
        setYoutubeError("As legendas deste vídeo estão desativadas no YouTube. Digite o que a pessoa falou na caixa abaixo para sintetizar com a sua voz.");
      } else {
        setYoutubeError("Nenhuma fala detectada automaticamente. Digite o que o vídeo falou no campo de roteiro.");
      }
      setIsSynthesizingMirror(false);
      return;
    }

    handleSynthesizeMirror();
  };

  const handleToggleYoutubeAudio = () => {
    const playSrc = youtubeResult?.audioBase64 || youtubeResult?.streamUrl;
    if (!playSrc) return;
    if (isPlayingYoutubeAudio) {
      youtubeAudioRef.current?.pause();
      setIsPlayingYoutubeAudio(false);
    } else {
      if (youtubeAudioRef.current) {
        youtubeAudioRef.current.pause();
      }
      youtubeAudioRef.current = new Audio(playSrc);
      youtubeAudioRef.current.onended = () => setIsPlayingYoutubeAudio(false);
      youtubeAudioRef.current.onerror = () => setIsPlayingYoutubeAudio(false);
      youtubeAudioRef.current.play();
      setIsPlayingYoutubeAudio(true);
    }
  };

  const handleSynthesizeMirror = async (overrideText?: string) => {
    const textToSpeak = (overrideText || mirrorText).trim();
    if (!textToSpeak) {
      setYoutubeError("Digite o texto ou roteiro que você deseja que a voz fale no campo abaixo.");
      return;
    }

    setIsSynthesizingMirror(true);
    setYoutubeError(null);
    try {
      const activeSampleB64 = selectedModelAudio?.sampleBase64 || youtubeResult?.sampleBase64 || youtubeResult?.audioBase64 || undefined;
      // Fala original falada no áudio de referência (ASR ou transcrição legítima do YouTube)
      // NUNCA o roteiro que o usuário acabou de digitar para falar!
      const activeSampleText = selectedModelAudio?.sampleTranscript || selectedModelAudio?.transcript || youtubeResult?.sampleTranscript || youtubeResult?.transcript || "";
      const mode = activeSampleB64 ? voiceModelMode : "default";

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          modelMode: mode,
          referenceAudioBase64: activeSampleB64,
          referenceAudioText: activeSampleText,
          timestamp: Date.now(),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Erro na síntese vocal.");
      }

      const blob = await res.blob();
      setMirrorAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setMirrorAudioUrl(url);
      setGeneratedAudioCustomTitle(
        textToSpeak.length > 40 ? `${textToSpeak.substring(0, 40)}...` : textToSpeak
      );
      setMirrorSuccessMsg(
        mode === "my-voice-cadence"
          ? "Áudio sintetizado com sua voz adotando a cadência, tom e sotaque do modelo!"
          : mode === "exact-video-voice"
          ? "Áudio sintetizado com a voz e timbre idênticos ao locutor do vídeo!"
          : "Áudio sintetizado com sua voz padrão!"
      );

      if (mirrorAudioRef.current) mirrorAudioRef.current.pause();
      const audio = new Audio(url);
      mirrorAudioRef.current = audio;
      audio.onended = () => setIsPlayingMirrorAudio(false);
      audio.onerror = () => setIsPlayingMirrorAudio(false);
      audio.play();
      setIsPlayingMirrorAudio(true);
    } catch (err: any) {
      setYoutubeError(err.message || "Falha na síntese vocal.");
    } finally {
      setIsSynthesizingMirror(false);
    }
  };

  const handleToggleMirrorAudio = () => {
    if (!mirrorAudioUrl) return;
    if (isPlayingMirrorAudio) {
      mirrorAudioRef.current?.pause();
      setIsPlayingMirrorAudio(false);
    } else {
      if (mirrorAudioRef.current) mirrorAudioRef.current.pause();
      const audio = new Audio(mirrorAudioUrl);
      mirrorAudioRef.current = audio;
      audio.onended = () => setIsPlayingMirrorAudio(false);
      audio.onerror = () => setIsPlayingMirrorAudio(false);
      audio.play();
      setIsPlayingMirrorAudio(true);
    }
  };

  const handleSendYoutubeToDispatch = () => {
    const textToSend = mirrorText.trim() || youtubeResult?.title || "";
    handleDispatchTextChange(textToSend);
    setCurrentTab("dispatch");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveYoutubeAnchor = () => {
    if (!youtubeResult) return;
    const newAnchor: VoiceAnchor = {
      id: `anchor_yt_${Date.now()}`,
      name: `[YouTube] ${youtubeResult.title.substring(0, 32)}...`,
      mood: "empolgado",
      accent: "sp",
      audioUrl: youtubeResult.audioBase64 || youtubeResult.streamUrl || "",
      duration: youtubeResult.duration || "0:30",
      createdAt: new Date().toISOString(),
      energy: "Alta (YouTube)",
      confidence: 96,
      aiAnalysis: `Amostra extraída do YouTube (${youtubeResult.duration || "30s"}). Modelo acústico calibrado para espelhamento vocal.`,
    };

    setVoiceAnchors((prev) => [newAnchor, ...prev]);
    setMirrorSuccessMsg("Modelo do YouTube salvo com sucesso na Galeria de Âncoras!");
  };

  // Quick Action: Use Record content directly in Vocal Dispatch
  const handleUseInDispatch = (content: string) => {
    handleDispatchTextChange(content);
    setCurrentTab("dispatch");
  };

  const handleCopyNote = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedNoteId(id);
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  // Records Actions
  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    const newNote: RecordNote = {
      id: `rec_${Date.now()}`,
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      category: newNoteCategory,
      createdAt: new Date().toISOString(),
    };
    setRecords((prev) => [newNote, ...prev]);
    setNewNoteTitle("");
    setNewNoteContent("");
    setNewNoteCategory("ideia");
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
      category: "assistente",
      createdAt: new Date().toISOString(),
    };
    setRecords((prev) => [newNote, ...prev]);
    setSavedSuccessId(id);
    setTimeout(() => setSavedSuccessId(null), 2500);
  };

  // Save generated dispatch audio directly to Acervo
  const handleSaveDispatchAudioToRecords = async () => {
    if (!dispatchText.trim()) return;

    let base64 = "";
    if (dispatchAudioBlob) {
      const buffer = await dispatchAudioBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64 = btoa(binary);
    }

    const titleSnippet = dispatchText.substring(0, 38).replace(/[*#\n_]/g, " ").trim() + "...";
    const newRecord: RecordNote = {
      id: `audio_${Date.now()}`,
      title: titleSnippet || "Mensagem de Voz Salva",
      content: dispatchText,
      category: "voz",
      createdAt: new Date().toISOString(),
      audioBase64: base64 || undefined,
      mood: dispatchMood,
      duration: "0:08",
    };

    setRecords((prev) => [newRecord, ...prev]);
    setSavedDispatchSuccess(true);
    setTimeout(() => setSavedDispatchSuccess(false), 3000);
  };

  // Save Assistant message with synthesized audio to Acervo
  const handleSaveAssistantAudioToRecords = async (msgId: string, content: string) => {
    const existingBlob = messageAudioBlobs.current.get(msgId);
    let base64 = "";

    if (existingBlob) {
      const buffer = await existingBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64 = btoa(binary);
    }

    const titleSnippet = content.substring(0, 38).replace(/[*#\n_]/g, " ").trim() + "...";
    const newRecord: RecordNote = {
      id: `assist_audio_${Date.now()}`,
      title: titleSnippet || "Resposta Vocal Salva",
      content: content,
      category: "voz",
      createdAt: new Date().toISOString(),
      audioBase64: base64 || undefined,
      mood: "sp",
      duration: "0:10",
    };

    setRecords((prev) => [newRecord, ...prev]);
    setSavedSuccessId(msgId);
    setTimeout(() => setSavedSuccessId(null), 2500);
  };

  // Play / Pause audio from Acervo record
  const handleToggleRecordAudio = (record: RecordNote) => {
    if (!record.audioBase64) return;

    if (playingRecordId === record.id) {
      recordAudioPlayerRef.current?.pause();
      setPlayingRecordId(null);
    } else {
      if (recordAudioPlayerRef.current) {
        recordAudioPlayerRef.current.pause();
      }
      const dataUri = `data:audio/mp3;base64,${record.audioBase64}`;
      const audio = new Audio(dataUri);
      recordAudioPlayerRef.current = audio;
      audio.onended = () => setPlayingRecordId(null);
      audio.play();
      setPlayingRecordId(record.id);
    }
  };

  // Re-use saved audio directly in Disparo Vocal for 1-click WhatsApp sending
  const handleDispatchSavedAudio = (record: RecordNote) => {
    handleDispatchTextChange(record.content);
    if (record.audioBase64) {
      try {
        const byteCharacters = atob(record.audioBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "audio/mp3" });
        const url = URL.createObjectURL(blob);
        setDispatchAudioBlob(blob);
        setDispatchAudioUrl(url);
        setDispatchAudioSourceText(record.content.trim());
      } catch (e) {
        console.error("Erro ao decodificar áudio salvo:", e);
      }
    }
    setCurrentTab("dispatch");
  };

  const handleDownloadRecordAudio = (record: RecordNote) => {
    if (!record.audioBase64) return;
    const a = document.createElement("a");
    a.href = `data:audio/mp3;base64,${record.audioBase64}`;
    a.download = `audio_${record.id}.mp3`;
    a.click();
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
              <h1 className="text-lg font-semibold tracking-tight text-white">VN TTS</h1>
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
            <span className="text-xs font-medium tracking-tight text-white">VN TTS</span>
          </div>

          {/* Segmented Control Pill with 5 Tabs */}
          <nav className="flex items-center p-1 rounded-full bg-zinc-900/80 border border-white/[0.08] text-xs overflow-x-auto">
            <button
              onClick={() => setCurrentTab("dispatch")}
              className={`px-3.5 py-1.5 rounded-full transition-all duration-200 flex items-center space-x-1.5 shrink-0 ${
                currentTab === "dispatch"
                  ? "bg-white text-black font-medium shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Disparo Vocal</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>
            <button
              onClick={() => setCurrentTab("lexicon")}
              className={`px-3.5 py-1.5 rounded-full transition-all duration-200 shrink-0 flex items-center space-x-1.5 ${
                currentTab === "lexicon"
                  ? "bg-white text-black font-medium shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <BookOpen size={12} className={currentTab === "lexicon" ? "text-amber-600" : "text-amber-400"} />
              <span>Estilos & Gírias</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium ${
                currentTab === "lexicon" ? "bg-black/10 text-black" : "bg-amber-500/20 text-amber-300"
              }`}>
                530
              </span>
            </button>
            <button
              onClick={() => setCurrentTab("voice")}
              className={`px-3.5 py-1.5 rounded-full transition-all duration-200 shrink-0 ${
                currentTab === "voice"
                  ? "bg-white text-black font-medium shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Voz Real & Modelos
            </button>
            <button
              onClick={() => setCurrentTab("records")}
              className={`px-3.5 py-1.5 rounded-full transition-all duration-200 shrink-0 ${
                currentTab === "records"
                  ? "bg-white text-black font-medium shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Acervo
            </button>
            <button
              onClick={() => setCurrentTab("assistant")}
              className={`px-3.5 py-1.5 rounded-full transition-all duration-200 shrink-0 ${
                currentTab === "assistant"
                  ? "bg-white text-black font-medium shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Assistente
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
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                Digite sua mensagem. O áudio é sintetizado com sua voz clonada e entregue no WhatsApp como gravação ao vivo (PTT nativo com microfone verde).
              </p>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-white/[0.08] text-[10px] text-zinc-300">
                <span className={`w-1.5 h-1.5 rounded-full ${bridgeConnected ? "bg-emerald-400 animate-pulse" : "bg-emerald-500"}`}></span>
                <span>Conta WhatsApp: <strong className="text-white">+55 11 99568-5756</strong></span>
                <span className="text-zinc-500">•</span>
                <span className="text-emerald-400 font-mono">PTT Nativo Ativo</span>
              </div>
            </div>

            {/* Banner de Modelo Ativo de Cadência / Sotaque */}
            {selectedModelAudio && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Sparkles size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                      <span>Estilo Vinculado: {selectedModelAudio.title}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300">
                        {voiceModelMode === "exact-video-voice" ? "Voz do Vídeo" : "Minha Voz + Sotaque"}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      {voiceModelMode === "exact-video-voice"
                        ? "Sintetizará com o timbre e tom idênticos ao vídeo do YouTube."
                        : "Sua voz adotará o ritmo, pausas, tom e sotaque deste modelo."}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedModelAudio(null)}
                  className="text-[10px] text-zinc-400 hover:text-white px-2 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 transition shrink-0 cursor-pointer"
                >
                  Desvincular
                </button>
              </div>
            )}

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

            {/* Text & Speech Style Input Card (Integrado com o Dicionário SP & Biblioteca Técnica) */}
            <div className="apple-glass rounded-3xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-white/5">
                <div>
                  <label className="text-[11px] font-semibold text-white block">
                    Como você prefere falar este áudio?
                  </label>
                  <p className="text-[10px] text-zinc-400">
                    Selecione o registro vocal e o vocabulário para sua voz clonada reproduzir.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentTab("lexicon")}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center space-x-1 cursor-pointer self-start sm:self-auto py-1 px-2 rounded-lg bg-amber-500/10 border border-amber-500/20 transition"
                >
                  <BookOpen size={12} />
                  <span>Dicionário Completo (530 termos)</span>
                  <ChevronRight size={11} />
                </button>
              </div>

              {/* Seletor de Estilos de Fala (5 Modos Vocais) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-0.5">
                {[
                  { id: "sp_quebrada", label: "Gírias SP", desc: "Malandragem & Rua", icon: Zap, activeClass: "bg-amber-500/20 border-amber-400/70 text-amber-300 shadow-lg shadow-amber-950/40" },
                  { id: "executivo", label: "Executivo", desc: "Diretoria & Alinhamento", icon: Briefcase, activeClass: "bg-blue-500/20 border-blue-400/70 text-blue-300 shadow-lg shadow-blue-950/40" },
                  { id: "tecnico_juridico", label: "Culto & Técnico", desc: "Jurídico & Analítico", icon: Scale, activeClass: "bg-purple-500/20 border-purple-400/70 text-purple-300 shadow-lg shadow-purple-950/40" },
                  { id: "persuasao", label: "Persuasão", desc: "Vendas & Impacto", icon: Target, activeClass: "bg-emerald-500/20 border-emerald-400/70 text-emerald-300 shadow-lg shadow-emerald-950/40" },
                  { id: "afetivo", label: "Afetivo", desc: "Carinho & Família", icon: Heart, activeClass: "bg-rose-500/20 border-rose-400/70 text-rose-300 shadow-lg shadow-rose-950/40" },
                ].map((style) => {
                  const Icon = style.icon;
                  const isSelected = selectedSpeechStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => handleSelectSpeechStyle(style.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? style.activeClass
                          : "bg-zinc-900/50 border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <Icon size={12} className={isSelected ? "" : "text-zinc-500"} />
                        <span className="text-[11px] truncate font-semibold">{style.label}</span>
                      </div>
                      <span className="text-[9px] text-zinc-500 truncate mt-1">{style.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Textarea de Roteiro */}
              <div className="space-y-1.5">
                <textarea
                  rows={3}
                  value={dispatchText}
                  onChange={(e) => handleDispatchTextChange(e.target.value)}
                  placeholder={
                    selectedSpeechStyle === "sp_quebrada"
                      ? "Escreva a mensagem com suas palavras ou digite livremente para adaptar com gírias de SP..."
                      : selectedSpeechStyle === "executivo"
                      ? "Digite a mensagem para receber a versão executiva com termos corporativos e alinhamento..."
                      : selectedSpeechStyle === "tecnico_juridico"
                      ? "Digite a mensagem para transformar em vocabulário culto, inequívoco e analítico..."
                      : selectedSpeechStyle === "persuasao"
                      ? "Digite os pontos principais para transformar em argumento persuasivo de alto impacto..."
                      : "Digite a mensagem de carinho ou afeto para quem você ama..."
                  }
                  className="w-full bg-zinc-900/70 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition resize-none leading-relaxed"
                />

                {/* Barra de Ações do Roteiro */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleTransformDispatchText()}
                      disabled={isTransformingText || !dispatchText.trim()}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-40"
                    >
                      {isTransformingText ? (
                        <>
                          <RefreshCw size={12} className="animate-spin text-amber-400" />
                          <span>Adaptando ao estilo...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} className="text-amber-400" />
                          <span>Adaptar Frase para este Estilo</span>
                        </>
                      )}
                    </button>

                    {dispatchText && (
                      <button
                        type="button"
                        onClick={() => handleDispatchTextChange("")}
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 px-2 py-1 transition cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] text-zinc-500">
                    {dispatchText.length} caracteres
                  </span>
                </div>
              </div>

              {/* Frases Prontas do Estilo Selecionado */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-medium text-zinc-400 block">
                  Frases Prontas Recomendadas ({
                    selectedSpeechStyle === "sp_quebrada" ? "São Paulo & Quebrada" :
                    selectedSpeechStyle === "executivo" ? "Corporativo" :
                    selectedSpeechStyle === "tecnico_juridico" ? "Culto / Analítico" :
                    selectedSpeechStyle === "persuasao" ? "Persuasão" : "Familiar"
                  }):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(lexiconData.quickPresets.find((p) => p.id === selectedSpeechStyle)?.phrases || []).map((phrase, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleDispatchTextChange(phrase)}
                      className="px-2.5 py-1 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/[0.05] text-[10px] text-zinc-300 hover:text-white transition text-left cursor-pointer"
                    >
                      "{phrase.length > 55 ? `${phrase.substring(0, 55)}...` : phrase}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Termos & Gírias para Injetar no Roteiro */}
              <div className="space-y-1.5 pt-0.5">
                <span className="text-[10px] font-medium text-zinc-400 block">
                  Clique para Injetar Termo na Fala:
                </span>
                <div className="flex flex-wrap gap-1">
                  {(
                    selectedSpeechStyle === "sp_quebrada"
                      ? ["se liga na fita", "demorô", "pode pá", "sem neurose", "papo reto", "da hora", "proceder", "cria", "na correria", "suave"]
                      : selectedSpeechStyle === "executivo"
                      ? ["prezado", "alinhar diretrizes", "impreterivelmente", "subsidiar decisão", "prioritário", "oportunidade substancial"]
                      : selectedSpeechStyle === "tecnico_juridico"
                      ? ["inequívoco", "premissa fundamental", "corroborar", "discrepância", "ponderar", "contundente"]
                      : selectedSpeechStyle === "persuasao"
                      ? ["oportunidade incontestável", "retorno substancial", "momento ideal", "transformação contundente"]
                      : ["meu bem", "um beijo no coração", "de coração", "te amo muito", "fica com Deus"]
                  ).map((term, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleInsertToDispatch(term, "append")}
                      className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] text-[10px] text-zinc-400 hover:text-white transition cursor-pointer"
                    >
                      + {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Direct Dispatch & Preview */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handleSendToWhatsApp()}
                  disabled={isSendingWhatsApp || isSynthesizingDispatch || !dispatchText.trim()}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center space-x-2.5 transition shadow-xl shadow-emerald-900/30 disabled:opacity-30 active:scale-[0.99]"
                >
                  {isSendingWhatsApp ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Gravando e disparando áudio no WhatsApp...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle size={15} />
                      <span>Disparar Áudio no WhatsApp (+55 11 99568-5756)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleSynthesizeDispatch}
                  disabled={isSynthesizingDispatch || isSendingWhatsApp || !dispatchText.trim()}
                  className="w-full py-2.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-white/[0.08] font-medium text-xs flex items-center justify-center space-x-2 transition disabled:opacity-30"
                >
                  {isSynthesizingDispatch ? (
                    <>
                      <RefreshCw size={13} className="animate-spin text-zinc-400" />
                      <span>Sintetizando prévia da voz...</span>
                    </>
                  ) : (
                    <>
                      <Mic size={13} className="text-zinc-400" />
                      <span>Ouvir Prévia da Minha Voz Antes</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status & Feedback Alert */}
              {whatsappResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs flex items-start space-x-3 transition animate-in fade-in duration-200 ${
                    whatsappResult.ok
                      ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
                      : "bg-red-950/40 border-red-500/30 text-red-200"
                  }`}
                >
                  {whatsappResult.ok ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 leading-relaxed">
                    <div className="font-medium">
                      {whatsappResult.ok ? "Transmissão PTT Concluída" : "Aviso de Disparo"}
                    </div>
                    <div className="text-[11px] opacity-90 mt-0.5">{whatsappResult.message}</div>
                    {whatsappResult.ok && (
                      <div className="text-[10px] text-emerald-400/80 mt-1 font-mono">
                        Nativo PTT • Microfone verde • Forma de onda gravada ao vivo
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Generated Audio Card (When Preview Ready) */}
            {dispatchAudioUrl && (
              <div className="apple-card rounded-3xl p-6 border-white/20 bg-zinc-900/80 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-semibold text-white">Áudio Pronto para Envio</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">Alta Fidelidade PTT</span>
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
                    <div className="text-xs font-medium text-white truncate">{dispatchAudioSourceText || dispatchText}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center space-x-2">
                      <span>Voz Humana</span>
                      <span>•</span>
                      <span className="capitalize">{dispatchMood}</span>
                    </div>
                  </div>
                </div>

                {/* Painel: Salvar no Banco de Dados */}
                <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-emerald-500/20 space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-300">
                    <Database size={13} className="text-emerald-400" />
                    <span>Salvar Áudio com Minha Voz no Banco de Dados</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Título no Banco de Dados:</label>
                      <input
                        type="text"
                        value={generatedAudioCustomTitle}
                        onChange={(e) => setGeneratedAudioCustomTitle(e.target.value)}
                        placeholder="Nome para este áudio..."
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Pasta no Banco de Dados:</label>
                      <select
                        value={generatedAudioTargetFolder}
                        onChange={(e) => setGeneratedAudioTargetFolder(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                      >
                        {libraryFolders.map((f) => (
                          <option key={f.id} value={f.id}>
                            📁 {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSaveGeneratedAudio("dispatch")}
                      disabled={isSavingGeneratedAudio}
                      className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingGeneratedAudio ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Gravando...</span>
                        </>
                      ) : (
                        <>
                          <Database size={13} />
                          <span>Salvar no Banco</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendToWhatsApp()}
                      disabled={isSendingWhatsApp}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition shadow-lg shadow-emerald-900/20 disabled:opacity-40 cursor-pointer"
                    >
                      {isSendingWhatsApp ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <MessageCircle size={14} />
                      )}
                      <span>Disparar WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadGeneratedAudio("dispatch")}
                      className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs flex items-center justify-center space-x-1.5 transition border border-white/[0.06] cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Baixar MP3</span>
                    </button>
                  </div>
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
                          onClick={() => handleSaveAssistantAudioToRecords(msg.id, msg.content)}
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
                              <span>Salvar</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            handleDispatchTextChange(msg.content);
                            setCurrentTab("dispatch");
                          }}
                          className="flex items-center space-x-1.5 text-emerald-400/90 hover:text-emerald-300 transition"
                        >
                          <MessageCircle size={13} />
                          <span>Disparar WhatsApp</span>
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

        {/* TAB 3: CALIBRAÇÃO & VOZ REAL (LIVE RECORDING + AI EMOTION DETECTOR) */}
        {currentTab === "voice" && (
          <div className="max-w-3xl mx-auto w-full space-y-7 py-2">
            {/* Header */}
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Laboratório de Voz Real
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Grave ou envie áudios da sua voz autêntica. A inteligência neural analisa a entonação (bravo, calmo, engraçado, etc.) e refina o modelo de clonagem contínuo.
              </p>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-white/[0.08] text-[10px] text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Análise de Emoção Ativa</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400 font-mono">{voiceAnchors.length} Amostras Salvas</span>
              </div>
            </div>

            {/* ESPELHAMENTO & EXTRAÇÃO DO YOUTUBE */}
            <div className="apple-glass rounded-3xl p-6 sm:p-7 space-y-5 border border-red-500/20 bg-gradient-to-b from-red-950/10 via-zinc-900/60 to-zinc-950/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                    <Youtube size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                      Espelhamento de Cadência via YouTube
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 font-normal">
                        Novo
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Cole um link para capturar o estilo de fala, ritmo e entonação de qualquer vídeo.
                    </p>
                  </div>
                </div>
              </div>

              {/* YouTube Input Form */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => {
                      setYoutubeUrl(e.target.value);
                      if (youtubeError) setYoutubeError(null);
                    }}
                    placeholder="Cole o link do YouTube (ex: https://youtube.com/watch?v=... ou youtu.be/...)"
                    className="w-full bg-zinc-900/90 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 transition"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <LinkIcon size={14} />
                  </div>
                </div>

                {/* Timing controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="text-zinc-400 flex items-center space-x-1">
                      <Clock size={12} className="text-zinc-500" />
                      <span>Início:</span>
                    </span>
                    <input
                      type="text"
                      value={youtubeStart}
                      onChange={(e) => setYoutubeStart(e.target.value)}
                      placeholder="00:00"
                      className="w-16 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-center font-mono text-xs text-white focus:outline-none focus:border-red-500/50"
                    />

                    <span className="text-zinc-400 flex items-center space-x-1 pl-2">
                      <Scissors size={12} className="text-zinc-500" />
                      <span>Fim:</span>
                    </span>
                    <input
                      type="text"
                      value={youtubeEnd}
                      onChange={(e) => setYoutubeEnd(e.target.value)}
                      placeholder="01:00:00"
                      className="w-20 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-center font-mono text-xs text-white focus:outline-none focus:border-red-500/50"
                    />
                    <span className="text-[10px] text-zinc-400 hidden sm:inline">(Duração livre: de 30s a 1h, 2h ou vazio para vídeo completo)</span>
                  </div>

                  <button
                    onClick={handleExtractYoutube}
                    disabled={isExtractingYoutube || !youtubeUrl.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium text-xs flex items-center space-x-2 shadow-lg shadow-red-950/40 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:opacity-40"
                  >
                    {isExtractingYoutube ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Extraindo Áudio...</span>
                      </>
                    ) : (
                      <>
                        <Youtube size={13} />
                        <span>Extrair Áudio & Modelo</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Error Banner */}
                {youtubeError && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2 animate-in fade-in">
                    <AlertCircle size={14} className="shrink-0 text-red-400" />
                    <span>{youtubeError}</span>
                  </div>
                )}

                {/* Success Banner */}
                {mirrorSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center space-x-2 animate-in fade-in">
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                    <span>{mirrorSuccessMsg}</span>
                  </div>
                )}
              </div>

              {/* YouTube Extracted Result Card */}
              {youtubeResult && (
                <div className="pt-3 border-t border-white/[0.08] space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10">
                    <div className="flex items-center space-x-3">
                      {youtubeResult.thumbnail ? (
                        <img
                          src={youtubeResult.thumbnail}
                          alt="Thumbnail"
                          className="w-14 h-10 object-cover rounded-lg border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-10 rounded-lg bg-red-950/40 border border-red-500/20 flex items-center justify-center shrink-0">
                          <Youtube size={18} className="text-red-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-white truncate max-w-sm">
                          {youtubeResult.title}
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-zinc-400 mt-0.5">
                          {youtubeResult.duration && (
                            <>
                              <span>Duração: {youtubeResult.duration}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>Tamanho: {youtubeResult.sizeKb} KB</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-medium">Amostra Acústica Pronta</span>
                        </div>
                      </div>
                    </div>

                    {/* Original Audio Play Button */}
                    <div className="flex items-center space-x-2 self-start sm:self-auto">
                      <button
                        onClick={handleToggleYoutubeAudio}
                        className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 hover:text-white flex items-center space-x-1.5 transition cursor-pointer"
                      >
                        {isPlayingYoutubeAudio ? (
                          <>
                            <Pause size={12} fill="currentColor" />
                            <span>Pausar Áudio</span>
                          </>
                        ) : (
                          <>
                            <Play size={12} fill="currentColor" />
                            <span>Ouvir Áudio</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedModelAudio({
                            id: youtubeResult.id || `yt_${Date.now()}`,
                            title: youtubeResult.title,
                            sampleBase64: youtubeResult.sampleBase64 || youtubeResult.audioBase64 || undefined,
                            streamUrl: youtubeResult.streamUrl || undefined,
                            transcript: mirrorText || youtubeResult.transcript,
                          });
                          setMirrorSuccessMsg(`🎯 Modelo "${youtubeResult.title}" ativado como referência de voz!`);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer ${
                          selectedModelAudio?.title === youtubeResult.title
                            ? "bg-amber-500 text-black font-semibold shadow-lg shadow-amber-500/30"
                            : "bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                        }`}
                      >
                        <Sparkles size={12} />
                        <span>{selectedModelAudio?.title === youtubeResult.title ? "Modelo Ativo" : "Usar como Modelo"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Salvar no Banco de Dados em Pastas */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-2 text-xs text-zinc-300">
                      <Folder size={14} className="text-amber-400" />
                      <span>Salvar no Banco na Pasta:</span>
                      <select
                        value={selectedFolderForSave}
                        onChange={(e) => setSelectedFolderForSave(e.target.value)}
                        className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
                      >
                        {libraryFolders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => handleSaveToLibrary()}
                      disabled={isSavingToLibrary}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-40"
                    >
                      {isSavingToLibrary ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus size={12} />
                          <span>Salvar no Banco de Dados</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Mirroring & Synthesis Box */}
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] space-y-3">
                    {/* Painel do Modelo Ativo com Seletor de Modo */}
                    {selectedModelAudio && (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-300 flex items-center space-x-1.5">
                            <Sparkles size={13} className="text-amber-400" />
                            <span>Modelo de Referência Ativo: <strong>{selectedModelAudio.title}</strong></span>
                            {selectedModelAudio.folderName && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">
                                {selectedModelAudio.folderName}
                              </span>
                            )}
                          </span>
                          <button
                            onClick={() => setSelectedModelAudio(null)}
                            className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                          >
                            Voltar à Voz Padrão
                          </button>
                        </div>

                        {/* Modos de Comportamento */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setVoiceModelMode("exact-video-voice")}
                            className={`p-2.5 rounded-xl border text-left transition flex items-start space-x-2.5 cursor-pointer ${
                              voiceModelMode === "exact-video-voice"
                                ? "bg-red-500/20 border-red-400/60 text-white shadow-lg shadow-red-950/40"
                                : "bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            <div className={`mt-0.5 w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${voiceModelMode === "exact-video-voice" ? "border-red-400 bg-red-400" : "border-zinc-500"}`}>
                              {voiceModelMode === "exact-video-voice" && <div className="w-1 h-1 rounded-full bg-black"></div>}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                <span>Voz e Timbre Idênticos ao Vídeo</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/30 text-red-300 font-normal">Recomendado</span>
                              </div>
                              <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                                Clonagem acústica direta do locutor do vídeo: timbre, sotaque, tom e acústica 100% idênticos.
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setVoiceModelMode("my-voice-cadence")}
                            className={`p-2.5 rounded-xl border text-left transition flex items-start space-x-2.5 cursor-pointer ${
                              voiceModelMode === "my-voice-cadence"
                                ? "bg-amber-500/20 border-amber-400/60 text-white shadow-lg shadow-amber-950/40"
                                : "bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            <div className={`mt-0.5 w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${voiceModelMode === "my-voice-cadence" ? "border-amber-400 bg-amber-400" : "border-zinc-500"}`}>
                              {voiceModelMode === "my-voice-cadence" && <div className="w-1 h-1 rounded-full bg-black"></div>}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-white">Minha Voz + Jeito & Sotaque do Vídeo</div>
                              <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                                Preserva seu timbre autoral de voz, mas adota a cadência, tom, velocidade e malícia do modelo.
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] font-semibold text-zinc-300 flex items-center space-x-1.5">
                        <Sparkles size={12} className="text-amber-400" />
                        <span>Roteiro de Fala para Sintetizar</span>
                      </span>

                      {/* Botão para recarregar ou extrair a fala original do vídeo */}
                      <button
                        onClick={handleFetchTranscript}
                        disabled={isFetchingTranscript}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 hover:text-white flex items-center space-x-1 transition cursor-pointer disabled:opacity-40"
                      >
                        {isFetchingTranscript ? (
                          <>
                            <RefreshCw size={10} className="animate-spin text-zinc-400" />
                            <span>Extraindo fala...</span>
                          </>
                        ) : (
                          <>
                            <Copy size={10} className="text-red-400" />
                            <span>Capturar Fala do Trecho</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Aviso sutil quando o vídeo não possui legendas no YouTube */}
                    {youtubeResult.subtitlesDisabled && !youtubeResult.transcript && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 flex items-center space-x-2">
                        <AlertCircle size={13} className="shrink-0 text-amber-400" />
                        <span>Legendas desativadas pelo canal no YouTube. Digite a frase ou o roteiro abaixo para reproduzir com a sua voz:</span>
                      </div>
                    )}

                    {/* Exibição da fala detectada no vídeo */}
                    {youtubeResult.transcript && (
                      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400">
                          <span className="flex items-center space-x-1 text-red-400 font-medium">
                            <Radio size={10} />
                            <span>Fala Detectada no Vídeo ({youtubeResult.transcriptLang?.toUpperCase() || 'PT'}):</span>
                          </span>
                          <button
                            onClick={() => setMirrorText(youtubeResult.transcript || '')}
                            className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                          >
                            Recarregar fala original
                          </button>
                        </div>
                        <p className="text-zinc-200 italic line-clamp-2">
                          "{youtubeResult.transcript}"
                        </p>
                      </div>
                    )}

                    <textarea
                      value={mirrorText}
                      onChange={(e) => setMirrorText(e.target.value)}
                      placeholder="Digite o texto ou edite a fala do vídeo para sua voz reproduzir..."
                      rows={2}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 resize-none transition"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center space-x-2">
                        {/* AÇÃO PRINCIPAL EM DESTAQUE: SINTETIZAR COM A CADÊNCIA / TIMBRE */}
                        <button
                          onClick={() => handleSynthesizeMirror()}
                          disabled={isSynthesizingMirror}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-semibold text-xs flex items-center space-x-2 shadow-xl shadow-red-950/50 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:opacity-40"
                        >
                          {isSynthesizingMirror ? (
                            <>
                              <RefreshCw size={13} className="animate-spin" />
                              <span>Sintetizando Fala...</span>
                            </>
                          ) : (
                            <>
                              <Mic size={13} />
                              <span>
                                {voiceModelMode === "exact-video-voice"
                                  ? "Gerar com Timbre Idêntico ao Vídeo"
                                  : "Falar com Minha Voz & Jeito do Modelo"}
                              </span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleSendYoutubeToDispatch}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-xs text-emerald-300 transition cursor-pointer flex items-center space-x-1"
                        >
                          <ArrowRight size={12} />
                          <span>Enviar p/ Disparo</span>
                        </button>
                      </div>
                    </div>

                    {/* ======================================================== */}
                    {/* CARD DEDICADO: ÁUDIO GERADO & SALVAR NO BANCO DE DADOS   */}
                    {/* ======================================================== */}
                    {mirrorAudioUrl && (
                      <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-950/90 to-zinc-900/70 border border-emerald-500/30 space-y-3.5 shadow-xl shadow-black/40">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                              <Database size={16} />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-semibold text-white">
                                  Áudio Gerado com Sua Voz
                                </span>
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                                  Voz Pronta
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400">
                                Salve no banco de dados na pasta que preferir ou faça download em MP3.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={handleToggleMirrorAudio}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs flex items-center space-x-1.5 transition cursor-pointer font-medium"
                            >
                              {isPlayingMirrorAudio ? (
                                <>
                                  <Pause size={12} fill="currentColor" />
                                  <span>Pausar</span>
                                </>
                              ) : (
                                <>
                                  <Play size={12} fill="currentColor" />
                                  <span>Ouvir Prévia</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadGeneratedAudio("mirror")}
                              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-200 text-xs flex items-center space-x-1.5 transition cursor-pointer"
                            >
                              <Download size={12} />
                              <span>Baixar MP3</span>
                            </button>
                          </div>
                        </div>

                        {/* Campos de Título e Pasta de Destino no Banco de Dados */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-zinc-400 font-medium block mb-1">
                              Título no Banco de Dados:
                            </label>
                            <input
                              type="text"
                              value={generatedAudioCustomTitle}
                              onChange={(e) => setGeneratedAudioCustomTitle(e.target.value)}
                              placeholder="Ex: Minha voz estilo modelo YouTube..."
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400 transition"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-zinc-400 font-medium block mb-1">
                              Pasta no Banco de Dados:
                            </label>
                            <select
                              value={generatedAudioTargetFolder}
                              onChange={(e) => setGeneratedAudioTargetFolder(e.target.value)}
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                            >
                              {libraryFolders.map((f) => (
                                <option key={f.id} value={f.id}>
                                  📁 {f.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Botão Principal: Salvar no Banco de Dados */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSaveGeneratedAudio("mirror")}
                            disabled={isSavingGeneratedAudio}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/50 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
                          >
                            {isSavingGeneratedAudio ? (
                              <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>Gravando no Banco de Dados...</span>
                              </>
                            ) : (
                              <>
                                <Database size={13} />
                                <span>Salvar Áudio com Minha Voz no Banco de Dados</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleSendYoutubeToDispatch}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-zinc-300 hover:text-white transition cursor-pointer flex items-center justify-center space-x-1.5"
                          >
                            <ArrowRight size={12} />
                            <span>Enviar p/ Disparo WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* NOVO MÓDULO: BANCO DE DADOS DE ÁUDIOS & PASTAS DE MODELOS */}
            {/* ======================================================== */}
            <div className="apple-glass rounded-3xl p-6 sm:p-7 space-y-5 border border-white/10 bg-zinc-950/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Folder size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                      Banco de Dados de Modelos & Pastas
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-normal">
                        {libraryAudios.length} áudios salvos
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Organize os áudios extraídos em pastas e ative qualquer um como modelo de estilo e cadência.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 hover:text-white flex items-center space-x-1.5 transition self-start sm:self-auto cursor-pointer"
                >
                  <FolderPlus size={13} className="text-amber-400" />
                  <span>Nova Pasta</span>
                </button>
              </div>

              {/* Modal de Criação de Pasta */}
              {showNewFolderModal && (
                <div className="p-3.5 rounded-2xl bg-zinc-900 border border-amber-500/30 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs text-white font-medium">
                    <span>Criar Nova Pasta no Banco de Dados</span>
                    <button
                      onClick={() => setShowNewFolderModal(false)}
                      className="text-zinc-500 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newFolderNameInput}
                      onChange={(e) => setNewFolderNameInput(e.target.value)}
                      placeholder="Nome da pasta (ex: Podcasts, Rádio SP, Comédia...)"
                      className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={handleCreateFolder}
                      disabled={!newFolderNameInput.trim()}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold cursor-pointer disabled:opacity-40"
                    >
                      Criar Pasta
                    </button>
                  </div>
                </div>
              )}

              {/* Abas das Pastas */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setActiveFolderFilter("todos")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    activeFolderFilter === "todos"
                      ? "bg-white text-black shadow-md"
                      : "bg-zinc-900 text-zinc-400 hover:text-white"
                  }`}
                >
                  Todas ({libraryAudios.length})
                </button>
                {libraryFolders.map((f) => {
                  const count = libraryAudios.filter((a) => a.folderId === f.id).length;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setActiveFolderFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                        activeFolderFilter === f.id
                          ? "bg-amber-500 text-black shadow-md"
                          : "bg-zinc-900 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span>{f.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeFolderFilter === f.id ? "bg-black/20 text-black" : "bg-white/10 text-zinc-400"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Lista de Áudios Salvos */}
              <div className="space-y-2.5">
                {isLibraryLoading ? (
                  <div className="text-center py-6 text-xs text-zinc-500 flex items-center justify-center space-x-2">
                    <RefreshCw size={13} className="animate-spin text-zinc-400" />
                    <span>Carregando modelos do acervo...</span>
                  </div>
                ) : libraryAudios.length === 0 ? (
                  <div className="text-center py-8 rounded-2xl border border-dashed border-white/10 text-xs text-zinc-500 space-y-1">
                    <p>Nenhum áudio salvo no banco de dados ainda.</p>
                    <p className="text-[11px] text-zinc-600">
                      Cole um link do YouTube acima, extraia e clique em "Salvar no Banco de Dados".
                    </p>
                  </div>
                ) : (
                  libraryAudios
                    .filter((a) => activeFolderFilter === "todos" || a.folderId === activeFolderFilter)
                    .map((item) => {
                      const isActive = selectedModelAudio?.id === item.id;
                      const isPlaying = playingLibraryAudioId === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isActive
                              ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-950/20"
                              : "bg-zinc-900/60 border-white/[0.06] hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                              style={{
                                backgroundColor: item.type === "generated" ? "rgba(16, 185, 129, 0.15)" : "rgba(39, 39, 42, 1)",
                                borderColor: item.type === "generated" ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.1)",
                                color: item.type === "generated" ? "#34d399" : "#d4d4d8"
                              }}
                            >
                              {item.type === "generated" ? <Mic size={16} /> : <FileAudio size={16} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-white truncate flex items-center gap-1.5">
                                <span>{item.title}</span>
                                {item.type === "generated" && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                                    Voz Gerada
                                  </span>
                                )}
                                {isActive && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400 text-black font-semibold">
                                    ATIVO
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 text-[10px] text-zinc-400 mt-0.5">
                                <span className={item.type === "generated" ? "text-emerald-400 font-medium" : "text-amber-300/80"}>
                                  {item.folderName}
                                </span>
                                <span>•</span>
                                <span>{item.duration || `${item.timeRange || "Áudio"}`}</span>
                                <span>•</span>
                                <span>{item.sizeKb} KB</span>
                              </div>
                              {item.transcript && (
                                <div className="text-[10px] text-zinc-400/90 truncate max-w-md mt-0.5 italic">
                                  "{item.transcript}"
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 self-end sm:self-auto">
                            {/* Ouvir Áudio do Banco */}
                            <button
                              onClick={() => handleToggleLibraryAudioPlay(item)}
                              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 hover:text-white flex items-center space-x-1 transition cursor-pointer"
                            >
                              {isPlaying ? (
                                <>
                                  <Pause size={11} fill="currentColor" />
                                  <span>Pausar</span>
                                </>
                              ) : (
                                <>
                                  <Play size={11} fill="currentColor" />
                                  <span>Ouvir</span>
                                </>
                              )}
                            </button>

                            {/* Download MP3 */}
                            {item.streamUrl && (
                              <a
                                href={item.streamUrl}
                                download={`${item.title || "audio"}.mp3`}
                                className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
                                title="Baixar MP3"
                              >
                                <Download size={13} />
                              </a>
                            )}

                            {/* Ativar como Modelo */}
                            <button
                              onClick={() => handleSelectModelFromLibrary(item)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer ${
                                isActive
                                  ? "bg-amber-400 text-black shadow-md shadow-amber-400/30"
                                  : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
                              }`}
                            >
                              <Sparkles size={11} />
                              <span>{isActive ? "Modelo Ativo" : "Usar como Modelo"}</span>
                            </button>

                            {/* Deletar */}
                            <button
                              onClick={() => handleDeleteLibraryAudio(item.id)}
                              className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                              title="Remover do banco"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Recording & Input Station */}
            <div className="apple-glass rounded-3xl p-6 sm:p-7 space-y-5">
              {!isRecording && !recordedAudioUrl && (
                <div className="space-y-4">
                  {/* Primary Record Button */}
                  <button
                    onClick={startRecording}
                    className="w-full py-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-400 text-white font-medium text-xs flex items-center justify-center space-x-3 shadow-xl shadow-red-950/40 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white animate-pulse"></div>
                    <span className="text-sm font-semibold tracking-tight">Gravar Amostra com Microfone</span>
                    <span className="text-white/70 text-xs font-normal hidden sm:inline">(Fale naturalmente por 5 a 15s)</span>
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-zinc-500">Ou envie um áudio já gravado do celular:</span>
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
                      className="px-3.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-white/10 text-[11px] text-zinc-300 hover:text-white cursor-pointer flex items-center space-x-1.5 transition"
                    >
                      <Upload size={12} />
                      <span>Selecionar Arquivo</span>
                    </label>
                  </div>
                </div>
              )}

              {/* State: Recording Active */}
              {isRecording && (
                <div className="py-6 px-4 rounded-2xl bg-red-950/30 border border-red-500/30 text-center space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                    <span className="text-xs font-semibold text-red-300 uppercase tracking-wider">
                      Gravando sua fala real...
                    </span>
                  </div>

                  <div className="font-mono text-3xl font-bold text-white tracking-wider">
                    00:{recordingSeconds.toString().padStart(2, "0")}
                  </div>

                  <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                    Fale em qualquer tom: bravo, calmo, fazendo piada ou conversando. A IA vai detectar o tom assim que você parar.
                  </p>

                  <div className="flex items-center justify-center space-x-3 pt-2">
                    <button
                      onClick={cancelRecording}
                      className="px-4 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={stopRecording}
                      className="px-6 py-2.5 rounded-xl bg-white text-black font-semibold text-xs flex items-center space-x-2 shadow-lg hover:scale-105 active:scale-95 transition"
                    >
                      <Square size={13} fill="currentColor" />
                      <span>Parar e Identificar com IA</span>
                    </button>
                  </div>
                </div>
              )}

              {/* State: Recorded Audio Ready & AI Analysis */}
              {recordedAudioUrl && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-xs font-semibold text-white">Áudio Gravado com Sucesso</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">{recordingSeconds}s capturados</span>
                  </div>

                  {/* Audio Player */}
                  <audio controls src={recordedAudioUrl} className="w-full h-10 rounded-xl" />

                  {/* AI Analysis Box */}
                  {isAnalyzingVoice ? (
                    <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center justify-center space-x-3 text-xs text-zinc-300">
                      <RefreshCw size={15} className="animate-spin text-emerald-400" />
                      <span>IA Analisando espectro de voz e tom emocional...</span>
                    </div>
                  ) : voiceAnalysis ? (
                    <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-white/15 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-[10px] uppercase font-mono text-zinc-500">Diagnóstico da IA</div>
                          <div className="text-sm font-semibold text-white flex items-center space-x-2 mt-0.5">
                            <span className="text-lg">{voiceAnalysis.moodIcon}</span>
                            <span>{voiceAnalysis.moodLabel}</span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {voiceAnalysis.confidence}% precisão
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2 border-y border-white/[0.06] text-[11px]">
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Energia Vocal</span>
                          <span className="text-zinc-200 font-medium">{voiceAnalysis.energy}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Cadência de Fala</span>
                          <span className="text-zinc-200 font-medium truncate">{voiceAnalysis.cadence}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Sotaque / Região</span>
                          <span className="text-zinc-200 font-medium">{voiceAnalysis.accentLabel}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        {voiceAnalysis.analysis}
                      </p>

                      {/* Name / Mood Confirmation Input */}
                      <div className="pt-1">
                        <label className="text-[10px] text-zinc-400 block mb-1">Nome da Amostra</label>
                        <input
                          type="text"
                          value={uploadName}
                          onChange={(e) => setUploadName(e.target.value)}
                          placeholder="Nome da amostra..."
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                        />
                      </div>

                      {/* Action Save or Discard */}
                      <div className="flex items-center justify-end space-x-2 pt-2">
                        <button
                          onClick={cancelRecording}
                          className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white transition"
                        >
                          Descartar
                        </button>
                        <button
                          onClick={handleSaveRecordedAnchor}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-lg transition cursor-pointer"
                        >
                          <Check size={14} />
                          <span>Salvar como Âncora no Modelo</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Gallery of Saved Voice Anchors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Galeria de Âncoras Calibradas
                </h3>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {voiceAnchors.length} no acervo
                </span>
              </div>

              {voiceAnchors.length === 0 ? (
                <div className="apple-glass rounded-2xl p-8 text-center text-xs text-zinc-500">
                  Nenhuma âncora gravada ainda. Grave seu primeiro áudio acima para treinar a IA com suas expressões reais!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {voiceAnchors.map((anchor) => (
                    <div
                      key={anchor.id}
                      className="apple-card rounded-2xl p-4 flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-2">
                          <div className="text-xs font-medium text-white truncate">{anchor.name}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 capitalize">
                              {anchor.mood === "firme" && "😠 Firme / Bravo"}
                              {anchor.mood === "calmo" && "😌 Calmo / Afeto"}
                              {anchor.mood === "engracado" && "😂 Engraçado"}
                              {anchor.mood === "empolgado" && "⚡ Empolgado"}
                              {anchor.mood === "descontraido" && "😎 Descontraído"}
                            </span>
                            <span className="text-[10px] text-zinc-500 uppercase font-mono">
                              {anchor.accent}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleToggleAnchorAudio(anchor)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition"
                            title="Ouvir Amostra"
                          >
                            {playingAnchorId === anchor.id ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteAnchor(anchor.id)}
                            className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 transition"
                            title="Remover"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {anchor.aiAnalysis && (
                        <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed italic">
                          "{anchor.aiAnalysis}"
                        </p>
                      )}

                      <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                        <span>{new Date(anchor.createdAt).toLocaleDateString()}</span>
                        <span className="text-emerald-400">Ativa para síntese</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ACERVO (ORGANIZED VAULT & QUICK VOCAL DISPATCH) */}
        {currentTab === "records" && (
          <div className="max-w-3xl mx-auto w-full space-y-6 py-2">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "todos", label: "Todos" },
                  { id: "voz", label: "🎙️ Voz & Áudios" },
                  { id: "ideia", label: "💡 Roteiros" },
                  { id: "assistente", label: "📋 Do Assistente" },
                  { id: "geral", label: "📁 Geral" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs transition ${
                      selectedCategory === cat.id
                        ? "bg-white text-black font-medium shadow-sm"
                        : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-white/[0.06]"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search & New Note */}
              <div className="flex items-center space-x-2">
                <div className="relative flex-1 sm:w-44">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar acervo..."
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                  />
                </div>

                <button
                  onClick={() => setIsNewNoteOpen(true)}
                  className="px-3.5 py-1.5 bg-white hover:bg-zinc-200 text-black font-medium rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Novo</span>
                </button>
              </div>
            </div>

            {/* Records List */}
            {filteredRecords.length === 0 ? (
              <div className="apple-glass rounded-3xl p-12 text-center space-y-3">
                <div className="text-zinc-400 text-sm font-medium">Acervo sem registros no filtro atual</div>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  Salve respostas do Assistente, guarde roteiros de áudios frequentes ou crie notas rápidas para disparar no WhatsApp com sua voz.
                </p>
                <button
                  onClick={() => setIsNewNoteOpen(true)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-white transition inline-flex items-center space-x-1.5 mt-2"
                >
                  <Plus size={13} />
                  <span>Criar Primeiro Registro</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredRecords.map((item) => (
                  <div
                    key={item.id}
                    className="apple-card rounded-2xl p-5 flex flex-col justify-between space-y-3.5 hover:border-white/20 transition group"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                            item.category === "voz"
                              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                              : "bg-zinc-800 text-zinc-400 border-white/[0.06]"
                          }`}>
                            {item.category === "voz" ? "🎙️ Áudio Salvo" : item.category}
                          </span>

                          {item.mood && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 capitalize">
                              {item.mood}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleCopyNote(item.id, item.content)}
                            className="text-zinc-500 hover:text-white p-1 transition"
                            title="Copiar conteúdo"
                          >
                            {copiedNoteId === item.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(item.id)}
                            className="text-zinc-500 hover:text-red-400 p-1 transition"
                            title="Excluir do acervo"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-xs font-semibold text-white mb-1.5 leading-snug">
                        {item.title}
                      </h4>

                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap line-clamp-3">
                        {item.content}
                      </p>

                      {/* Integrated Audio Player (for Saved Voice Notes) */}
                      {item.audioBase64 && (
                        <div className="flex items-center space-x-3 bg-black/50 p-2.5 rounded-xl border border-white/[0.06] mt-3">
                          <button
                            onClick={() => handleToggleRecordAudio(item)}
                            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition shadow-md cursor-pointer"
                            title="Ouvir Áudio Salvo"
                          >
                            {playingRecordId === item.id ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] text-zinc-200 font-medium truncate">
                              {playingRecordId === item.id ? "Reproduzindo áudio..." : "Áudio com sua Voz Real"}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-mono">
                              {item.duration || "0:08"} • PTT WhatsApp Pronto
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadRecordAudio(item)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition"
                            title="Baixar arquivo MP3"
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action Bar inside card: Quick Dispatch */}
                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>

                      {item.audioBase64 ? (
                        <button
                          onClick={() => handleDispatchSavedAudio(item)}
                          className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
                          title="Enviar este áudio salvo para o WhatsApp"
                        >
                          <MessageCircle size={12} />
                          <span>Disparar no WhatsApp</span>
                          <ArrowRight size={11} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUseInDispatch(item.content)}
                          className="py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium flex items-center space-x-1.5 transition border border-white/[0.06] cursor-pointer"
                          title="Enviar texto para a aba Disparo Vocal"
                        >
                          <MessageCircle size={12} />
                          <span>Usar no Disparo</span>
                          <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: LÉXICO & ESTILOS VOCAIS (DICIONÁRIO SP + BIBLIOTECA TÉCNICA/PROFISSIONAL) */}
        {currentTab === "lexicon" && (
          <div className="max-w-4xl mx-auto w-full space-y-6 py-2 animate-in fade-in duration-200">
            {/* Header & Badges */}
            <div className="apple-glass rounded-3xl p-6 sm:p-7 space-y-4 border border-white/10 bg-zinc-950/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      Acervo Linguístico & Registros de Fala
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                        530 Termos
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Gírias autênticas de São Paulo e vocabulário técnico/executivo para orientar o tom da sua voz.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentTab("dispatch")}
                  className="px-3.5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto shrink-0"
                >
                  <Mic size={13} />
                  <span>Ir para Disparo Vocal</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              {/* Estatísticas do Acervo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
                <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5">
                  <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Gírias Paulistanas</span>
                  <span className="text-base font-bold text-amber-400">395 termos</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">17 partes temáticas</span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5">
                  <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Profissional & Técnico</span>
                  <span className="text-base font-bold text-blue-400">135 termos</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">16 seções formais</span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5">
                  <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Transformações</span>
                  <span className="text-base font-bold text-emerald-400">6 situações</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">Direto vs Executivo</span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5">
                  <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Diálogos de Rua</span>
                  <span className="text-base font-bold text-purple-400">7 diálogos</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">Padrão SP 100% real</span>
                </div>
              </div>
            </div>

            {/* Navegação de Domínios do Acervo */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Abas dos Domínios */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => { setLexiconDomain("girias_sp"); setLexiconCategory("todos"); }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                    lexiconDomain === "girias_sp"
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                      : "bg-zinc-900 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Zap size={13} />
                  <span>Gírias de SP & Quebrada (395)</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setLexiconDomain("tecnico_profissional"); setLexiconCategory("todos"); }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                    lexiconDomain === "tecnico_profissional"
                      ? "bg-blue-500 text-black shadow-md shadow-blue-500/20"
                      : "bg-zinc-900 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Briefcase size={13} />
                  <span>Profissional & Técnico (135)</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setLexiconDomain("transformacoes"); setLexiconCategory("todos"); }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                    lexiconDomain === "transformacoes"
                      ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                      : "bg-zinc-900 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Sparkles size={13} />
                  <span>Modelos de Transformação</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setLexiconDomain("dialogos"); setLexiconCategory("todos"); }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                    lexiconDomain === "dialogos"
                      ? "bg-purple-500 text-black shadow-md shadow-purple-500/20"
                      : "bg-zinc-900 text-zinc-400 hover:text-white"
                  }`}
                >
                  <MessageCircle size={13} />
                  <span>Diálogos Paulistanos</span>
                </button>
              </div>

              {/* Barra de Pesquisa */}
              {(lexiconDomain === "girias_sp" || lexiconDomain === "tecnico_profissional") && (
                <div className="relative min-w-[220px]">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={lexiconSearch}
                    onChange={(e) => setLexiconSearch(e.target.value)}
                    placeholder="Buscar gíria, significado ou exemplo..."
                    className="w-full bg-zinc-900/90 border border-white/10 rounded-xl pl-8 pr-7 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition"
                  />
                  {lexiconSearch && (
                    <button
                      type="button"
                      onClick={() => setLexiconSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Pílulas de Categorias (Filtragem por Partes) */}
            {(lexiconDomain === "girias_sp" || lexiconDomain === "tecnico_profissional") && (
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setLexiconCategory("todos")}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                    lexiconCategory === "todos"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "bg-zinc-900/70 text-zinc-400 hover:text-white border border-white/[0.04]"
                  }`}
                >
                  Todas as Categorias
                </button>

                {(lexiconData.domains.find((d) => d.id === lexiconDomain)?.categories || []).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setLexiconCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                      lexiconCategory === cat.id
                        ? "bg-amber-400 text-black font-semibold shadow-sm"
                        : "bg-zinc-900/70 text-zinc-400 hover:text-white border border-white/[0.04]"
                    }`}
                  >
                    <span>{cat.title}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                      lexiconCategory === cat.id ? "bg-black/20 text-black" : "bg-white/10 text-zinc-400"
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* VISUALIZAÇÃO: GÍRIAS OU VOCABULÁRIO TÉCNICO */}
            {(lexiconDomain === "girias_sp" || lexiconDomain === "tecnico_profissional") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(() => {
                  const domainObj = lexiconData.domains.find((d) => d.id === lexiconDomain);
                  if (!domainObj) return null;

                  let items = domainObj.categories.flatMap((c) =>
                    lexiconCategory === "todos" || c.id === lexiconCategory ? c.items : []
                  );

                  if (lexiconSearch.trim()) {
                    const q = lexiconSearch.toLowerCase().trim();
                    items = items.filter(
                      (item) =>
                        item.term.toLowerCase().includes(q) ||
                        item.meaning.toLowerCase().includes(q) ||
                        item.example.toLowerCase().includes(q)
                    );
                  }

                  if (items.length === 0) {
                    return (
                      <div className="col-span-full text-center py-12 rounded-3xl border border-dashed border-white/10 p-6 space-y-2">
                        <p className="text-xs text-zinc-400">Nenhum termo encontrado com o filtro atual.</p>
                        <button
                          type="button"
                          onClick={() => { setLexiconSearch(""); setLexiconCategory("todos"); }}
                          className="text-xs text-amber-400 hover:underline cursor-pointer"
                        >
                          Limpar filtros de busca
                        </button>
                      </div>
                    );
                  }

                  return items.map((item) => {
                    const isCopied = copiedTermId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="apple-glass rounded-2xl p-4 space-y-2.5 border border-white/[0.06] hover:border-white/20 transition flex flex-col justify-between group"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-bold text-white tracking-tight group-hover:text-amber-300 transition">
                              {item.term}
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-zinc-400 shrink-0">
                              {item.category}
                            </span>
                          </div>

                          {item.pronunciation && (
                            <div className="inline-block text-[10px] text-amber-300/80 font-mono bg-amber-500/10 px-2 py-0.5 rounded-md">
                              {item.pronunciation}
                            </div>
                          )}

                          <p className="text-xs text-zinc-300 leading-snug">
                            {item.meaning}
                          </p>

                          {item.example && (
                            <div className="p-2 rounded-xl bg-black/40 border border-white/[0.04] text-[11px] text-zinc-400 italic leading-snug">
                              "{item.example}"
                            </div>
                          )}
                        </div>

                        {/* Botões de Ação do Termo */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyTerm(item.id, item.example ? item.example.replace(/^Exemplo de uso: '/, "").replace(/' na fala cotidiana.*$/, "") : item.term)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                            title="Copiar para a área de transferência"
                          >
                            {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>

                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleInsertToDispatch(item.term, "append")}
                              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/[0.06] text-[10px] text-zinc-300 hover:text-white transition cursor-pointer"
                              title="Adicionar termo ao final da mensagem"
                            >
                              + Anexar
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const phraseToSpeak = item.example && !item.example.startsWith("Exemplo de uso:")
                                  ? item.example
                                  : `Se liga na fita: ${item.term}, tá ligado?`;
                                handleInsertToDispatch(phraseToSpeak, "replace");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-semibold text-amber-300 hover:text-amber-200 transition cursor-pointer flex items-center space-x-1"
                              title="Usar frase no disparo com a sua voz"
                            >
                              <Mic size={10} />
                              <span>Falar este</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* VISUALIZAÇÃO: MODELOS DE TRANSFORMAÇÃO */}
            {lexiconDomain === "transformacoes" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
                  <p className="font-semibold text-emerald-300 mb-0.5">Modelos de Transformação de Registro</p>
                  <p className="text-[11px] text-zinc-400">
                    Veja como a mesma intenção comunicativa muda completamente dependendo do registro (Direto vs Profissional vs Analítico). Clique em qualquer variante para falar com a sua voz.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {lexiconData.transformations.map((trans, i) => (
                    <div key={i} className="apple-glass rounded-3xl p-5 space-y-3.5 border border-white/10">
                      <h3 className="text-xs font-bold text-white flex items-center gap-2">
                        <Sparkles size={14} className="text-emerald-400" />
                        <span>{trans.situation}</span>
                      </h3>

                      <div className="space-y-2">
                        {Object.entries(trans.variants).map(([reg, phrase]) => (
                          <div
                            key={reg}
                            className="p-3 rounded-2xl bg-zinc-900/70 border border-white/5 space-y-1.5 hover:border-white/20 transition group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                {reg}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleInsertToDispatch(phrase as string, "replace")}
                                className="text-[10px] text-zinc-400 group-hover:text-emerald-300 flex items-center space-x-1 transition cursor-pointer"
                              >
                                <Mic size={10} />
                                <span>Falar com Minha Voz</span>
                              </button>
                            </div>
                            <p className="text-xs text-white italic">
                              "{phrase}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VISUALIZAÇÃO: DIÁLOGOS PAULISTANOS REAIS */}
            {lexiconDomain === "dialogos" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200">
                  <p className="font-semibold text-purple-300 mb-0.5">Diálogos Reais Paulistanos da Prática</p>
                  <p className="text-[11px] text-zinc-400">
                    Roteiros completos de diálogos reais extraídos da vivência e da cultura de rua de São Paulo.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(() => {
                    const spDomain = lexiconData.domains.find((d) => d.id === "girias_sp");
                    const part17 = spDomain?.categories.find((c) => c.title.includes("Diálogos Reais"));
                    const dialogues = (part17 as any)?.dialogues || [];

                    if (dialogues.length === 0) {
                      return <p className="text-xs text-zinc-500">Diálogos em processamento...</p>;
                    }

                    return dialogues.map((d: any, idx: number) => (
                      <div key={idx} className="apple-glass rounded-3xl p-5 space-y-3.5 border border-white/10 flex flex-col justify-between">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between pb-2 border-b border-white/5">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <MessageCircle size={13} className="text-purple-400" />
                              <span>{d.title}</span>
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
                              Diálogo Real
                            </span>
                          </div>

                          <div className="space-y-2">
                            {d.lines.map((line: string, lIdx: number) => (
                              <div
                                key={lIdx}
                                className={`p-2.5 rounded-xl text-xs ${
                                  lIdx % 2 === 0
                                    ? "bg-zinc-900/90 text-white border border-white/5"
                                    : "bg-purple-950/30 text-purple-200 border border-purple-500/20"
                                }`}
                              >
                                {line}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyTerm(`dlg_${idx}`, d.fullText)}
                            className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white transition cursor-pointer"
                            title="Copiar diálogo completo"
                          >
                            {copiedTermId === `dlg_${idx}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleInsertToDispatch(d.fullText, "replace")}
                            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer shadow-md"
                          >
                            <Mic size={11} />
                            <span>Carregar no Disparo</span>
                            <ArrowRight size={11} />
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Título</label>
                  <input
                    type="text"
                    required
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    placeholder="Ex: Frase de Efeito..."
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Categoria</label>
                  <select
                    value={newNoteCategory}
                    onChange={(e) => setNewNoteCategory(e.target.value as any)}
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="ideia">💡 Roteiro / Frase</option>
                    <option value="voz">🎙️ Mensagem de Voz</option>
                    <option value="assistente">📋 Do Assistente</option>
                    <option value="geral">📁 Geral</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Conteúdo da Mensagem ou Nota</label>
                <textarea
                  required
                  rows={4}
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Escreva sua anotação ou roteiro de fala..."
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
