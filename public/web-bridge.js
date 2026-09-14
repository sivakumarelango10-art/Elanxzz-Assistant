/**
 * JARVIS Web Bridge
 * Seamlessly polyfills the Electron `window.assistant` interface when running
 * in a web browser (such as on Vercel), while preserving native IPC on Desktop.
 */

(function () {
  if (typeof window === 'undefined') return;

  // If running inside Electron desktop, native preload.js already initialized window.assistant
  if (window.assistant) {
    console.log('[JARVIS Bridge] Running in native Electron Desktop mode.');
    return;
  }

  console.log('[JARVIS Bridge] Initializing Web Serverless Bridge for Vercel/Web...');

  window.isWebMode = true;

  // Synthesize a sci-fi reactor chime using Web Audio API for browser wake-up
  function playSyntheticWakeSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  }

  window.assistant = {
    // Wake Up UI
    wakeUp: () => {
      console.log('[JARVIS Web Bridge] wakeUp triggered.');
      playSyntheticWakeSound();
    },

    // Unified command handler for all actions
    runCommand: async (data) => {
      console.log('[JARVIS Web Bridge] runCommand:', data);

      if (data.action === 'web_search') {
        const query = encodeURIComponent(data.query || '');
        window.open(`https://www.google.com/search?q=${query}`, '_blank');
        return { success: true };
      }

      if (data.action === 'open_url') {
        let url = data.url || '';
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        window.open(url, '_blank');
        return { success: true };
      }

      if (data.action === 'set_timer') {
        const seconds = parseInt(data.duration_seconds, 10) || 60;
        const label = data.label || 'Timer';
        setTimeout(() => {
          const event = new CustomEvent('timer-done', { detail: label });
          window.dispatchEvent(event);
        }, seconds * 1000);
        return { success: true, message: `Timer set for ${seconds} seconds` };
      }

      return { success: false, error: 'Desktop system commands are only available in Electron.' };
    },

    // Groq Text-to-Speech
    groqTTS: async (text) => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ engine: 'groq', text })
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // Sarvam Text-to-Speech
    sarvamTTS: async (text) => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ engine: 'sarvam', text })
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // Groq Chat Completions
    groqChat: async (messages) => {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ engine: 'groq', messages })
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // Gemini Chat (Primary Persona)
    geminiChat: async (messages) => {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ engine: 'gemini', messages })
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // OpenRouter Chat (Gemma 4 + Reasoning)
    openRouterChat: async (payload) => {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ engine: 'openrouter', ...payload })
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // Speech-to-Text Fallbacks
    groqSTT: async () => ({ success: false, error: 'Browser uses native Web Speech recognition' }),
    sarvamSTT: async () => ({ success: false, error: 'Browser uses native Web Speech recognition' }),

    // Listen for timer completions
    onTimerDone: (callback) => {
      window.addEventListener('timer-done', (e) => callback(e.detail));
    },

    // Window controls
    minimizeWindow: () => console.log('[JARVIS] Minimize'),
    maximizeWindow: () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    },
    closeWindow: () => window.close(),

    // Permissions
    requestMicPermission: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        return true;
      } catch (e) {
        return false;
      }
    },

    // MCP / Web Tool Execution
    callTool: async (toolName, args) => {
      console.log(`[JARVIS Web Bridge] Tool execution: ${toolName}`, args);
      if (toolName === 'open_url' && args?.url) {
        let u = args.url.startsWith('http') ? args.url : 'https://' + args.url;
        window.open(u, '_blank');
        return { success: true, content: `Opened ${u}` };
      }
      if (toolName === 'search_web' && args?.query) {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(args.query)}`, '_blank');
        return { success: true, content: `Searched for ${args.query}` };
      }
      if (toolName === 'setup_workspace') {
        return { success: true, content: 'Developer workspace initialized on Web.' };
      }
      return { success: true, content: `Tool ${toolName} acknowledged.` };
    },

    // Protected Environment Variables
    getEnv: async () => null
  };

  // Interactive unlock for browser audio & wake-up
  document.addEventListener('DOMContentLoaded', () => {
    const arcCanvas = document.getElementById('arc-canvas');
    if (arcCanvas) {
      arcCanvas.style.cursor = 'pointer';
      arcCanvas.title = 'Click to activate JARVIS';
      arcCanvas.addEventListener('click', () => {
        playSyntheticWakeSound();
        if (typeof window.playIntroSequence === 'function') {
          window.playIntroSequence();
        }
      });
    }

    const statusPill = document.getElementById('status-pill');
    if (statusPill) {
      statusPill.style.cursor = 'pointer';
      statusPill.addEventListener('click', () => {
        playSyntheticWakeSound();
        if (typeof window.runStartupBriefing === 'function') {
          window.runStartupBriefing();
        }
      });
    }
  });
})();
