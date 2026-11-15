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
} from "lucide-react";

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
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          text: textToSynthesize,
          mood: dispatchMood,
          timestamp: Date.now(),
        }),
      });

      if (!res.ok) throw new Error("Falha na síntese de áudio");

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);

      setDispatchAudioBlob(blob);
      setDispatchAudioUrl(audioUrl);
      setDispatchAudioSourceText(textToSynthesize);
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
                onChange={(e) => handleDispatchTextChange(e.target.value)}
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
                    onClick={() => handleDispatchTextChange(phrase)}
                    className="px-2.5 py-1 rounded-full bg-zinc-900/60 hover:bg-zinc-800 border border-white/[0.04] text-[10px] text-zinc-400 hover:text-white transition"
                  >
                    {phrase}
                  </button>
                ))}
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

                {/* Dispatch Trigger Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => handleSendToWhatsApp()}
                    disabled={isSendingWhatsApp}
                    className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition shadow-lg shadow-emerald-900/20 disabled:opacity-40"
                  >
                    {isSendingWhatsApp ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <MessageCircle size={14} />
                    )}
                    <span>Disparar WhatsApp</span>
                  </button>

                  <button
                    onClick={handleSaveDispatchAudioToRecords}
                    className="py-3 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium text-xs flex items-center justify-center space-x-1.5 transition border border-white/[0.08]"
                  >
                    {savedDispatchSuccess ? (
                      <>
                        <Check size={14} className="text-emerald-400" />
                        <span className="text-emerald-400">Salvo no Acervo!</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus size={14} className="text-zinc-300" />
                        <span>Salvar no Acervo</span>
                      </>
                    )}
                  </button>

                  <a
                    href={dispatchAudioUrl}
                    download="mensagem_vocal.mp3"
                    className="py-3 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs flex items-center justify-center space-x-1.5 transition border border-white/[0.06]"
                  >
                    <Download size={13} />
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
                  { id: "voz", label: "🎙️ Voz & Mensagens" },
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
