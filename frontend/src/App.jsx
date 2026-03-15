import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Cpu,
  Play,
  Square,
  RefreshCw,
  Activity,
  Download,
  Layout,
  Copy,
  AlignLeft,
  FileCode,
} from "lucide-react";
import CodeEditor from "./components/Editor";
import Platine from "./components/Platine";
import Console from "./components/Console";
import Oscilloscope from "./components/Oscilloscope";
import "./App.css";

// ─── Default code ─────────────────────────────────────────────────────────────
const INITIAL_CODE = `#include <xc.h>

void main(void) {
    // --- INITIALISATION ---
    TRISB = 0xFF; // Entrées
    TRISD = 0x00; // Sorties

    // --- BOUCLE PRINCIPALE ---
    while(1) {
        PORTD = PORTB; // Miroir
    }
}`;

const INITIAL_STATE = {
  PORTA: 0,
  PORTB: 0,
  PORTC: 0,
  PORTD: 0,
  PORTE: 0,
  ADRESH: 0,
  W: 0,
  STATUS: 0,
  BSR: 0,
  PCL: 0,
  LCD_LINE1: "",
  LCD_LINE2: "",
};

// ─── Example snippets ─────────────────────────────────────────────────────────
const EXAMPLES = {
  EMPTY:
    "// Nouveau projet\nvoid main(void) {\n    while(1) {\n        \n    }\n}",
  MIROIR:
    "// Miroir : PORTD suit PORTB\nvoid main(void) {\n    TRISB = 0xFF;\n    TRISD = 0x00;\n    while(1) {\n        PORTD = PORTB;\n    }\n}",
  CHENILLARD:
    "// Chenillard : rotation de bits\nvoid main(void) {\n    TRISD = 0x00;\n    unsigned char val = 1;\n    while(1) {\n        PORTD = val;\n        val = (val << 1) | (val >> 7);\n        __delay_ms(100);\n    }\n}",
  ADC_LCD:
    '// ADC vers LCD + LEDs\nvoid main(void) {\n    TRISD = 0x00;\n    while(1) {\n        unsigned char val = ADRESH;\n        PORTD = val;\n        if(val > 128) printf("SEUIL: %d", val);\n        else printf("VAL : %d", val);\n    }\n}',
  COUNTER:
    "// Compteur 7-segments\nvoid main(void) {\n    unsigned char i = 0;\n    TRISC = 0x00;\n    while(1) {\n        PORTC = seg(i);\n        i = (i + 1) % 16;\n        __delay_ms(500);\n    }\n}",
  COMPOUND:
    "// Test operateurs composes\nvoid main(void) {\n    TRISD = 0x00;\n    unsigned char x = 0;\n    while(1) {\n        x += 1;\n        PORTD = x;\n        __delay_ms(200);\n    }\n}",
  IF_ELSE:
    "// If / else-if / else\nvoid main(void) {\n    TRISB = 0xFF;\n    TRISD = 0x00;\n    while(1) {\n        unsigned char v = PORTB;\n        if(v == 0) PORTD = 0x00;\n        else if(v < 128) PORTD = 0x0F;\n        else PORTD = 0xFF;\n    }\n}",
  SWITCH:
    "// Switch / case\nvoid main(void) {\n    TRISB = 0xFF;\n    TRISD = 0x00;\n    TRISC = 0x00;\n    while(1) {\n        switch(PORTB & 0x03) {\n            case 0: PORTD = 0x01; break;\n            case 1: PORTD = 0x03; break;\n            case 2: PORTD = 0x0F; break;\n            default: PORTD = 0xFF; break;\n        }\n    }\n}",
};

// ─── Helper: download a file then revoke the blob URL ─────────────────────────
function triggerDownload(content, filename, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── WebSocket status badge ───────────────────────────────────────────────────
const WsStatusBadge = ({ status }) => {
  const cfg = {
    connecting: {
      dot: "bg-yellow-400 animate-pulse",
      text: "text-yellow-400",
      label: "CONNEXION…",
    },
    open: {
      dot: "bg-green-500  animate-pulse",
      text: "text-green-400",
      label: "CONNECTÉ",
    },
    closed: { dot: "bg-rose-500", text: "text-rose-400", label: "DÉCONNECTÉ" },
  };
  const { dot, text, label } = cfg[status] ?? cfg.connecting;
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 rounded-lg border border-white/5">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span
        className={`text-[8px] font-black tracking-widest uppercase ${text}`}
      >
        {label}
      </span>
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [code, setCode] = useState(INITIAL_CODE);
  const [state, setState] = useState(INITIAL_STATE);
  const [logs, setLogs] = useState([
    {
      type: "info",
      text: "IDE Initialisé. v3.0",
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [history, setHistory] = useState(Array(60).fill(0));
  const [ledColor, setLedColor] = useState("red");
  const [ws, setWs] = useState(null);
  const [wsStatus, setWsStatus] = useState("connecting");
  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [simSpeed, setSimSpeed] = useState(50);
  const [theme, setTheme] = useState("neon"); // neon | retro | slate
  const [showHelp, setShowHelp] = useState(false);
  const [layoutMode, setLayoutMode] = useState("ide"); // ide | simulator | fullscreen
  const [currentLine, setCurrentLine] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [stepCount, setStepCount] = useState(0);

  const fileInputRef = useRef(null);
  const wsRef = useRef(null); // always-current socket reference

  // Keep wsRef in sync
  useEffect(() => {
    wsRef.current = ws;
  }, [ws]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const addLog = useCallback(
    (type, text) =>
      setLogs((prev) => [
        ...prev,
        { type, text, time: new Date().toLocaleTimeString() },
      ]),
    [],
  );

  const sendWs = useCallback((payload) => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  // ── Refs for latest handler versions (avoids stale closures in shortcuts) ───
  const handleRunRef = useRef(null);
  const handleResetRef = useRef(null);
  const handleStepRef = useRef(null);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleRunRef.current?.();
      }
      if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        handleResetRef.current?.();
      }
      if (e.key === "F10") {
        e.preventDefault();
        handleStepRef.current?.();
      }
      if (e.key >= "0" && e.key <= "7") {
        const bit = parseInt(e.key);
        handleInputChange("PORTA", stateRef.current.PORTA | (1 << bit));
      }
    };
    const up = (e) => {
      if (e.key >= "0" && e.key <= "7") {
        const bit = parseInt(e.key);
        handleInputChange("PORTA", stateRef.current.PORTA & ~(1 << bit));
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── WebSocket setup with auto-reconnect ──────────────────────────────────────
  useEffect(() => {
    let socket = null;
    let retryTimer = null;
    let retryCount = 0;
    let unmounted = false;

    function connect() {
      if (unmounted) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      let host = window.location.host;
      if (
        (host.includes("localhost") || host.includes("127.0.0.1")) &&
        host.includes("5173")
      ) {
        host = host.replace("5173", "8000");
      }

      setWsStatus("connecting");
      socket = new WebSocket(`${protocol}//${host}/ws/simulate`);

      socket.onopen = () => {
        if (unmounted) return;
        retryCount = 0;
        setWsStatus("open");
        setWs(socket);
        wsRef.current = socket;
        addLog("success", "✓ Connexion WebSocket établie.");
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "LOG") {
            const isErr =
              data.message?.includes("⚠") ||
              data.message?.toLowerCase().includes("erreur");
            addLog(isErr ? "error" : "info", data.message);
          }
          if (data.type === "STATE") {
            setState(data.state);
            setHistory((prev) => [...prev.slice(1), data.state.PORTD ?? 0]);
            setStepCount((prev) => prev + 1);
          }
        } catch {
          addLog("error", "⚠ Message WebSocket invalide.");
        }
      };

      socket.onclose = () => {
        if (unmounted) return;
        setWsStatus("closed");
        setWs(null);
        wsRef.current = null;
        // Auto-reconnect with exponential backoff (max 10s)
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        retryCount++;
        addLog("error", `⚠ Connexion perdue. Reconnexion dans ${Math.round(delay / 1000)}s…`);
        retryTimer = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        // onclose will fire after this, triggering reconnect
        if (!unmounted) setWsStatus("closed");
      };
    }

    connect();

    return () => {
      unmounted = true;
      clearTimeout(retryTimer);
      if (socket) socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Resize divider ───────────────────────────────────────────────────────────
  const startResizing = useCallback(() => setIsDragging(true), []);
  const stopResizing = useCallback(() => setIsDragging(false), []);
  const onMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      if (pct > 20 && pct < 80) setLeftWidth(pct);
    },
    [isDragging],
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isDragging, onMouseMove, stopResizing]);

  // ── Simulation tick ──────────────────────────────────────────────────────────
  useEffect(() => {
    let interval;
    if (isSimulating) {
      interval = setInterval(() => sendWs({ type: "STEP" }), simSpeed);
    }
    return () => clearInterval(interval);
  }, [isSimulating, simSpeed, sendWs]);

  // ── LocalStorage persistence ─────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("simu-pic-code");
    if (saved) setCode(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("simu-pic-code", code);
  }, [code]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    if (!sendWs({ type: "COMPILE", code })) {
      addLog("error", "⚠ WebSocket non connecté.");
      return;
    }
    setIsCompiling(true);
    setStepCount(0);
    addLog("info", "→ Transmission du code…");
    setTimeout(() => {
      setIsCompiling(false);
      setIsSimulating(true);
    }, 600);
  }, [code, sendWs, addLog]);

  // Keep handler refs in sync for keyboard shortcuts
  useEffect(() => { handleRunRef.current = handleRun; }, [handleRun]);

  const handleStop = useCallback(() => setIsSimulating(false), []);

  const handleReset = useCallback(() => {
    setIsSimulating(false);
    setStepCount(0);
    setState(INITIAL_STATE);
    setHistory(Array(60).fill(0));
    addLog("info", "↺ Système réinitialisé.");
    sendWs({ type: "RESET" });
  }, [sendWs, addLog]);

  useEffect(() => { handleResetRef.current = handleReset; }, [handleReset]);

  const handleStep = useCallback(() => {
    sendWs({ type: "STEP" });
  }, [sendWs]);

  useEffect(() => { handleStepRef.current = handleStep; }, [handleStep]);

  const handleInputChange = useCallback(
    (reg, value) => {
      setState((prev) => ({ ...prev, [reg]: value & 0xff }));
      sendWs({ type: "INPUT", inputs: { [reg]: value & 0xff } });
    },
    [sendWs],
  );

  // Fix race condition: compile with freshly-read content, not stale state
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setCode(content);
      // Use content directly — don't rely on `code` state which hasn't updated yet
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "COMPILE", code: content }));
        setIsCompiling(true);
        setStepCount(0);
        setTimeout(() => {
          setIsCompiling(false);
          setIsSimulating(true);
        }, 600);
      }
      setLayoutMode("simulator");
      addLog("success", `✓ Fichier chargé : ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = ""; // allow re-upload of same file
  };

  const downloadCode = () => {
    triggerDownload(code, "main.c");
    addLog("success", "✓ Code téléchargé (main.c)");
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(code)
      .then(() => addLog("success", "✓ Code copié dans le presse-papier"));
  };

  const autoFormat = () => {
    let depth = 0;
    const formatted = code
      .split("\n")
      .map((raw) => {
        const line = raw.trim();
        if (line.startsWith("}")) depth = Math.max(0, depth - 1);
        const out = "    ".repeat(depth) + line;
        if (line.endsWith("{")) depth++;
        return out;
      })
      .join("\n");
    setCode(formatted);
    addLog("info", "⚡ Code formaté automatiquement.");
  };

  const downloadLogs = () => {
    const content = logs
      .map(
        (l) =>
          `[${l.time}] ${l.type === "error" ? "ERR: " : l.type === "success" ? "OK: " : ""}${l.text}`,
      )
      .join("\n");
    triggerDownload(
      content,
      `simu-pic-logs-${new Date().toISOString().slice(0, 10)}.txt`,
    );
    addLog("info", "→ Logs téléchargés.");
  };

  const loadExample = (id) => {
    if (id && EXAMPLES[id]) setCode(EXAMPLES[id]);
  };

  const clearConsole = () =>
    setLogs([
      {
        type: "info",
        text: "Console réinitialisée.",
        time: new Date().toLocaleTimeString(),
      },
    ]);

  // ── Theme ─────────────────────────────────────────────────────────────────────
  const themeBg =
    theme === "neon"
      ? "bg-[#050505] text-slate-300"
      : theme === "retro"
        ? "bg-[#1a1400] text-[#c8b96e]"
        : "bg-slate-900  text-slate-100";

  const headerBg = isSimulating
    ? "bg-green-500/5 border-green-500/20 shadow-[0_0_40px_rgba(34,197,94,0.08)]"
    : "bg-[#0a0a0a]/90 border-white/5 shadow-2xl";

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      className={`flex flex-col h-screen font-sans overflow-hidden select-none fixed inset-0 transition-colors duration-700 ${themeBg}`}
    >
      {/* ══ HEADER ══════════════════════════════════════════════════════════════ */}
      <header
        className={`h-14 flex items-center justify-between px-6 border-b transition-all duration-500 backdrop-blur-xl z-20 flex-shrink-0 ${headerBg}`}
      >
        {/* Left: branding + tools */}
        <div className="flex items-center gap-4">
          <div
            className={`p-2 rounded-xl transition-all duration-500 ${isSimulating ? "bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-indigo-600/20 text-indigo-400"}`}
          >
            <Cpu size={20} className={isSimulating ? "animate-pulse" : ""} />
          </div>

          <div className="flex flex-col leading-none">
            <span className="font-black tracking-[0.2em] text-[11px] uppercase text-white/90">
              SIMU-PIC PRO
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[8px] text-white/20 font-mono">
                v3.0 · {simSpeed}ms/tick
              </span>
              {isSimulating && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">
                  <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[8px] text-green-400 font-black uppercase">
                    Running
                  </span>
                </div>
              )}
              {stepCount > 0 && (
                <span className="text-[8px] font-mono text-white/20 tabular-nums">
                  #{stepCount.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div className="w-px h-8 bg-white/5 mx-1" />

          {/* Snippet picker */}
          <select
            onChange={(e) => loadExample(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-black tracking-widest text-indigo-400 uppercase outline-none hover:bg-white/10 transition-all cursor-pointer"
          >
            <option value="">📦 Exemples</option>
            <option value="MIROIR">Miroir (PORTB→PORTD)</option>
            <option value="CHENILLARD">Chenillard</option>
            <option value="ADC_LCD">ADC → LCD</option>
            <option value="COUNTER">Compteur 7-seg</option>
            <option value="COMPOUND">Opérateurs += |= …</option>
            <option value="IF_ELSE">If / else-if / else</option>
            <option value="SWITCH">Switch / case</option>
            <option value="EMPTY">Nouveau projet</option>
          </select>

          {/* Code tools */}
          <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-lg border border-white/5">
            <button
              onClick={copyToClipboard}
              title="Copier le code"
              className="p-1.5 hover:bg-white/10 rounded text-white/30 hover:text-white transition-all"
            >
              <Copy size={13} />
            </button>
            <button
              onClick={downloadCode}
              title="Télécharger .c"
              className="p-1.5 hover:bg-white/10 rounded text-white/30 hover:text-white transition-all"
            >
              <Download size={13} />
            </button>
            <button
              onClick={autoFormat}
              title="Auto-formater"
              className="p-1.5 hover:bg-white/10 rounded text-white/30 hover:text-white transition-all"
            >
              <AlignLeft size={13} />
            </button>
            <button
              onClick={downloadLogs}
              title="Télécharger les logs"
              className="p-1.5 hover:bg-white/10 rounded text-white/30 hover:text-white transition-all"
            >
              <FileCode size={13} />
            </button>
          </div>
        </div>

        {/* Right: status, mode, speed, colour, run */}
        <div className="flex items-center gap-3">
          <WsStatusBadge status={wsStatus} />

          {/* Layout mode */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
            {["ide", "simulator", "fullscreen"].map((m) => (
              <button
                key={m}
                onClick={() => setLayoutMode(m)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all ${
                  layoutMode === m
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-white/30 hover:text-white"
                }`}
              >
                {m === "ide"
                  ? "IDE"
                  : m === "simulator"
                    ? "SIMULATEUR"
                    : "FULLSCREEN"}
              </button>
            ))}
          </div>

          {/* Speed */}
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex justify-between w-full">
              <span className="text-[7px] text-white/20 font-black uppercase">
                Speed
              </span>
              <span className="text-[7px] text-indigo-400 font-mono">
                {simSpeed}ms
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={simSpeed}
              onChange={(e) => setSimSpeed(parseInt(e.target.value))}
              className="w-20 accent-indigo-500 h-1 cursor-pointer"
            />
          </div>

          {/* LED colour */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1.5 px-2 rounded-lg border border-white/5">
            {["red", "green", "blue"].map((c) => (
              <button
                key={c}
                onClick={() => setLedColor(c)}
                className={`w-3 h-3 rounded-full transition-all ${
                  c === "red"
                    ? "bg-red-500"
                    : c === "green"
                      ? "bg-emerald-500"
                      : "bg-blue-500"
                } ${ledColor === c ? "ring-2 ring-white scale-125" : "opacity-30 hover:opacity-70"}`}
              />
            ))}
          </div>

          {/* Theme */}
          <button
            onClick={() =>
              setTheme((t) =>
                t === "neon" ? "retro" : t === "retro" ? "slate" : "neon",
              )
            }
            className="px-2 py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black text-indigo-400 hover:bg-white/10 transition-all"
          >
            {theme.toUpperCase()}
          </button>

          {/* Help */}
          <button
            onClick={() => setShowHelp(true)}
            className="px-2 py-1 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30 text-[9px] font-black hover:bg-indigo-600/40 transition-all"
          >
            AIDE
          </button>

          {/* Reset + Step */}
          <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5">
            <button
              onClick={handleReset}
              title="Réinitialiser (Ctrl+R)"
              className="p-1.5 px-3 hover:bg-white/10 rounded-lg text-white/30 hover:text-indigo-400 transition-all"
            >
              <RefreshCw
                size={14}
                className={isCompiling ? "animate-spin" : ""}
              />
            </button>
            <div className="w-px h-5 bg-white/10" />
            <button
              onClick={handleStep}
              disabled={isSimulating}
              title="Pas à pas (F10)"
              className={`p-1.5 px-3 rounded-lg transition-all ${isSimulating ? "opacity-20 cursor-not-allowed" : "hover:bg-white/10 text-white/30 hover:text-amber-400"}`}
            >
              <Activity size={14} />
            </button>
          </div>

          {/* Run / Stop */}
          <button
            onClick={isSimulating ? handleStop : handleRun}
            disabled={isCompiling}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-[10px] tracking-widest transition-all ${
              isCompiling
                ? "bg-white/5 text-white/30 cursor-not-allowed"
                : isSimulating
                  ? "bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/30"
                  : "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500"
            }`}
          >
            {isCompiling ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>BOOT…</span>
              </>
            ) : isSimulating ? (
              <>
                <Square size={14} fill="currentColor" />
                <span>STOP</span>
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" />
                <span>RUN</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ══ MAIN CONTENT ════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ── FULLSCREEN ─────────────────────────────────────────────────────── */}
        {layoutMode === "fullscreen" ? (
          <div className="flex-1 flex items-center justify-center bg-[radial-gradient(circle_at_center,_#0a1a0f_0%,_#050505_100%)]">
            <Platine
              state={state}
              onInputChange={handleInputChange}
              ledColor={ledColor}
              fullscreen
            />
            <button
              onClick={() => setLayoutMode("ide")}
              title="Retour IDE"
              className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 backdrop-blur-xl z-50 transition-all hover:scale-110"
            >
              <Layout size={16} />
            </button>
          </div>
        ) : (
          <>
            {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
            <div
              style={{ width: `${leftWidth}%` }}
              className="flex flex-col border-r border-white/5 bg-[#0a0a0a] overflow-hidden"
            >
              {layoutMode === "ide" ? (
                /* IDE: editor top, console bottom */
                <>
                  <div className="flex-1 overflow-hidden">
                    <CodeEditor
                      code={code}
                      onChange={setCode}
                      disabled={isSimulating}
                      currentLine={currentLine}
                    />
                  </div>
                  <Console logs={logs} onClear={clearConsole} />
                </>
              ) : (
                /* SIMULATOR: board + console */
                <div className="flex-1 flex flex-col overflow-hidden bg-[radial-gradient(circle_at_center,_#0a1a0f_0%,_#050505_100%)]">
                  <div className="px-6 py-3 border-b border-white/5 flex justify-between items-center flex-shrink-0">
                    <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">
                      🔌 Platine Interactive — Mode Simulateur
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleReset}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-indigo-400 transition-all"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        onClick={handleStep}
                        disabled={isSimulating}
                        className={`p-1.5 rounded-lg transition-all ${isSimulating ? "opacity-20" : "hover:bg-white/5 text-amber-400"}`}
                      >
                        <Activity size={14} />
                      </button>
                      <button
                        onClick={isSimulating ? handleStop : handleRun}
                        className={`px-4 py-1.5 rounded-lg text-white font-black text-[10px] transition-all ${isSimulating ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"}`}
                      >
                        {isSimulating ? "STOP" : "RUN"}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                    <Platine
                      state={state}
                      onInputChange={handleInputChange}
                      ledColor={ledColor}
                      fullscreen={false}
                    />
                  </div>
                  <div className="h-48 border-t border-white/5 flex-shrink-0">
                    <Console logs={logs} onClear={clearConsole} />
                  </div>
                </div>
              )}
            </div>

            {/* ── RESIZE HANDLE ───────────────────────────────────────────────── */}
            <div
              onMouseDown={startResizing}
              className={`w-1 flex-shrink-0 cursor-col-resize group relative z-10 ${isDragging ? "bg-indigo-500/60" : "bg-white/5 hover:bg-indigo-500/40"} transition-colors`}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>

            {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
            <div
              style={{ width: `${100 - leftWidth}%` }}
              className="flex flex-col bg-[#050505] overflow-hidden"
            >
              {layoutMode === "ide" ? (
                /* IDE: platine top, oscilloscope bottom */
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 py-2 bg-white/5 border-b border-white/5 text-[9px] text-white/30 font-black uppercase tracking-[0.2em] flex justify-between items-center flex-shrink-0">
                    <span>🔌 Platine — GEII Lyon 1</span>
                    <span className="text-white/15 font-mono tabular-nums">
                      PORTD: 0x
                      {(state.PORTD ?? 0)
                        .toString(16)
                        .toUpperCase()
                        .padStart(2, "0")}
                    </span>
                  </div>
                  {/* Board */}
                  <div className="flex-1 overflow-auto flex items-center justify-center bg-[radial-gradient(circle_at_center,_#0a1a0f_0%,_#050505_100%)] min-h-0">
                    <Platine
                      state={state}
                      onInputChange={handleInputChange}
                      ledColor={ledColor}
                      fullscreen={false}
                    />
                  </div>
                  {/* Oscilloscope */}
                  <div className="h-36 flex-shrink-0 border-t border-white/5 p-2">
                    <Oscilloscope history={history} />
                  </div>
                </div>
              ) : (
                /* SIMULATOR: read-only code view + file loader */
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 py-3 bg-[#0a0a0a] border-b border-white/5 flex justify-between items-center flex-shrink-0">
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                      📄 {uploadedFileName || "main.c"}
                      <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[7px]">
                        lecture seule
                      </span>
                    </span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all"
                    >
                      <Download size={13} className="rotate-180" />
                      <span>CHARGER .C</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".c"
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <CodeEditor
                      code={code}
                      onChange={setCode}
                      readOnly
                      currentLine={currentLine}
                    />
                  </div>
                  {/* Oscilloscope below read-only editor */}
                  <div className="h-36 flex-shrink-0 border-t border-white/5 p-2">
                    <Oscilloscope history={history} />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ══ HELP MODAL ══════════════════════════════════════════════════════════ */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="max-w-2xl w-full bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-black tracking-tighter text-indigo-400">
                GUIDE DE LA PLATINE
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-white/20 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-6">
              {/* Hardware map */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">
                  Mappage Matériel
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  {[
                    ["PORTB", "8× Interrupteurs DIP"],
                    ["PORTA", "8× Boutons RA0–RA7"],
                    ["PORTD", "8× LEDs sortie"],
                    ["PORTC", "7-Seg A + Buzzer (bit 7)"],
                    ["PORTE", "7-Seg B"],
                    ["ADRESH", "ADC (potentiomètre)"],
                  ].map(([reg, desc]) => (
                    <div key={reg} className="flex justify-between">
                      <span className="text-indigo-400">{reg}</span>
                      <span className="text-white/50">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code tips */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">
                  Astuces de Code
                </h3>
                <div className="space-y-2">
                  {[
                    [
                      "text-emerald-400",
                      "PORTC = seg(i);",
                      "Affiche i sur le 7-segments",
                    ],
                    [
                      "text-amber-400",
                      "if(RA0) PORTD = 0xFF;",
                      "Lit un bouton poussoir",
                    ],
                    [
                      "text-sky-400",
                      "x += 1; x |= 0x80;",
                      "Opérateurs composés supportés",
                    ],
                    [
                      "text-purple-400",
                      'printf("Val:%d", val);',
                      "Affiche sur le LCD",
                    ],
                  ].map(([color, code, note]) => (
                    <div
                      key={code}
                      className="p-2.5 bg-white/5 rounded-xl border border-white/5"
                    >
                      <code className={`${color} text-[11px] font-bold`}>
                        {code}
                      </code>
                      <p className="text-[9px] text-white/30 mt-0.5 italic">
                        {note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Keyboard shortcuts */}
            <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-2xl">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-3">
                Raccourcis Clavier
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-white/50">
                {[
                  ["Ctrl + Entrée", "Compiler & Run"],
                  ["Ctrl + R", "Réinitialiser"],
                  ["F10", "Pas à pas (step)"],
                  ["Touches 0–7", "Appuyer sur RA0–RA7"],
                ].map(([key, action]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-white/70">
                      {key}
                    </span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
