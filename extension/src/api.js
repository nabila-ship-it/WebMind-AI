// API Client and Chrome Communication Helper for WebMind AI

export const DEFAULT_BACKEND_URL = "https://web-mind-ai-xi.vercel.app/api/ai";

/**
 * Retrieve backend URL from chrome.storage or localStorage
 */
export async function getBackendUrl() {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const data = await chrome.storage.local.get(["backendUrl"]);
      if (data.backendUrl) return data.backendUrl;
    } else {
      const stored = localStorage.getItem("webmind_backend_url");
      if (stored) return stored;
    }
  } catch (e) {
    console.warn("Gagal membaca backend URL tersimpan:", e);
  }
  return DEFAULT_BACKEND_URL;
}

/**
 * Save backend URL to storage
 */
export async function saveBackendUrl(url) {
  const cleanUrl = url.trim().replace(/\/+$/, "");
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ backendUrl: cleanUrl });
    } else {
      localStorage.setItem("webmind_backend_url", cleanUrl);
    }
    return true;
  } catch (e) {
    console.error("Gagal menyimpan backend URL:", e);
    return false;
  }
}

/**
 * Retrieve chat history from chrome.storage or localStorage
 */
export async function getStoredChatHistory() {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const data = await chrome.storage.local.get(["webmind_chat_history"]);
      if (Array.isArray(data.webmind_chat_history)) return data.webmind_chat_history;
    } else {
      const stored = localStorage.getItem("webmind_chat_history");
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Gagal membaca riwayat chat:", e);
  }
  return [];
}

/**
 * Save chat history to chrome.storage or localStorage
 */
export async function saveStoredChatHistory(messages) {
  try {
    const trimmed = messages.slice(-50);
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ webmind_chat_history: trimmed });
    } else {
      localStorage.setItem("webmind_chat_history", JSON.stringify(trimmed));
    }
    return true;
  } catch (e) {
    console.error("Gagal menyimpan riwayat chat:", e);
    return false;
  }
}

/**
 * Clear stored chat history
 */
export async function clearStoredChatHistory() {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.remove(["webmind_chat_history"]);
    } else {
      localStorage.removeItem("webmind_chat_history");
    }
    return true;
  } catch (e) {
    console.error("Gagal menghapus riwayat chat:", e);
    return false;
  }
}

/**
 * Retrieve global activity log (summaries, translations, Q&A)
 */
export async function getStoredActivityLogs() {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const data = await chrome.storage.local.get(["webmind_activity_logs"]);
      if (Array.isArray(data.webmind_activity_logs)) return data.webmind_activity_logs;
    } else {
      const stored = localStorage.getItem("webmind_activity_logs");
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Gagal membaca log aktivitas:", e);
  }
  return [];
}

/**
 * Append an activity to global activity log
 */
export async function addStoredActivityLog(entry) {
  try {
    const current = await getStoredActivityLogs();
    const updated = [
      {
        id: "act_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        ...entry
      },
      ...current
    ].slice(0, 30);

    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ webmind_activity_logs: updated });
    } else {
      localStorage.setItem("webmind_activity_logs", JSON.stringify(updated));
    }
    return updated;
  } catch (e) {
    console.error("Gagal menambahkan log aktivitas:", e);
    return [];
  }
}

/**
 * Clear all activity logs
 */
export async function clearStoredActivityLogs() {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.remove(["webmind_activity_logs"]);
    } else {
      localStorage.removeItem("webmind_activity_logs");
    }
    return true;
  } catch (e) {
    console.error("Gagal menghapus log aktivitas:", e);
    return false;
  }
}

/**
 * Ping backend health endpoint
 */
export async function testBackendConnection(baseUrl) {
  try {
    const rootUrl = baseUrl.replace(/\/api\/ai$/, "");
    const healthEndpoint = `${rootUrl}/api/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(healthEndpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return { ok: true, data };
    }
    return { ok: false, error: `Status ${res.status}: ${res.statusText}` };
  } catch (err) {
    return {
      ok: false,
      error: err.name === "AbortError" ? "Koneksi timeout (lebih dari 6 detik)" : err.message
    };
  }
}

/**
 * Send request to AI backend
 * @param {Object} params - { action: 'summarize'|'ask'|'translate', content: string, question?: string, targetLanguage?: string }
 */
export async function callAiBackend(params) {
  const targetUrl = await getBackendUrl();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout for AI generation

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: Gagal memproses permintaan.`);
    }

    return {
      success: true,
      result: data.result,
      isMock: Boolean(data.isMock),
      warning: data.warning,
      model: data.model
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === "AbortError") {
      throw new Error("Waktu permintaan habis (timeout). Server AI membutuhkan waktu lebih lama.");
    }

    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      throw new Error(
        `Tidak dapat terhubung ke Backend (${targetUrl}). ` +
        `Pastikan server Vercel aktif atau jalankan 'npm run dev' di folder backend.`
      );
    }

    throw err;
  }
}

/**
 * Extract active tab text content or selection
 */
export async function getActiveTabContent() {
  // If not running in Chrome extension (e.g. browser dev preview)
  if (typeof chrome === "undefined" || !chrome.tabs?.query) {
    return {
      title: "Contoh Halaman Web (Mode Preview Browser)",
      url: "https://id.wikipedia.org/wiki/Kecerdasan_buatan",
      content:
        "Kecerdasan buatan (AI) adalah kecerdasan yang ditambahkan kepada suatu sistem yang bisa diatur dalam konteks ilmiah. " +
        "Kecerdasan buatan diciptakan dan dimasukkan ke dalam suatu mesin (komputer) agar dapat melakukan pekerjaan seperti yang dapat dilakukan manusia. " +
        "Beberapa macam bidang yang menggunakan kecerdasan buatan antara lain sistem pakar, permainan komputer, logika fuzi, jaringan saraf tiruan, dan robotika.",
      isSelection: false,
      wordCount: 52
    };
  }

  // Running inside Chrome Extension
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    throw new Error("Tidak dapat mendeteksi tab yang sedang aktif.");
  }

  // Prevent running on restricted chrome:// or edge:// pages
  if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://") || tab.url?.startsWith("chrome-extension://")) {
    throw new Error("Extension tidak dapat mengakses halaman internal browser (chrome://). Silakan buka website biasa.");
  }

  // First attempt: communicate with content.js via message
  try {
    const response = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { action: "GET_PAGE_CONTENT" }, (res) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(res);
        }
      });
    });

    if (response?.success && response.data) {
      return response.data;
    }
  } catch (e) {
    // If content script was not injected, inject programmatically via scripting API
    console.log("Menjalankan programmatic script injection...", e.message);
  }

  // Fallback: Programmatic injection using chrome.scripting.executeScript
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selection = window.getSelection()?.toString()?.trim();
        if (selection && selection.length > 5) {
          return {
            title: document.title || "Teks Terpilih",
            url: window.location.href,
            content: selection,
            isSelection: true,
            wordCount: selection.split(/\s+/).filter(Boolean).length
          };
        }

        const clone = document.body.cloneNode(true);
        const toRemove = ["script", "style", "noscript", "nav", "footer", "header", "aside", "svg"];
        toRemove.forEach((sel) => clone.querySelectorAll(sel).forEach((el) => el.remove()));
        const main = clone.querySelector("article") || clone.querySelector("main") || clone;
        const text = (main.innerText || main.textContent || "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();

        return {
          title: document.title || "Halaman Web",
          url: window.location.href,
          content: text,
          isSelection: false,
          wordCount: text.split(/\s+/).filter(Boolean).length
        };
      }
    });

    if (results && results[0]?.result) {
      return results[0].result;
    }
    throw new Error("Tidak ada konten teks yang ditemukan pada tab ini.");
  } catch (scriptErr) {
    throw new Error("Gagal mengambil isi halaman: " + scriptErr.message);
  }
}
