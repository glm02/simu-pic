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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, ws, isSimulating]);

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
      }, 50); // Faster tick for better responsiveness
    }
    return () => clearInterval(interval);
  }, [isSimulating, ws]);

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
    "MIROIR": "// Miroir: PORTD suit PORTB\nvoid main(void) {\n    TRISB = 0xFF;\n    TRISD = 0x00;\n    while(1) {\n        PORTD = PORTB;\n    }\n}",
    "CHENILLARD": "// Chenillard: Rotation de bits\nvoid main(void) {\n    TRISD = 0x00;\n    unsigned char val = 1;\n    while(1) {\n        PORTD = val;\n        val = (val << 1) | (val >> 7);\n        __delay_ms(100);\n    }\n}",
    "ADC_LCD": "// ADC vers LCD\nvoid main(void) {\n    while(1) {\n        unsigned char val = ADRESH;\n        PORTD = val;\n        if(val > 128) printf(\"SEUIL ATTEINT\");\n        else printf(\"NORMAL\");\n    }\n}",
    "COUNTER": "// Compteur 7-seg\nvoid main(void) {\n    unsigned char i = 0;\n    while(1) {\n        PORTC = seg(i);\n        i = (i + 1) % 16;\n        __delay_ms(500);\n    }\n}"
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
    <div className="flex flex-col h-screen bg-[#050505] text-slate-300 font-sans overflow-hidden select-none animate-hardware-boot">
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
               <span className="text-[9px] text-white/20 font-mono tracking-tighter">ENVIRONMENT v2.5 | 16-BIT ENGINE</span>
               {isSimulating && (
                 <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">
                    <span className="w-1 h-1 bg-green-500 rounded-full animate-ping"></span>
                    <span className="text-[8px] text-green-400 font-bold uppercase tracking-widest">Live Logic</span>
                 </div>
               )}
            </div>
          </div>

          <div className="h-8 w-px bg-white/5 mx-4"></div>

          <select 
            onChange={(e) => loadExample(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] font-black tracking-widest text-indigo-400 uppercase outline-none hover:bg-white/10 transition-all"
          >
            <option value="EMPTY">Fichiers Exemples</option>
            <option value="MIROIR">TP 1: Miroir PORTB</option>
            <option value="CHENILLARD">TP 2: Chenillard</option>
            <option value="ADC_LCD">TP 3: ADC + LCD</option>
            <option value="COUNTER">TP 4: Compteur 7-seg</option>
          </select>
        </div>

        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-4 mr-4">
             <div className="flex flex-col items-end">
                <span className="text-[8px] text-white/30 font-black uppercase tracking-widest mb-1">Potentiomètre_ADC</span>
                <input type="range" min="0" max="255" value={state.ADRESH || 0} onChange={handleADCClick} className="w-32 accent-indigo-500" />
             </div>
          </div>

          <div className="flex items-center space-x-2 mr-4 bg-white/5 p-1 rounded-lg border border-white/5">
             <button onClick={() => setLedColor('red')} className={`w-4 h-4 rounded-full bg-red-500 border-2 transition-all ${ledColor === 'red' ? 'border-white scale-125' : 'border-transparent opacity-40 hover:opacity-100'}`}></button>
             <button onClick={() => setLedColor('green')} className={`w-4 h-4 rounded-full bg-emerald-500 border-2 transition-all ${ledColor === 'green' ? 'border-white scale-125' : 'border-transparent opacity-40 hover:opacity-100'}`}></button>
             <button onClick={() => setLedColor('blue')} className={`w-4 h-4 rounded-full bg-blue-500 border-2 transition-all ${ledColor === 'blue' ? 'border-white scale-125' : 'border-transparent opacity-40 hover:opacity-100'}`}></button>
          </div>

          <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-2xl shadow-inner group">
            <button onClick={downloadLogs} className="p-1.5 px-3 hover:bg-white/10 rounded-lg text-[10px] font-black tracking-widest transition-all flex items-center space-x-2 text-white/30 hover:text-white">
                <Download size={12} />
                <span>EX_LOG</span>
            </button>
            <div className="w-px h-5 bg-white/10 mx-1"></div>
            <button onClick={handleReset} className="p-1.5 px-4 hover:bg-white/10 rounded-lg text-[10px] font-black tracking-widest transition-all flex items-center space-x-2 text-white/30 hover:text-white group-hover:text-indigo-400">
                <RefreshCw size={12} className={isCompiling ? 'animate-spin' : ''} />
                <span>HARD_RESET</span>
            </button>
            <div className="w-px h-5 bg-white/10 mx-1"></div>
            <button onClick={handleStep} disabled={isSimulating} className={`p-1.5 px-4 rounded-lg text-[10px] font-black tracking-widest transition-all flex items-center space-x-2 ${isSimulating ? 'opacity-10 cursor-not-allowed' : 'hover:bg-white/10 text-white/30 hover:text-white group-hover:text-amber-400'}`}>
                <RefreshCw size={12} />
                <span>STEP_ONE</span>
            </button>
          </div>

          <button 
            onClick={isSimulating ? handleStop : handleRun}
            disabled={isCompiling}
            className={`group relative flex items-center space-x-3 px-8 py-2.5 rounded-xl font-black text-xs tracking-[0.2em] transition-all duration-300 transform active:scale-95 overflow-hidden ${
              isSimulating 
              ? 'bg-red-600/10 text-red-500 border border-red-500/30 hover:bg-red-600/20 shadow-[0_0_30px_rgba(220,38,38,0.2)]' 
              : 'bg-indigo-600 text-white shadow-[0_10px_30px_rgba(79,70,229,0.4)] hover:bg-indigo-500 hover:-translate-y-0.5'
            } ${isCompiling ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            {isCompiling ? <RefreshCw size={15} className="animate-spin" /> : (isSimulating ? <Square size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />)}
            <span>{isCompiling ? "BOOTING..." : (isSimulating ? "STOP_CORE" : "RUN_PROJECT")}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Editor & Console */}
        <div 
          style={{ width: isBoardFullscreen ? '0%' : `${leftWidth}%` }} 
          className={`flex flex-col border-r border-white/5 relative bg-[#0a0a0a] transition-all duration-700 ${isBoardFullscreen ? 'translate-x-[-100%] opacity-0' : 'translate-x-0 opacity-100'}`}
        >
          <div className="flex-1 overflow-hidden">
            <CodeEditor code={code} onChange={setCode} disabled={isSimulating} />
          </div>
          <Console logs={logs} onClear={() => setLogs([{ type: 'info', text: "Console re-initialized.", time: new Date().toLocaleTimeString() }])} />
        </div>

        {/* Improved Resize Handle */}
        {!isBoardFullscreen && (
          <div 
            onMouseDown={startResizing}
            className={`w-1 transition-all duration-300 cursor-col-resize z-30 relative flex items-center justify-center group ${isDragging ? 'bg-indigo-500 border-x border-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.5)]' : 'bg-white/5 hover:bg-white/10'}`}
          >
            <div className={`w-0.5 h-16 rounded-full transition-all ${isDragging ? 'bg-white scale-y-125' : 'bg-white/10 group-hover:bg-indigo-500/50'}`}></div>
          </div>
        )}

        {/* Right: Board */}
        <div className={`flex-1 flex flex-col bg-[#050505] overflow-hidden relative transition-all duration-700 ${isBoardFullscreen ? 'w-full' : ''}`}>
          <div className="absolute top-6 left-6 z-50">
             <button 
               onClick={() => setIsBoardFullscreen(!isBoardFullscreen)}
               className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl border border-white/5 backdrop-blur-3xl shadow-2xl transition-all hover:scale-110 active:scale-90"
             >
                <Layout size={18} className={isBoardFullscreen ? 'rotate-180 transition-all duration-500' : ''} />
             </button>
          </div>

          <Platine state={state} onInputChange={handleInputChange} ledColor={ledColor} />
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
