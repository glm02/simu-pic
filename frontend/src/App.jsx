import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, Play, Square, RefreshCw, Activity, Download, Layout } from 'lucide-react';
import CodeEditor from './components/Editor';
import Platine from './components/Platine';
import Console from './components/Console';
import FloatingMemo from './components/FloatingMemo';

const INITIAL_CODE = `#include <xc.h>

void main(void) {
    // --- INITIALISATION ---
    TRISB = 0xFF; // Entrées
    TRISD = 0x00; // Sorties
    
    // --- BOUCLE ---
    while(1) {
        PORTD = PORTB; // Miroir
    }
}`;

const INITIAL_STATE = {
  PORTA: 0, PORTB: 0, PORTC: 0, PORTD: 0, PORTE: 0
};

function App() {
  const [code, setCode] = useState(INITIAL_CODE);
  const [state, setState] = useState(INITIAL_STATE);
  const [logs, setLogs] = useState([{ type: 'info', text: "IDE Initialisé. v2.5", time: new Date().toLocaleTimeString() }]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [history, setHistory] = useState(Array(60).fill(0));
  const [ledColor, setLedColor] = useState('red');
  const [isBoardFullscreen, setIsBoardFullscreen] = useState(false);
  const [ws, setWs] = useState(null);
  const [leftWidth, setLeftWidth] = useState(45);
  const [isDragging, setIsDragging] = useState(false);
  const [simSpeed, setSimSpeed] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [theme, setTheme] = useState('neon'); // neon | retro | slate
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        handleReset();
      }
      if (e.key === 'F10') {
        e.preventDefault();
        handleStep();
      }
      // Feature 13: Keyboard 0-7 -> PORTA Buttons
      if (e.key >= '0' && e.key <= '7') {
         const bit = parseInt(e.key);
         handleInputChange("PORTA", state.PORTA | (1 << bit));
      }
    };
    const handleKeyUp = (e) => {
      if (e.key >= '0' && e.key <= '7') {
         const bit = parseInt(e.key);
         handleInputChange("PORTA", state.PORTA & ~(1 << bit));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [code, ws, isSimulating, state.PORTA]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Smarter host detection for WebSocket
    let host = window.location.host;
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        // In local dev, if on 5173 (Vite), target 8000 (FastAPI), otherwise stay on same port
        if (host.includes('5173')) host = host.replace('5173', '8000');
    }
    // Note: On Railway/Production, host will be 'xxx.up.railway.app' 
    // and we should NOT append :8000 because Railway's proxy handles it.

    const socket = new WebSocket(`${protocol}//${host}/ws/simulate`);
    
    socket.onopen = () => setLogs(prev => [...prev, { type: 'success', text: "✓ Connexion établie.", time: new Date().toLocaleTimeString() }]);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "LOG") setLogs(prev => [...prev, { type: 'info', text: data.message, time: new Date().toLocaleTimeString() }]);
      if (data.type === "STATE") {
        setState(data.state);
        setHistory(prev => [...prev.slice(1), data.state.PORTD]);
      }
    };
    socket.onclose = () => setLogs(prev => [...prev, { type: 'error', text: "⚠ Connexion perdue.", time: new Date().toLocaleTimeString() }]);
    
    setWs(socket);
    return () => socket.close();
  }, []);

  // Handle Resize Logic
  const startResizing = useCallback(() => setIsDragging(true), []);
  const stopResizing = useCallback(() => setIsDragging(false), []);
  const onMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth > 15 && newWidth < 85) setLeftWidth(newWidth);
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isDragging, onMouseMove, stopResizing]);

  // Simulation Tick
  useEffect(() => {
    let interval;
    if (isSimulating && ws && ws.readyState === WebSocket.OPEN) {
      interval = setInterval(() => {
        ws.send(JSON.stringify({ type: "STEP" }));
      }, simSpeed); // Adjustable speed
    }
    return () => clearInterval(interval);
  }, [isSimulating, ws, simSpeed]);

  // Feature 8: LocalStorage persistence
  useEffect(() => {
    const saved = localStorage.getItem('simu-pic-code');
    if (saved) setCode(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('simu-pic-code', code);
  }, [code]);

  const handleRun = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      setIsCompiling(true);
      setLogs(prev => [...prev, { type: 'info', text: "→ Transmission du code...", time: new Date().toLocaleTimeString() }]);
      ws.send(JSON.stringify({ type: "COMPILE", code }));
      setTimeout(() => {
        setIsCompiling(false);
        setIsSimulating(true);
      }, 600);
    }
  };

  const handleStop = () => setIsSimulating(false);
  
  const handleReset = () => {
    setIsSimulating(false);
    setState(INITIAL_STATE);
    setLogs(prev => [...prev, { type: 'info', text: "↺ Système réinitialisé.", time: new Date().toLocaleTimeString() }]);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "COMPILE", code }));
    }
  };

  const handleStep = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "STEP" }));
    }
  };

  const handleADCClick = (e) => {
    const val = parseInt(e.target.value);
    setState(prev => ({ ...prev, ADRESH: val }));
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "INPUT", inputs: { ADRESH: val } }));
    }
  };

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `main.c`;
    a.click();
    setLogs(prev => [...prev, { type: 'success', text: "✓ Code téléchargé (main.c)", time: new Date().toLocaleTimeString() }]);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setLogs(prev => [...prev, { type: 'success', text: "✓ Code copié dans le presse-papier", time: new Date().toLocaleTimeString() }]);
  };

  const autoFormat = () => {
    const lines = code.split('\n');
    let depth = 0;
    const formatted = lines.map(line => {
      line = line.trim();
      if (line.includes('}')) depth--;
      const out = '    '.repeat(Math.max(0, depth)) + line;
      if (line.includes('{')) depth++;
      return out;
    }).join('\n');
    setCode(formatted);
    setLogs(prev => [...prev, { type: 'info', text: "⚡ Code formaté automatiquement.", time: new Date().toLocaleTimeString() }]);
  };

  const downloadLogs = () => {
    const content = logs.map(l => `[${l.time}] ${l.type === 'error' ? 'ERR: ' : l.type === 'success' ? 'OK: ' : ''}${l.text}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simu-pic-logs-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
  };

  const EXAMPLES = {
    "EMPTY": "// Nouveau projet\nvoid main(void) {\n    while(1) {\n        \n    }\n}",
    "MIROIR": "// Miroir: PORTD suit PORTB\nvoid main(void) {\n    TRISB = 0xFF; // Entrées\n    TRISD = 0x00; // Sorties\n    while(1) {\n        PORTD = PORTB;\n    }\n}",
    "CHENILLARD": "// Chenillard: Rotation de bits\nvoid main(void) {\n    TRISD = 0x00;\n    unsigned char val = 1;\n    while(1) {\n        PORTD = val;\n        val = (val << 1) | (val >> 7);\n        __delay_ms(100);\n    }\n}",
    "ADC_LCD": "// ADC vers LCD\nvoid main(void) {\n    while(1) {\n        unsigned char val = ADRESH;\n        PORTD = val;\n        if(val > 128) printf(\"SEUIL ATTEINT\");\n        else printf(\"VAL: %d\", val);\n    }\n}",
    "COUNTER": "// Compteur 7-seg\nvoid main(void) {\n    unsigned char i = 0;\n    while(1) {\n        PORTC = seg(i);\n        i = (i + 1) % 10;\n        __delay_ms(500);\n    }\n}",
    "INTERRUPT": "// Demo: Simulation Interruption\nvoid main(void) {\n    TRISB = 0xFF;\n    while(1) {\n       if(RA0) PORTD = 0xFF;\n       else PORTD = 0x00;\n    }\n}"
  };

  const loadExample = (id) => {
    setCode(EXAMPLES[id]);
  };

  const handleInputChange = (reg, value) => {
    const newState = { ...state, [reg]: value };
    setState(newState);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "INPUT", inputs: { [reg]: value } }));
    }
  };

  return (
    <div className={`flex flex-col h-screen font-sans overflow-hidden select-none animate-hardware-boot transition-colors duration-1000 fixed inset-0 ${
      theme === 'neon' ? 'bg-[#050505] text-slate-300' : 
      theme === 'retro' ? 'bg-[#1a1a00] text-[#8fbc8f]' : 
      'bg-slate-900 text-slate-100'
    }`}>
      {/* Header */}
      <div className={`h-14 flex items-center justify-between px-8 border-b transition-all duration-500 backdrop-blur-xl z-20 ${
        isSimulating ? 'bg-green-500/5 border-green-500/20 shadow-[0_0_40px_rgba(34,197,94,0.1)]' : 'bg-[#0a0a0a]/80 border-white/5 shadow-2xl'
      }`}>
        <div className="flex items-center space-x-5">
          <div className={`p-2.5 rounded-xl transition-all duration-500 ${isSimulating ? 'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-indigo-600/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]'}`}>
            <Cpu size={22} className={isSimulating ? 'animate-pulse' : ''} />
          </div>
          <div className="flex flex-col">
            <span className="font-black tracking-[0.2em] text-xs uppercase text-white/90">SIMU-PIC PRO</span>
            <div className="flex items-center space-x-2 mt-0.5">
               <span className="text-[9px] text-white/20 font-mono tracking-tighter">ENV: v2.5 | TICK: {simSpeed}ms | SRC: RAFAEL_GEII</span>
               {isSimulating && (
                 <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">
                    <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-[8px] text-green-400 font-bold uppercase tracking-widest">Running</span>
                 </div>
               )}
            </div>
          </div>

          <div className="h-8 w-px bg-white/5 mx-4"></div>

          <select 
            onChange={(e) => loadExample(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] font-black tracking-widest text-indigo-400 uppercase outline-none hover:bg-white/10 transition-all"
          >
            <option value="EMPTY">Snippets Library</option>
            <option value="MIROIR">Mirror (PORTB)</option>
            <option value="CHENILLARD">Caterpillar (PORTD)</option>
            <option value="ADC_LCD">Logic: ADC/LCD</option>
            <option value="COUNTER">Counter: 7-seg</option>
            <option value="INTERRUPT">Interrupt Logic</option>
          </select>

          <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-lg border border-white/5">
             <button onClick={copyToClipboard} title="Copy Code" className="p-1 px-2 hover:bg-white/10 rounded transition-all text-white/30 hover:text-white"><Cpu size={14} /></button>
             <button onClick={downloadCode} title="Download .c" className="p-1 px-2 hover:bg-white/10 rounded transition-all text-white/30 hover:text-white"><Download size={14} /></button>
             <button onClick={autoFormat} title="Auto-Format" className="p-1 px-2 hover:bg-white/10 rounded transition-all text-white/30 hover:text-white"><Layout size={14} /></button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
             <div className="flex flex-col items-end">
                <div className="flex justify-between w-full mb-1">
                   <span className="text-[7px] text-white/20 font-black tracking-widest uppercase">Speed</span>
                   <span className="text-[7px] text-indigo-400 font-mono">{simSpeed}ms</span>
                </div>
                <input type="range" min="10" max="1000" step="10" value={simSpeed} onChange={(e) => setSimSpeed(parseInt(e.target.value))} className="w-20 accent-indigo-500 h-1" />
             </div>
          </div>

          <div className="flex items-center space-x-2 bg-black/40 p-1 px-2 rounded-lg border border-white/5">
             <button onClick={() => setLedColor('red')} className={`w-3 h-3 rounded-full bg-red-500 transition-all ${ledColor === 'red' ? 'ring-2 ring-white scale-110' : 'opacity-30'}`}></button>
             <button onClick={() => setLedColor('green')} className={`w-3 h-3 rounded-full bg-emerald-500 transition-all ${ledColor === 'green' ? 'ring-2 ring-white scale-110' : 'opacity-30'}`}></button>
             <button onClick={() => setLedColor('blue')} className={`w-3 h-3 rounded-full bg-blue-500 transition-all ${ledColor === 'blue' ? 'ring-2 ring-white scale-110' : 'opacity-30'}`}></button>
             <div className="w-px h-3 bg-white/10 mx-1"></div>
             <button onClick={() => setTheme(theme === 'neon' ? 'retro' : theme === 'retro' ? 'slate' : 'neon')} className="p-1 px-2 hover:bg-white/10 rounded text-[9px] font-black text-indigo-400">
                {theme.toUpperCase()}
             </button>
             <button onClick={() => setShowHelp(true)} className="p-1 px-2 bg-indigo-600/20 text-indigo-400 rounded border border-indigo-500/30 text-[9px] font-black">
                HELP
             </button>
          </div>

          <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/5 shadow-inner group">
            <button onClick={handleReset} title="Hard Reset" className="p-1.5 px-3 hover:bg-white/10 rounded-lg text-white/30 hover:text-indigo-400 transition-all">
                <RefreshCw size={14} className={isCompiling ? 'animate-spin' : ''} />
            </button>
            <div className="w-px h-5 bg-white/10 mx-1"></div>
            <button onClick={handleStep} disabled={isSimulating} title="Single Step" className={`p-1.5 px-3 rounded-lg transition-all ${isSimulating ? 'opacity-10' : 'hover:bg-white/10 text-white/30 hover:text-amber-400'}`}>
                <Activity size={14} />
            </button>
          </div>

          <button 
            onClick={isSimulating ? handleStop : handleRun}
            disabled={isCompiling}
            className={`flex items-center space-x-3 px-6 py-2.5 rounded-xl font-black text-[10px] tracking-widest transition-all ${
              isSimulating ? 'bg-red-600/10 text-red-500 border border-red-500/30' : 'bg-indigo-600 text-white shadow-lg'
            }`}
          >
            {isCompiling ? <RefreshCw size={14} className="animate-spin" /> : (isSimulating ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />)}
            <span>{isCompiling ? "BOOT..." : (isSimulating ? "STOP" : "RUN")}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Editor & Console */}
        <div 
          style={{ width: isBoardFullscreen ? '0%' : '52%' }} 
          className={`flex flex-col border-r border-white/5 relative bg-[#0a0a0a] transition-all duration-700 ${isBoardFullscreen ? 'translate-x-[-100%] opacity-0' : 'translate-x-0 opacity-100'}`}
        >
          <div className="flex-1 overflow-hidden">
            <CodeEditor code={code} onChange={setCode} disabled={isSimulating} />
          </div>
          <Console logs={logs} onClear={() => setLogs([{ type: 'info', text: "Console re-initialized.", time: new Date().toLocaleTimeString() }])} />
        </div>

        {/* Right: Board Area */}
        <div className={`flex flex-col bg-[#050505] overflow-hidden relative transition-all duration-700 ${isBoardFullscreen ? 'flex-1' : 'w-[48%] min-w-0'}`}>
          {!isBoardFullscreen && (
            <div className="px-4 py-2 bg-white/5 border-b border-white/5 text-[9px] text-white/30 font-black uppercase tracking-[0.2em] flex justify-between items-center shrink-0">
               <span>🔌 Platine Laboratoire — GEII Lyon 1</span>
               <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>System_Active</span>
               </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 xl:p-4 flex items-start justify-center bg-[radial-gradient(circle_at_center,_#0a1a0f_0%,_#050505_100%)]">
             <div className="w-full flex justify-center py-4">
               <Platine 
                  state={state} 
                  onInputChange={handleInputChange} 
                  ledColor={ledColor} 
                  fullscreen={isBoardFullscreen} 
               />
             </div>
          </div>
          
          <div className="absolute top-6 left-6 z-50">
             <button 
               onClick={() => setIsBoardFullscreen(!isBoardFullscreen)}
               className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl border border-white/5 backdrop-blur-3xl shadow-2xl transition-all hover:scale-110 active:scale-90"
             >
                <Layout size={18} className={isBoardFullscreen ? 'rotate-180 transition-all duration-500' : ''} />
             </button>
          </div>

          <FloatingMemo />

          {/* Overlay for "Simulation Inactive" look if needed */}
          {!ws || ws.readyState !== WebSocket.OPEN ? (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center pointer-events-none transition-opacity duration-1000">
               <div className="bg-black/80 border border-white/5 p-6 rounded-2xl shadow-3xl text-center">
                  <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">Connecting Hardware Sync...</span>
               </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default App;
