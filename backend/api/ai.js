// Serverless Function handler for Vercel & Local Express Dev Server
// Endpoint: /api/ai

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

// Set CORS headers helper
function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
}

// Handler function for Vercel
export default async function handler(req, res) {
  setCorsHeaders(res);

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method tidak diizinkan. Gunakan metode POST."
    });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ success: false, error: "Format JSON tidak valid." });
      }
    }

    const { action, content, question, targetLanguage = "id", mode = "standard" } = body || {};

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Konten teks halaman tidak boleh kosong."
      });
    }

    // Safety guard: Limit maximum characters to avoid token abuse (max 25,000 chars ~ 5,000 words)
    const trimmedContent = content.slice(0, 25000);

    // Build prompt based on action
    let systemInstruction = "";
    let prompt = "";

    switch (action) {
      case "summarize":
        systemInstruction =
          "Anda adalah asisten AI WebMind AI cerdas dan profesional untuk Chrome Extension. " +
          "Tugas Anda adalah merangkum konten website yang diberikan secara terstruktur, jelas, dan akurat dalam Bahasa Indonesia. " +
          "Format output dengan Markdown yang rapi:\n" +
          "### 📌 Ringkasan Utama (TL;DR)\n(1-2 paragraf singkat padat)\n\n" +
          "### 🔑 Poin-Poin Kunci\n- Poin 1\n- Poin 2\n- Poin 3...\n\n" +
          "### 💡 Kesimpulan / Actionable Insight\n(Kesimpulan akhir)";
        prompt = `Berikut adalah teks dari halaman web:\n"""\n${trimmedContent}\n"""\n\nTolong buatkan ringkasan yang komprehensif dan mudah dipahami.`;
        break;

      case "ask":
        if (!question || typeof question !== "string" || question.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: "Pertanyaan tidak boleh kosong untuk fitur Tanya AI."
          });
        }
        systemInstruction =
          "Anda adalah WebMind AI, asisten analis konten web. " +
          "Jawab pertanyaan pengguna secara akurat, ramah, dan solutif berdasarkan konten halaman web yang dilampirkan. " +
          "Jika informasi tidak terdapat pada konten, sampaikan secara sopan lalu berikan wawasan relevan. " +
          "Gunakan Bahasa Indonesia yang alami dan format Markdown.";
        prompt = `KONTEKS HALAMAN WEB:\n"""\n${trimmedContent}\n"""\n\nPERTANYAAN PENGGUNA:\n${question}\n\nJAWABAN:`;
        break;

      case "translate":
        const langName = targetLanguage === "en" ? "Bahasa Inggris" : "Bahasa Indonesia";
        systemInstruction =
          `Anda adalah penerjemah ahli profesional WebMind AI. ` +
          `Tugas Anda adalah menerjemahkan teks berikut ke dalam ${langName} dengan akurat, ` +
          `mempertahankan konteks, nuansa bahasa yang luwes, dan istilah teknis yang tepat. ` +
          `Hanya berikan hasil terjemahan tanpa basa-basi pembuka atau penutup.`;
        prompt = `Teks yang akan diterjemahkan:\n"""\n${trimmedContent}\n"""\n\nTerjemahkan ke ${langName}:`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Aksi '${action}' tidak dikenali. Pilih antara: 'summarize', 'ask', atau 'translate'.`
        });
    }

    // Check if GEMINI_API_KEY is available
    const apiKey = process.env.GEMINI_API_KEY || GEMINI_API_KEY;

    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
      // Mock Demo Mode for presentation and initial testing when API key is not yet set
      const mockResult = generateMockResponse(action, question, targetLanguage, trimmedContent);
      return res.status(200).json({
        success: true,
        isMock: true,
        result: mockResult,
        warning: "API Key belum diatur di Vercel Environment Variables. Menggunakan Mode Demo Simulasi AI."
      });
    }

    // Models to try in order of availability
    const primaryModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    const modelsToTry = [primaryModel, "gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.5-flash"];
    const uniqueModels = [...new Set(modelsToTry)];

    const requestPayload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemInstruction}\n\n${prompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        topP: 0.95
      }
    };

    let generatedText = null;
    let successfulModel = primaryModel;
    let lastError = null;

    for (const model of uniqueModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload)
        });

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0];
          generatedText = candidate?.content?.parts?.[0]?.text;
          if (generatedText) {
            successfulModel = model;
            break;
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn(`Model ${model} returned ${response.status}:`, errData.error?.message);
          lastError = errData.error?.message;
        }
      } catch (reqErr) {
        console.warn(`Error calling model ${model}:`, reqErr.message);
        lastError = reqErr.message;
      }
    }

    if (!generatedText) {
      return res.status(500).json({
        success: false,
        error: "Gagal mendapatkan respon dari AI. Mohon coba beberapa saat lagi.",
        details: lastError
      });
    }

    return res.status(200).json({
      success: true,
      result: generatedText,
      model: successfulModel,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Serverless Handler Error:", error);
    return res.status(500).json({
      success: false,
      error: "Terjadi kesalahan internal pada server backend.",
      details: error.message
    });
  }
}

// Fallback mock generator for seamless offline demo
function generateMockResponse(action, question, targetLanguage, content) {
  const preview = content.slice(0, 100).replace(/\s+/g, " ") + "...";

  if (action === "summarize") {
    return (
      `> ℹ️ *Mode Simulasi AI (Siap Hubungkan API Key Gemini)*\n\n` +
      `### 📌 Ringkasan Utama (TL;DR)\n` +
      `Halaman ini membahas tentang: "${preview}". Dokumen menyajikan konsep utama dan informasi terkait topik secara terstruktur.\n\n` +
      `### 🔑 Poin-Poin Kunci\n` +
      `- **Fokus Topik:** Menganalisis elemen-elemen penting dari artikel yang sedang dibuka.\n` +
      `- **Struktur Konten:** Terdiri dari pendahuluan, pembahasan inti, dan penutup penjelasan.\n` +
      `- **Penerapan:** Memberikan wawasan yang dapat langsung diaplikasikan oleh pembaca.\n\n` +
      `### 💡 Kesimpulan\n` +
      `Konten ini sangat relevan untuk dipelajari lebih lanjut sebagai referensi materi pembelajaran.`
    );
  } else if (action === "ask") {
    return (
      `> ℹ️ *Mode Simulasi AI (Tanya AI)*\n\n` +
      `Berdasarkan konteks halaman yang dibaca mengenai "${preview}":\n\n` +
      `**Pertanyaan Anda:** "${question}"\n\n` +
      `**Jawaban AI:** Konten halaman menunjukkan bahwa topik tersebut relevan dengan permasalahan yang Anda tanyakan. ` +
      `Informasi kunci berfokus pada efisiensi proses, kejelasan materi, serta kemudahan implementasi.`
    );
  } else if (action === "translate") {
    const lang = targetLanguage === "en" ? "Bahasa Inggris" : "Bahasa Indonesia";
    return (
      `> ℹ️ *Mode Simulasi Terjemahan (Ke ${lang})*\n\n` +
      `[Terjemahan Berhasil]: ${content.slice(0, 300)}...`
    );
  }
  return "Respon simulasi WebMind AI.";
}
