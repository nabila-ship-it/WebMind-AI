// WebMind AI - Content Script
// Extracts clean webpage text or user-highlighted selection

/**
 * Clean and extract readable content from the web page
 */
function extractReadablePageText() {
  // Check if user currently has text selected
  const selection = window.getSelection()?.toString()?.trim();
  if (selection && selection.length > 5) {
    return {
      text: selection,
      isSelection: true,
      length: selection.length,
      wordCount: selection.split(/\s+/).filter(Boolean).length
    };
  }

  // Clone document body to avoid mutating the active page
  const clone = document.body.cloneNode(true);

  // Remove non-content and noisy elements
  const selectorsToRemove = [
    "script", "style", "noscript", "nav", "footer", "header", "aside",
    "svg", "canvas", "iframe", "object", "video", "audio",
    "[aria-hidden='true']", ".ad", ".ads", ".banner", ".cookie-banner",
    ".nav", ".menu", ".sidebar", ".comment", ".comments"
  ];

  selectorsToRemove.forEach((selector) => {
    try {
      const elements = clone.querySelectorAll(selector);
      elements.forEach((el) => el.remove());
    } catch (e) {
      // Ignore unsupported selectors
    }
  });

  // Extract from article or main if available, otherwise entire cleaned body
  const mainContent = clone.querySelector("article") || clone.querySelector("main") || clone;
  let text = mainContent.innerText || mainContent.textContent || "";

  // Normalize whitespace: remove redundant tabs, newlines and spaces
  text = text.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();

  // Word count estimation
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    text: text,
    isSelection: false,
    length: text.length,
    wordCount: wordCount
  };
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GET_PAGE_CONTENT") {
    try {
      const extracted = extractReadablePageText();
      sendResponse({
        success: true,
        data: {
          title: document.title || "Halaman Web",
          url: window.location.href,
          content: extracted.text,
          isSelection: extracted.isSelection,
          wordCount: extracted.wordCount,
          length: extracted.length
        }
      });
    } catch (err) {
      sendResponse({
        success: false,
        error: "Gagal mengekstrak teks halaman: " + err.message
      });
    }
    return true; // Keep message channel open for async response
  }
});
