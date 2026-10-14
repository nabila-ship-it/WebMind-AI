# 🧠 WebMind AI — Smart Web Assistant (Chrome Extension)

> **Asisten AI Cerdas untuk Memahami Konten Web Langsung dari Google Chrome**  
> Proyek Tugas Mata Kuliah: **Pemrograman Web (Semester 5)**  
> Pengembang: **Nabila**

---

## 📌 Ringkasan Proyek
**WebMind AI** adalah ekstensi Google Chrome modern berbasis **Manifest V3** yang mengintegrasikan kemampuan **Large Language Model (Google Gemini API)** untuk membantu pengguna memahami, menganalisis, merangkum, dan menerjemahkan isi artikel website atau dokumen akademik tanpa harus berpindah ke aplikasi chatbot lain.

---

## ✨ Fitur Utama (MVP v1.0)
1. **📄 Ringkas Halaman (Summarize)**
   - Mengekstrak teks utama artikel web secara otomatis.
   - Menghasilkan ringkasan terstruktur: *Ringkasan Singkat (TL;DR)*, *Poin-Poin Kunci*, dan *Kesimpulan*.
2. **💬 Tanya AI (Contextual Q&A)**
   - Pengguna dapat bertanya seputar isi artikel dengan bahasa alami.
   - Dilengkapi *Quick Prompt Chips* (contoh: *"Jelaskan dengan bahasa sederhana"*, *"Apa kesimpulan utamanya?"*).
3. **🌐 Terjemahkan Teks (Translation)**
   - Menerjemahkan konten halaman atau teks terpilih ke Bahasa Indonesia atau Bahasa Inggris secara kontekstual.
4. **📋 Mode Tempel Teks Manual & Dokumen PDF**
   - Mendukung analisis teks dari dokumen PDF yang dibuka di Chrome (*sandbox-safe*).
   - Dilengkapi tombol *Tempel Otomatis dari Clipboard*.
5. **⚡ Salin Hasil Instan**
   - Menyalin output AI dalam format Markdown yang rapi dengan satu klik.

---

## 🛠️ Arsitektur & Teknologi

| Bagian | Teknologi | Keterangan |
|---|---|---|
| **Extension UI** | React 18, Vite | Antarmuka interaktif popup Chrome |
| **Styling** | Tailwind CSS | Desain modern, dark mode & glassmorphism |
| **Spesifikasi Extension** | Chrome Manifest V3 | Format ekstensi resmi Chrome terbaru |
| **Backend** | Vercel Serverless Functions | REST API endpoint `/api/ai` berbasis Node.js |
| **AI Engine** | Google Gemini API (`gemini-3.5-flash-lite`) | Pemrosesan LLM berkecepatan tinggi & akurat |
| **Deployment** | Vercel (Backend) & GitHub | Cloud hosting serverless & version control |

---

## 📁 Struktur Direktori
```text
WebMind-AI/
├── backend/                  # Serverless API untuk Vercel & pengujian lokal
│   ├── api/
│   │   └── ai.js             # Handler Serverless Function (/api/ai)
│   ├── server.js             # Runner Express lokal untuk pengujian offline
│   ├── package.json
│   ├── vercel.json           # Konfigurasi routing & CORS Vercel
│   ├── .env.example          # Contoh variabel lingkungan
│   └── .env                  # API Key (rahasia, tidak di-push ke git)
├── extension/                # Kode sumber Chrome Extension
│   ├── public/
│   │   ├── manifest.json     # Manifest V3 Chrome Extension
│   │   ├── content.js        # Content script ekstraksi teks halaman
│   │   └── icons/            # Ikon ekstensi (16x16, 48x48, 128x128)
│   ├── src/
│   │   ├── App.jsx           # Komponen utama antarmuka popup
│   │   ├── api.js            # Modul komunikasi ke backend Vercel
│   │   ├── main.jsx          # Entry point React
│   │   ├── index.css         # Styling global Tailwind CSS
│   │   └── styles.css
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

---

## 🚀 Panduan Menjalankan Proyek Secara Lokal

### 1. Prasyarat
- **Node.js** (v18 atau lebih baru)
- **Google Chrome** browser
- **Google Gemini API Key** (Dapatkan gratis di [Google AI Studio](https://aistudio.google.com/app/apikey))

### 2. Menjalankan Backend Lokal
```bash
# Masuk ke folder backend
cd backend

# Install dependensi
npm install

# Salin file environment dan masukkan API Key Gemini Anda
cp .env.example .env

# Jalankan server pengembangan lokal
npm run dev
```
Server akan aktif di: `http://localhost:3000`  
Endpoint API: `http://localhost:3000/api/ai`  
Health Check: `http://localhost:3000/api/health`

### 3. Membangun Extension
Buka terminal baru di root proyek:
```bash
# Masuk ke folder extension
cd extension

# Install dependensi
npm install

# Build untuk Chrome Extension
npm run build
```
Hasil build siap pakai akan tersimpan di dalam folder `extension/dist/`.

### 4. Memasang Extension ke Google Chrome
1. Buka browser **Google Chrome**.
2. Masuk ke halaman `chrome://extensions/`.
3. Aktifkan **Developer mode** di pojok kanan atas.
4. Klik tombol **Load unpacked** di pojok kiri atas.
5. Pilih folder: `WebMind-AI/extension/dist`.
6. Ikon **WebMind AI** siap digunakan di toolbar Chrome!

---

## 🌐 Panduan Deployment Backend ke Vercel

Deployment backend ke Vercel memungkinkan ekstensi dapat digunakan dari mana saja tanpa perlu menjalankan server di laptop secara lokal.

1. Buka **[Vercel Dashboard](https://vercel.com/)** dan login dengan akun GitHub Anda.
2. Klik tombol **"Add New..."** ➡️ **"Project"**.
3. Pilih repository GitHub: `nabila-ship-it/WebMind-AI`.
4. Pada bagian konfigurasi proyek Vercel:
   - **Root Directory**: Klik *Edit*, lalu pilih folder `backend`. **(Sangat Penting!)**
   - **Framework Preset**: Pilih *Other*.
5. Di bagian **Environment Variables**, tambahkan:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: *(Masukkan API Key Google Gemini Anda)*
   - **Key**: `GEMINI_MODEL` *(opsional)*
   - **Value**: `gemini-3.5-flash-lite`
6. Klik tombol **"Deploy"**.
7. Setelah selesai, Vercel akan memberikan domain aktif (contoh: `https://webmind-ai-backend.vercel.app`).
8. Buka ekstensi WebMind AI di Chrome, klik ikon **Pengaturan (Gear)** di kanan atas popup, lalu ubah URL Backend menjadi:
   ```text
   https://webmind-ai-backend.vercel.app/api/ai
   ```
   Klik **Simpan Perubahan** dan uji koneksi!

---

## 🎓 Skenario Pengujian & Demo untuk Dosen
1. **Uji Dokumen Akademik (Jurnal Ilmiah):**
   - Buka artikel jurnal di web (contoh: di Semantic Scholar, Neliti, atau portal berita).
   - Klik ekstensi WebMind AI ➡️ klik **"Ringkas Halaman"**.
   - Tunjukkan bagaimana AI merangkum artikel panjang menjadi 3 bagian terstruktur dalam hitungan detik.
2. **Uji Dokumen PDF:**
   - Buka file PDF jurnal.
   - Blok paragraf penting, tekan `Ctrl+C`.
   - Buka WebMind AI, klik **"Tempel Otomatis"**, lalu klik **"Ringkas Teks Tempelan"**.
3. **Uji Tanya AI:**
   - Ajukan pertanyaan spesifik: *"Metode apa yang digunakan dalam penelitian ini?"*.
4. **Uji Keamanan API Key:**
   - Jelaskan kepada dosen bahwa API Key tersimpan aman di serverless backend Vercel dan tidak terpapar pada kode sumber ekstensi Chrome di sisi klien.

---

## 📄 Lisensi
Proyek ini dibuat untuk keperluan akademik mata kuliah Pemrograman Web — Program Studi Informatika / Sistem Informasi.
Hak cipta dilindungi undang-undang © 2026 Nabila.
