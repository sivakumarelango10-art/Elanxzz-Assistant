# JARVIS — Advanced AI Virtual Assistant

JARVIS is a futuristic, highly capable virtual assistant created by **Elango**. Built with a modern dual-mode architecture, JARVIS operates seamlessly both as a **Desktop Application** (Electron + Python MCP) and as a **Cloud Web Application** (Vercel Serverless + Web Audio HUD).

Featuring a stunning "Stark Industries" HUD interface, JARVIS leverages a multi-LLM routing pipeline (Gemini 3.8 Flash, Groq, OpenRouter) and voice synthesis engines (Sarvam Bulbul v3, Groq Orpheus, Web Speech).

---

## 🚀 System Architecture

### 1. Dual Deployment Modes
- **Web App (Vercel)**: Deployed serverlessly on Vercel with zero client-side API key leakage. Browser client communicates via secure `/api/chat` and `/api/tts` serverless endpoints.
- **Desktop App (Electron)**: Native cross-platform desktop client (Windows & macOS) with deep OS-level integration and Python FastMCP tools.

### 2. Frontend (Stark Industries HUD)
- **Visuals**: Futuristic Stark Industries HUD with real-time audio visualizers (Arc Reactor), system telemetry graphs, and reactive scanlines.
- **Speech Stack**:
  - **STT (Speech-to-Text)**: Vosk (offline package), Web Speech API, Groq Whisper, and Sarvam.
  - **TTS (Text-to-Speech)**: Sarvam Bulbul v3 (natural Indian English/multilingual), Groq Orpheus, and Web Speech synthesis fallback.
- **Interaction**: Clap / tap to wake, reactive voice interruption (barge-in support), and continuous conversation memory.

### 3. Intelligence Pipeline
- **Gemini 3.8 Flash**: Primary conversational engine for ultra-fast, intelligent persona responses.
- **Groq**: Sub-500ms intent classification, tool routing, and key rotation pool.
- **OpenRouter (Gemma 4)**: Fallback engine and advanced reasoning specialist.

---

## ☁️ Deploying to Vercel

JARVIS is pre-configured for one-click deployment on Vercel:

1. **Push to GitHub**:
   Push the repository to your GitHub account (secrets in `.env` are automatically ignored).

2. **Import into Vercel**:
   - Go to [vercel.com](https://vercel.com) and import the repository.
   - Framework Preset: **Other** (configured automatically by `vercel.json`).
   - Build Command: `npm run build` (pre-configured to exit with 0 errors).

3. **Configure Environment Variables in Vercel**:
   In your Vercel Project Settings under **Environment Variables**, add:
   - `GEMINI_API_KEY` — Your Google Gemini API Key
   - `GROQ_API_KEY` — Your Groq API Key (Primary)
   - `GROQ_API_KEY_2` — (Optional) Groq rotation key
   - `GROQ_API_KEY_3` — (Optional) Groq rotation key
   - `SARVAM_API_KEY` — Your Sarvam AI API Key
   - `OPENROUTER_API_KEY` — Your OpenRouter API Key
   - `GEMINI_MODEL` — `gemini-3.8-flash` (Optional, defaults to 3.8 Flash)

4. **Deploy**:
   Click **Deploy**. Once built, open the URL and click the Arc Reactor to activate JARVIS!

---

## 💻 Local Desktop Setup (Electron)

### Prerequisites
- Node.js (v18+)
- Python 3.10+ (for MCP tools)

### 1. Install Dependencies
```bash
# Install Node dependencies
npm install

# (Optional) Install Python MCP dependencies
pip install fastmcp psutil feedparser requests beautifulsoup4
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in your keys:
```env
SARVAM_API_KEY=your_sarvam_api_key
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.8-flash
OPENROUTER_API_KEY=your_openrouter_api_key
```

### 3. Run Locally
```bash
# Run Electron Desktop App
npm start

# Test Web Build
npm run build
```

### 4. Package Desktop App
```bash
npm run build:electron
```

---

## 👨‍💻 Created By
**Elango** — Tech Creator & Full-Stack Developer.  
*Building interfaces that feel like the future.*
