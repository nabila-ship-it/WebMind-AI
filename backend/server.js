import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import handler from "./api/ai.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Route /api/ai directly to the Vercel handler
app.all("/api/ai", (req, res) => {
  return handler(req, res);
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "WebMind AI Backend",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE"),
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    timestamp: new Date().toISOString()
  });
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 WebMind AI Backend Local Server berjalan di: http://localhost:${PORT}`);
  console.log(`📡 Endpoint API: http://localhost:${PORT}/api/ai`);
  console.log(`💓 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔑 Status GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? "TERDETEKSI ✅" : "Belum diatur (Mode Demo Simulasi Aktif) ⚠️"}\n`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n⚠️ Port ${PORT} sedang dipakai oleh aplikasi lain.`);
    console.error(`💡 Solusi: Tekan Ctrl+C di terminal yang lama, atau jalankan ulang.`);
  } else {
    console.error("Server error:", err);
  }
});
