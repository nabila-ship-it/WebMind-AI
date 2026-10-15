import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  Brain,
  Sparkles,
  FileText,
  MessageSquare,
  Languages,
  Copy,
  Check,
  RotateCcw,
  Settings,
  AlertCircle,
  Zap,
  Send,
  Loader2,
  CheckCircle2,
  ClipboardPaste,
  FileSpreadsheet,
  History,
  Trash2,
  Clock,
  User,
  Bot,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  callAiBackend,
  getActiveTabContent,
  getBackendUrl,
  saveBackendUrl,
  testBackendConnection,
  getStoredChatHistory,
  saveStoredChatHistory,
  clearStoredChatHistory,
  getStoredActivityLogs,
  addStoredActivityLog,
  clearStoredActivityLogs,
  DEFAULT_BACKEND_URL
} from "./api";

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState("summarize"); // 'summarize' | 'ask' | 'translate'

  // Page Context State
  const [pageInfo, setPageInfo] = useState({
    title: "Memuat...",
    url: "",
    content: "",
    isSelection: false,
    wordCount: 0
  });
  const [isExtracting, setIsExtracting] = useState(true);
  const [extractError, setExtractError] = useState(null);

  // Custom / Manual Text Input (for PDFs and protected documents)
  const [customText, setCustomText] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // AI Output State (Summarize & Translate)
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [result, setResult] = useState("");
  const [resultWarning, setResultWarning] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Feature specific states
  const [question, setQuestion] = useState("");
  const [targetLang, setTargetLang] = useState("id"); // 'id' | 'en'

  // Chat History State (for 'ask' tab)
  const [chatMessages, setChatMessages] = useState([]);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const chatEndRef = useRef(null);

  // Global Activity History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyFilter, setHistoryFilter] = useState("all"); // 'all' | 'ask' | 'summarize' | 'translate'
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [testStatus, setTestStatus] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  // Check if current tab is a PDF document
  const isPdfPage = Boolean(
    pageInfo.url?.toLowerCase().includes(".pdf") ||
    pageInfo.title?.toLowerCase().includes(".pdf")
  );

  // Effective content to be processed by AI
  const effectiveContent = (customText.trim() || pageInfo.content || "").trim();
  const effectiveWordCount = effectiveContent
    ? effectiveContent.split(/\s+/).filter(Boolean).length
    : 0;

  // Initial load
  useEffect(() => {
    initApp();
  }, []);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (activeTab === "ask" && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, loading, activeTab]);

  async function initApp() {
    try {
      const url = await getBackendUrl();
      setBackendUrl(url);

      // Load persistent chat history
      const savedChat = await getStoredChatHistory();
      if (Array.isArray(savedChat) && savedChat.length > 0) {
        setChatMessages(savedChat);
      }

      // Load persistent activity logs
      const savedLogs = await getStoredActivityLogs();
      if (Array.isArray(savedLogs)) {
        setHistoryLogs(savedLogs);
      }
    } catch (e) {
      console.warn("Storage warning:", e);
    }
    fetchPageContent();
  }

  // Extract content from current active tab
  async function fetchPageContent() {
    setIsExtracting(true);
    setExtractError(null);
    try {
      const data = await getActiveTabContent();
      setPageInfo(data);
      if (data.url?.toLowerCase().includes(".pdf") || data.wordCount === 0) {
        setShowManualInput(true);
      }
    } catch (err) {
      setExtractError(err.message || "Gagal mengambil isi halaman.");
      setShowManualInput(true);
    } finally {
      setIsExtracting(false);
    }
  }

  // Paste directly from clipboard
  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setCustomText(text.trim());
        setShowManualInput(true);
      } else {
        setErrorMessage("Clipboard kosong. Silakan salin (Ctrl+C) teks terlebih dahulu.");
      }
    } catch (err) {
      setErrorMessage("Izin clipboard diperlukan. Silakan klik kotak teks lalu tekan Ctrl + V.");
    }
  }

  // Handle Summarize action
  async function handleSummarize() {
    if (!effectiveContent) {
      setErrorMessage("Teks belum tersedia. Silakan salin (Ctrl+C) teks dari halaman/PDF lalu tempelkan di kotak teks.");
      return;
    }

    setLoading(true);
    setLoadingStep("Menghubungi WebMind AI...");
    setErrorMessage("");
    setResult("");
    setResultWarning("");

    try {
      const res = await callAiBackend({
        action: "summarize",
        content: effectiveContent
      });

      setResult(res.result);
      if (res.warning) setResultWarning(res.warning);

      // Save to Activity Logs
      const updatedLogs = await addStoredActivityLog({
        type: "summarize",
        title: pageInfo.title || "Halaman Web",
        url: pageInfo.url || "",
        content: res.result
      });
      setHistoryLogs(updatedLogs);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  }

  // Handle Ask AI action (Multi-turn Chat)
  async function handleAskAi(customQuery) {
    const queryToSend = customQuery || question;
    if (!queryToSend.trim()) return;

    if (!effectiveContent) {
      setErrorMessage("Konten belum terbaca. Silakan tempelkan teks materi terlebih dahulu.");
      return;
    }

    const userMsg = {
      id: "msg_" + Date.now(),
      role: "user",
      text: queryToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    saveStoredChatHistory(newMessages);
    setQuestion("");

    setLoading(true);
    setLoadingStep("Menganalisis jawaban berdasarkan konten...");
    setErrorMessage("");
    setResultWarning("");

    try {
      const res = await callAiBackend({
        action: "ask",
        content: effectiveContent,
        question: queryToSend.trim()
      });

      const botMsg = {
        id: "msg_" + (Date.now() + 1),
        role: "assistant",
        text: res.result,
        model: res.model,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      const finalMessages = [...newMessages, botMsg];
      setChatMessages(finalMessages);
      saveStoredChatHistory(finalMessages);

      if (res.warning) setResultWarning(res.warning);

      // Save to Activity Logs
      const updatedLogs = await addStoredActivityLog({
        type: "ask",
        title: pageInfo.title || "Halaman Web",
        url: pageInfo.url || "",
        query: queryToSend.trim(),
        content: res.result
      });
      setHistoryLogs(updatedLogs);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  }

  // Clear Chat History
  async function handleClearChat() {
    setChatMessages([]);
    await clearStoredChatHistory();
  }

  // Handle Translate action
  async function handleTranslate() {
    if (!effectiveContent) {
      setErrorMessage("Tidak ada teks yang dapat diterjemahkan. Tempel teks terlebih dahulu.");
      return;
    }

    setLoading(true);
    const langLabel = targetLang === "en" ? "Bahasa Inggris" : "Bahasa Indonesia";
    setLoadingStep(`Menerjemahkan ke ${langLabel}...`);
    setErrorMessage("");
    setResult("");
    setResultWarning("");

    try {
      const res = await callAiBackend({
        action: "translate",
        content: effectiveContent,
        targetLanguage: targetLang
      });

      setResult(res.result);
      if (res.warning) setResultWarning(res.warning);

      // Save to Activity Logs
      const updatedLogs = await addStoredActivityLog({
        type: "translate",
        title: pageInfo.title || "Halaman Web",
        url: pageInfo.url || "",
        content: res.result,
        targetLang: targetLang
      });
      setHistoryLogs(updatedLogs);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  }

  // Copy result to clipboard
  function handleCopy(textToCopy) {
    const text = textToCopy || result;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2200);
  }

  // Copy individual chat bubble
  function handleCopyChatMessage(msgId, text) {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  }

  // Clear all global activity logs
  async function handleClearAllLogs() {
    await clearStoredActivityLogs();
    setHistoryLogs([]);
  }

  // Save backend configuration
  async function handleSaveSettings() {
    await saveBackendUrl(backendUrl);
    setShowSettings(false);
    setTestStatus(null);
  }

  // Test backend connection
  async function handleTestBackend() {
    setIsTesting(true);
    setTestStatus(null);
    const res = await testBackendConnection(backendUrl);
    setIsTesting(false);
    setTestStatus(res);
  }

  // Format date helper
  function formatLogDate(isoString) {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "";
    }
  }

  // Filtered logs for History Modal
  const filteredLogs = historyLogs.filter((item) => {
    if (historyFilter === "all") return true;
    return item.type === historyFilter;
  });

  return (
    <div className="flex flex-col h-[590px] w-full bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Header */}
      <header className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur z-20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 via-indigo-500 to-accent-cyan flex items-center justify-center shadow-md shadow-brand-500/20">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-200 bg-clip-text text-transparent">
                WebMind AI
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                v1.0 MVP
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[190px]" title={pageInfo.title}>
              {pageInfo.title || "Membuka halaman..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* History Button */}
          <button
            onClick={() => {
              getStoredActivityLogs().then((logs) => setHistoryLogs(logs));
              setShowHistoryModal(true);
            }}
            title="Riwayat Chat & Aktivitas AI"
            className="p-1.5 text-slate-400 hover:text-brand-300 hover:bg-slate-800 rounded-md transition relative"
          >
            <History className="w-3.5 h-3.5" />
            {historyLogs.length > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-400" />
            )}
          </button>

          {/* Refresh Page Content */}
          <button
            onClick={fetchPageContent}
            title="Muat ulang teks halaman"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isExtracting ? "animate-spin text-brand-400" : ""}`} />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            title="Pengaturan Backend Vercel"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Page Context Badge */}
      <div className="px-3.5 py-1.5 bg-slate-900/40 border-b border-slate-800/40 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 truncate">
          <span className={`w-1.5 h-1.5 rounded-full ${effectiveWordCount > 0 ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
          {customText ? (
            <span className="text-amber-300 font-medium flex items-center gap-1">
              <ClipboardPaste className="w-3 h-3" /> Teks Tempelan Manual ({effectiveWordCount} kata)
            </span>
          ) : isPdfPage ? (
            <span className="text-amber-300 font-medium flex items-center gap-1">
              <FileSpreadsheet className="w-3 h-3" /> File PDF (Gunakan Mode Tempel Teks)
            </span>
          ) : pageInfo.isSelection ? (
            <span className="text-accent-cyan font-medium flex items-center gap-1">
              <Zap className="w-3 h-3" /> Teks yang Anda Blok ({pageInfo.wordCount} kata)
            </span>
          ) : (
            <span className="truncate">
              {pageInfo.wordCount > 0 ? `Konten Halaman (${pageInfo.wordCount} kata)` : "Menyiapkan teks..."}
            </span>
          )}
        </div>
        
        {/* Toggle Manual Input Button */}
        <button
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-[10px] text-brand-400 hover:text-brand-300 underline underline-offset-2 ml-1"
        >
          {showManualInput ? "Sembunyikan" : "Tempel Manual"}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 p-1.5 gap-1 bg-slate-900/60 border-b border-slate-800/60">
        <button
          onClick={() => {
            setActiveTab("summarize");
            setErrorMessage("");
          }}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
            activeTab === "summarize"
              ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30 font-semibold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Ringkas</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("ask");
            setErrorMessage("");
          }}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
            activeTab === "ask"
              ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30 font-semibold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Tanya AI</span>
          {chatMessages.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.2 bg-brand-500/40 text-brand-200 rounded-full font-mono">
              {chatMessages.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab("translate");
            setErrorMessage("");
          }}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
            activeTab === "translate"
              ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30 font-semibold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Languages className="w-3.5 h-3.5" />
          <span>Terjemah</span>
        </button>
      </div>

      {/* Manual Paste Box Drawer (When on PDF, no text, or toggled) */}
      {showManualInput && (
        <div className="px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 animate-fade-in space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <ClipboardPaste className="w-3.5 h-3.5 text-amber-400" />
              {isPdfPage ? "Mode Baca PDF (Salin & Tempel)" : "Tempel Teks Manual"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePasteFromClipboard}
                className="text-[10px] px-2 py-0.5 rounded bg-brand-600/30 hover:bg-brand-600/50 text-brand-300 border border-brand-500/40 flex items-center gap-1 transition"
              >
                <ClipboardPaste className="w-3 h-3" />
                <span>Tempel Otomatis</span>
              </button>
              {customText && (
                <button
                  onClick={() => setCustomText("")}
                  className="text-[10px] text-slate-400 hover:text-slate-200"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>

          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={
              isPdfPage
                ? "Salin (Ctrl+C) teks yang sudah Anda blok di PDF, lalu tempelkan (Ctrl+V) di sini..."
                : "Tempelkan teks artikel atau materi di sini..."
            }
            rows={2}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-md p-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none font-sans"
          />
        </div>
      )}

      {/* Action Bar for Summarize / Translate (when activeTab is NOT ask) */}
      {activeTab === "summarize" && (
        <div className="p-2.5 bg-slate-900/30 border-b border-slate-800/50 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Ekstrak inti sari penting dari teks.</span>
          </div>
          <button
            onClick={handleSummarize}
            disabled={loading || !effectiveContent}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md text-xs font-medium transition shadow-md shadow-brand-600/20 active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ringkas {customText ? "Teks Tempelan" : "Halaman"}</span>
              </>
            )}
          </button>
        </div>
      )}

      {activeTab === "translate" && (
        <div className="p-2.5 bg-slate-900/30 border-b border-slate-800/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Target:</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="id">🇮🇩 Bahasa Indonesia</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
          <button
            onClick={handleTranslate}
            disabled={loading || !effectiveContent}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-md text-xs font-medium transition shadow-md shadow-brand-600/20 active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menerjemahkan...</span>
              </>
            ) : (
              <>
                <Languages className="w-3.5 h-3.5" />
                <span>Terjemahkan</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 relative">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="p-2.5 rounded-md bg-rose-950/50 border border-rose-800/60 text-rose-200 text-xs flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Pemberitahuan</p>
              <p className="text-[11px] text-rose-300 mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Warning notification banner */}
        {resultWarning && (
          <div className="p-2 rounded-md bg-amber-950/40 border border-amber-800/50 text-amber-200 text-[11px] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{resultWarning}</span>
          </div>
        )}

        {/* TAB 1 & 3: SUMMARIZE & TRANSLATE RESULT VIEW */}
        {activeTab !== "ask" && (
          <>
            {/* Loading state indicator */}
            {loading && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin" />
                  <Brain className="w-5 h-5 text-brand-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">{loadingStep || "Sedang memproses..."}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Google Gemini 3.5 Flash via Vercel Cloud</p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && !result && !errorMessage && (
              <div className="h-full flex flex-col items-center justify-center text-center py-6 px-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner">
                  <Sparkles className="w-6 h-6 text-brand-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-slate-200">
                    {activeTab === "summarize" && "Siap Merangkum Materi"}
                    {activeTab === "translate" && "Terjemahkan Teks Cepat"}
                  </h3>
                  <p className="text-[11px] text-slate-400 max-w-[280px] leading-relaxed">
                    {effectiveWordCount > 0 ? (
                      <>Teks siap diproses ({effectiveWordCount} kata). Klik tombol di atas.</>
                    ) : isPdfPage ? (
                      <>Dokumen PDF terdeteksi. Silakan salin (Ctrl+C) teks di PDF lalu tempelkan (Ctrl+V) di kotak atas.</>
                    ) : (
                      <>Buka halaman web artikel, atau gunakan fitur Tempel Manual jika membuka PDF.</>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Result Markdown View */}
            {!loading && result && (
              <div className="glass-card rounded-lg p-3 text-left relative animate-fade-in border border-slate-700/60 shadow-lg">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Hasil WebMind AI
                  </span>
                  <button
                    onClick={() => handleCopy(result)}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="markdown-body select-text">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: INTERACTIVE MULTI-TURN CHAT (TANYA AI WITH HISTORY STREAM) */}
        {activeTab === "ask" && (
          <div className="space-y-3 pb-2">
            {/* Top Chat Info & Quick Actions */}
            <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-brand-400" />
                Obrolan dengan WebMind AI
              </span>
              {chatMessages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  title="Hapus riwayat obrolan ini"
                  className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Bersihkan Chat</span>
                </button>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-1">
              {[
                "Jelaskan dengan bahasa sederhana",
                "Apa kesimpulan utamanya?",
                "Sebutkan 3 poin kunci penelitian"
              ].map((chipText, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskAi(chipText)}
                  disabled={loading || !effectiveContent}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/90 hover:bg-brand-900/50 text-slate-300 hover:text-brand-300 border border-slate-700/60 hover:border-brand-500/50 transition"
                >
                  {chipText}
                </button>
              ))}
            </div>

            {/* Empty chat state */}
            {chatMessages.length === 0 && !loading && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                  <Bot className="w-5 h-5 text-brand-400" />
                </div>
                <p className="text-xs font-medium text-slate-300">Belum ada obrolan</p>
                <p className="text-[11px] max-w-[240px]">
                  Tanyakan apapun tentang isi halaman web atau materi PDF yang sedang dibuka.
                </p>
              </div>
            )}

            {/* Chat Messages List (History Stream) */}
            <div className="space-y-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  } animate-fade-in`}
                >
                  <div
                    className={`flex items-start gap-1.5 max-w-[92%] ${
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-5 h-5 rounded-md shrink-0 flex items-center justify-center mt-0.5 text-[10px] ${
                        msg.role === "user"
                          ? "bg-brand-600 text-white"
                          : "bg-indigo-950 border border-brand-500/30 text-brand-300"
                      }`}
                    >
                      {msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    </div>

                    {/* Bubble Content */}
                    <div
                      className={`rounded-xl px-3 py-2 text-xs text-left shadow-sm select-text ${
                        msg.role === "user"
                          ? "bg-brand-600 text-white rounded-tr-none font-medium"
                          : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none relative group"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      ) : (
                        <div>
                          <div className="markdown-body">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          </div>
                          {/* Copy button on AI response */}
                          <div className="mt-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-mono text-[9px] text-brand-400">Gemini 3.5</span>
                            <button
                              onClick={() => handleCopyChatMessage(msg.id, msg.text)}
                              className="hover:text-white flex items-center gap-1 transition"
                            >
                              {copiedMsgId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Tersalin!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Salin</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <span className="text-[9px] text-slate-500 mt-1 px-7">
                    {msg.timestamp || ""}
                  </span>
                </div>
              ))}

              {/* Loading AI thinking bubble */}
              {loading && (
                <div className="flex items-start gap-1.5 animate-fade-in">
                  <div className="w-5 h-5 rounded-md bg-indigo-950 border border-brand-500/30 text-brand-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3 h-3" />
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl rounded-tl-none px-3 py-2 text-xs flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />
                    <span>WebMind AI sedang memikirkan jawaban...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Tanya AI Fixed Bottom Input Bar */}
      {activeTab === "ask" && (
        <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 z-10">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAskAi();
                }
              }}
              placeholder={
                effectiveContent
                  ? "Tanyakan apapun tentang materi ini..."
                  : "Materi belum tersedia..."
              }
              disabled={loading || !effectiveContent}
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition disabled:opacity-50 font-sans"
            />
            <button
              onClick={() => handleAskAi()}
              disabled={loading || !question.trim() || !effectiveContent}
              className="p-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white rounded-md transition flex items-center justify-center active:scale-95 shrink-0"
              title="Kirim pertanyaan"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Footer / Status bar */}
      <footer className="px-3 py-2 bg-slate-900 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          {activeTab !== "ask" && result && (
            <button
              onClick={() => handleCopy(result)}
              className="flex items-center gap-1 text-slate-300 hover:text-white transition text-[11px]"
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{isCopied ? "Tersalin!" : "Salin Hasil"}</span>
            </button>
          )}
          {activeTab !== "ask" && result && (
            <button
              onClick={() => {
                setResult("");
                setErrorMessage("");
              }}
              className="text-slate-500 hover:text-slate-300 transition text-[11px]"
            >
              Bersihkan
            </button>
          )}
          {activeTab === "ask" && chatMessages.length > 0 && (
            <span className="text-[10px] text-slate-500">
              {chatMessages.length} pesan tersimpan
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">Tugas Pemrograman Web</span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span className="text-[10px] font-medium text-brand-400">Nabila</span>
        </div>
      </footer>

      {/* HISTORY MODAL (Riwayat Aktivitas & Chat Dosen) */}
      {showHistoryModal && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-30 flex items-center justify-center p-3 animate-fade-in">
          <div className="w-full h-[520px] bg-slate-900 border border-slate-800 rounded-xl flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                <History className="w-4 h-4 text-brand-400" />
                <span>Riwayat Aktivitas & Chat AI</span>
              </div>
              <div className="flex items-center gap-1.5">
                {historyLogs.length > 0 && (
                  <button
                    onClick={handleClearAllLogs}
                    className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 transition"
                    title="Hapus semua riwayat"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus Semua</span>
                  </button>
                )}
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-slate-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-950/60 border-b border-slate-800/60 text-[10px]">
              <span className="text-slate-500 mr-1">Filter:</span>
              {[
                { key: "all", label: "Semua" },
                { key: "ask", label: "💬 Tanya AI" },
                { key: "summarize", label: "📄 Ringkasan" },
                { key: "translate", label: "🌐 Terjemah" }
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setHistoryFilter(f.key)}
                  className={`px-2 py-0.5 rounded-full transition ${
                    historyFilter === f.key
                      ? "bg-brand-600 text-white font-medium"
                      : "text-slate-400 hover:text-slate-200 bg-slate-800/60"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12 space-y-2">
                  <Clock className="w-8 h-8 text-slate-600" />
                  <p className="text-xs">Belum ada riwayat aktivitas</p>
                  <p className="text-[10px] text-slate-500 max-w-[200px]">
                    Riwayat pertanyaan, ringkasan, dan terjemahan akan otomatis tercatat di sini.
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <div
                      key={log.id}
                      className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 text-left space-y-1.5 transition hover:border-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                              log.type === "ask"
                                ? "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                                : log.type === "summarize"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {log.type === "ask"
                              ? "💬 Tanya AI"
                              : log.type === "summarize"
                              ? "📄 Ringkasan"
                              : "🌐 Terjemah"}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {log.title || "Halaman"}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-500">
                          {formatLogDate(log.timestamp)}
                        </span>
                      </div>

                      {log.query && (
                        <p className="text-xs font-medium text-slate-200">
                          Q: "{log.query}"
                        </p>
                      )}

                      {/* Content Preview / Expanded */}
                      <div
                        className={`text-[11px] text-slate-300 leading-relaxed ${
                          isExpanded ? "whitespace-pre-wrap select-text" : "line-clamp-2"
                        }`}
                      >
                        {log.content}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px]">
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="text-brand-400 hover:text-brand-300 flex items-center gap-0.5"
                        >
                          {isExpanded ? (
                            <>
                              <span>Tutup</span>
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <span>Lihat Selengkapnya</span>
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleCopy(log.content)}
                          className="text-slate-400 hover:text-white flex items-center gap-1 transition"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Salin</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-2 border-t border-slate-800 bg-slate-900 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                <Settings className="w-4 h-4 text-brand-400" />
                <span>Pengaturan Backend & Deployment</span>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-medium text-slate-300">URL Endpoint Backend Vercel</label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="https://proyek-kamu.vercel.app/api/ai"
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
              />
              <p className="text-[10px] text-slate-500 leading-tight">
                Backend Vercel: <code className="text-brand-300">https://web-mind-ai-xi.vercel.app/api/ai</code>
              </p>
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleTestBackend}
                disabled={isTesting}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition"
              >
                {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-amber-400" />}
                <span>Uji Koneksi</span>
              </button>

              {testStatus && (
                <span className={`text-[10px] ${testStatus.ok ? "text-emerald-400" : "text-rose-400"}`}>
                  {testStatus.ok ? "✅ Backend Terhubung!" : `❌ ${testStatus.error}`}
                </span>
              )}
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[10px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">ℹ️ Informasi Proyek Kuliah:</p>
              <p>• Proyek: WebMind AI (Chrome Extension Manifest V3)</p>
              <p>• Model AI: Google Gemini 3.5 Flash Lite via Vercel</p>
              <p>• Pengembang: Nabila (NPM: 24311149)</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowSettings(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
              >
                Tutup
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-md text-xs font-medium transition"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
