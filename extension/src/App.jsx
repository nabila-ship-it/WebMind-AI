import React, { useState, useEffect } from "react";
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
  FileSpreadsheet
} from "lucide-react";
import {
  callAiBackend,
  getActiveTabContent,
  getBackendUrl,
  saveBackendUrl,
  testBackendConnection,
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

  // AI Output State
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [result, setResult] = useState("");
  const [resultWarning, setResultWarning] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Feature specific states
  const [question, setQuestion] = useState("");
  const [targetLang, setTargetLang] = useState("id"); // 'id' | 'en'

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

  async function initApp() {
    try {
      const url = await getBackendUrl();
      setBackendUrl(url);
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
      // If it is a PDF page or extracted content is 0, auto-expand manual paste box
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
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  }

  // Handle Ask AI action
  async function handleAskAi(customQuery) {
    const queryToSend = customQuery || question;
    if (!queryToSend.trim()) return;

    if (!effectiveContent) {
      setErrorMessage("Konten belum terbaca. Silakan tempelkan teks materi terlebih dahulu.");
      return;
    }

    setLoading(true);
    setLoadingStep("Menganalisis jawaban berdasarkan konten...");
    setErrorMessage("");
    setResult("");
    setResultWarning("");

    try {
      const res = await callAiBackend({
        action: "ask",
        content: effectiveContent,
        question: queryToSend
      });

      setResult(res.result);
      if (res.warning) setResultWarning(res.warning);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
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
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  }

  // Copy result to clipboard
  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2200);
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
            <p className="text-[10px] text-slate-400 truncate max-w-[210px]" title={pageInfo.title}>
              {pageInfo.title || "Membuka halaman..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={fetchPageContent}
            title="Muat ulang teks halaman"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isExtracting ? "animate-spin text-brand-400" : ""}`} />
          </button>
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
          {showManualInput ? "Sembunyikan Input" : "Tempel Manual"}
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

      {/* Feature Action Bar / Input Controls */}
      <div className="p-3 bg-slate-900/30 border-b border-slate-800/50">
        {activeTab === "summarize" && (
          <div className="flex items-center justify-between gap-2">
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

        {activeTab === "ask" && (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAskAi()}
                placeholder="Tanyakan apapun tentang isi materi ini..."
                className="flex-1 bg-slate-950 border border-slate-700/80 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
              />
              <button
                onClick={() => handleAskAi()}
                disabled={loading || !question.trim() || !effectiveContent}
                className="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white rounded-md transition text-xs font-medium flex items-center justify-center active:scale-95"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-1">
              {[
                "Jelaskan dengan bahasa sederhana",
                "Apa kesimpulan utamanya?",
                "Buat 3 poin pro dan kontra"
              ].map((chipText, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuestion(chipText);
                    handleAskAi(chipText);
                  }}
                  disabled={loading || !effectiveContent}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 hover:bg-brand-900/40 text-slate-300 hover:text-brand-300 border border-slate-700/50 hover:border-brand-500/40 transition"
                >
                  {chipText}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "translate" && (
          <div className="flex items-center justify-between gap-2">
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
      </div>

      {/* Manual Paste Box Drawer (When on PDF, no text, or toggled) */}
      {showManualInput && (
        <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 animate-fade-in space-y-2">
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
            rows={3}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-md p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none font-sans"
          />
          {isPdfPage && !customText && (
            <p className="text-[10px] text-amber-300/90 leading-tight">
              💡 <b>Catatan:</b> File PDF di Chrome diproteksi oleh keamanan browser. Silakan <b>Ctrl+C</b> teks yang sudah Anda blok di PDF lalu tekan <b>Ctrl+V</b> di kotak ini!
            </p>
          )}
        </div>
      )}

      {/* Main Content Area (Results / States) */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 relative">
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

        {/* Warning notification banner (e.g. mock mode) */}
        {resultWarning && (
          <div className="p-2 rounded-md bg-amber-950/40 border border-amber-800/50 text-amber-200 text-[11px] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{resultWarning}</span>
          </div>
        )}

        {/* Loading state indicator */}
        {loading && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin" />
              <Brain className="w-5 h-5 text-brand-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-200">{loadingStep || "Sedang memproses..."}</p>
              <p className="text-[10px] text-slate-400 mt-1">Menggunakan Google Gemini melalui Vercel Backend</p>
            </div>
          </div>
        )}

        {/* Empty state (Ready to generate) */}
        {!loading && !result && !errorMessage && (
          <div className="h-full flex flex-col items-center justify-center text-center py-6 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner">
              <Sparkles className="w-6 h-6 text-brand-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-slate-200">
                {activeTab === "summarize" && "Siap Merangkum Materi"}
                {activeTab === "ask" && "Tanya Jawab Seputar Materi"}
                {activeTab === "translate" && "Terjemahkan Teks Cepat"}
              </h3>
              <p className="text-[11px] text-slate-400 max-w-[280px] leading-relaxed">
                {effectiveWordCount > 0 ? (
                  <>
                    Teks siap diproses ({effectiveWordCount} kata). Klik tombol <b>"Ringkas"</b> di atas.
                  </>
                ) : isPdfPage ? (
                  <>
                    Dokumen PDF terdeteksi. Silakan <b>Ctrl+C</b> teks jurnal yang Anda blok di PDF, lalu tempelkan (<b>Ctrl+V</b>) pada kotak di atas.
                  </>
                ) : (
                  <>
                    Buka halaman web artikel, atau gunakan fitur <b>Tempel Manual</b> jika membuka dokumen PDF.
                  </>
                )}
              </p>
            </div>

            {pageInfo.isSelection && !customText && (
              <div className="text-[10px] bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan px-2.5 py-1 rounded-full">
                💡 Teks terpilih terdeteksi! Fitur akan otomatis berfokus pada teks tersebut.
              </div>
            )}
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
                onClick={handleCopy}
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
      </div>

      {/* Footer / Status bar */}
      <footer className="px-3 py-2 bg-slate-900 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-slate-300 hover:text-white transition text-[11px]"
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{isCopied ? "Tersalin!" : "Salin Hasil"}</span>
            </button>
          )}
          {result && (
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
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">Tugas Pemrograman Web</span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span className="text-[10px] font-medium text-brand-400">Nabila</span>
        </div>
      </footer>

      {/* Settings Modal (Backend & Info) */}
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
                Gunakan <code className="text-brand-300">http://localhost:3000/api/ai</code> untuk pengujian lokal, atau URL Vercel setelah di-deploy.
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
              <p>• Model AI: Google Gemini 1.5 Flash via Serverless Functions</p>
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
