import React from "react";
import { Volume2, ShieldCheck, Zap, Activity, Wifi } from "lucide-react";

// ─── PCB decorative screw ─────────────────────────────────────────────────────
const Screw = () => (
  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-zinc-400 to-zinc-700 border-2 border-black/50 shadow-inner flex items-center justify-center relative flex-shrink-0">
    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-800 flex items-center justify-center shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
      <div className="w-full h-[1.5px] bg-zinc-900/60 rotate-45 absolute" />
      <div className="w-full h-[1.5px] bg-zinc-900/60 -rotate-45 absolute" />
    </div>
  </div>
);

// ─── LCD Display ──────────────────────────────────────────────────────────────
const LCDScreen = ({ line1 = "", line2 = "", fullscreen = false }) => {
  const display1 = line1?.trim() ? line1 : "SIMU-PIC v4.0";
  const display2 = line2?.trim() ? line2 : "GEII - LYON 1";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="bg-[#080808] p-2 rounded-xl shadow-2xl border border-[#00ff41]/10 relative">
        <div className="absolute inset-0 bg-[#00ff41]/3 rounded-xl pointer-events-none" />
        <div className={`bg-[#0d1a0f] rounded border border-[#00ff41]/15 shadow-[inset_0_0_24px_rgba(0,0,0,0.8)] p-3 ${fullscreen ? "min-w-[420px]" : "min-w-[260px]"}`}>
          {[display1, display2].map((line, i) => (
            <div
              key={i}
              className={`font-mono text-[#00ff41] tracking-[0.16em] font-bold uppercase drop-shadow-[0_0_8px_rgba(0,255,65,0.6)] leading-tight ${fullscreen ? "text-xl" : "text-xs"} ${i === 1 ? "mt-1.5" : ""}`}
            >
              {line.substring(0, 16).padEnd(16, "\u00a0")}
            </div>
          ))}
        </div>
      </div>
      <span className="text-white/15 font-mono tracking-widest uppercase text-[8px]">LCD · HD44780</span>
    </div>
  );
};

// ─── Tactile push-button ──────────────────────────────────────────────────────
const TactileButton = ({ label, bitIndex, isPressed, onDown, onUp, fullscreen = false }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      onMouseDown={() => onDown(bitIndex)}
      onMouseUp={() => onUp(bitIndex)}
      onMouseLeave={() => isPressed && onUp(bitIndex)}
      onTouchStart={(e) => { e.preventDefault(); onDown(bitIndex); }}
      onTouchEnd={(e) => { e.preventDefault(); onUp(bitIndex); }}
      className={`rounded-xl flex items-center justify-center border-2 transition-all duration-75 cursor-pointer select-none ${fullscreen ? "w-14 h-14" : "w-8 h-8 sm:w-10 sm:h-10"} ${
        isPressed
          ? "bg-indigo-500 border-indigo-300 scale-90 shadow-[0_0_16px_rgba(99,102,241,0.7)] shadow-inner"
          : "bg-[#252525] border-white/10 hover:border-indigo-400/60 hover:bg-[#303030] shadow-lg hover:shadow-indigo-500/20 active:scale-95"
      }`}
    >
      <div className={`rounded-full border border-black/30 transition-colors ${fullscreen ? "w-7 h-7" : "w-4 h-4"} ${isPressed ? "bg-indigo-200" : "bg-[#3a3a3a]"}`} />
    </div>
    <span className={`font-mono font-bold tabular-nums ${fullscreen ? "text-[10px]" : "text-[7px]"} ${isPressed ? "text-indigo-300" : "text-white/30"}`}>
      {label}
    </span>
  </div>
);

// ─── DIP Switch bank ──────────────────────────────────────────────────────────
const DipSwitch = ({ portValue, onToggle, fullscreen = false }) => (
  <div className="flex flex-col items-center gap-2">
    <div className={`bg-[#aa0000] p-3 rounded-xl grid grid-cols-4 gap-2 border-2 border-black/40 shadow-2xl ${fullscreen ? "scale-110 origin-center" : ""}`}>
      {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => {
        const isOn = (portValue & (1 << bit)) !== 0;
        return (
          <div
            key={bit}
            className="flex flex-col items-center min-w-[30px] cursor-pointer group"
            onClick={() => onToggle(bit)}
          >
            <span className="text-[8px] text-white/70 font-black mb-1 font-mono">{bit}</span>
            <div className="w-7 h-12 bg-black/70 rounded-md p-1 border border-black/50 shadow-inner transition-all group-hover:border-white/20">
              <div
                className={`w-full h-5 rounded transition-all duration-100 flex items-center justify-center text-[7px] font-black ${
                  isOn ? "mt-0 bg-white text-red-700 shadow-[0_0_8px_rgba(255,255,255,0.7)]" : "mt-4 bg-white/8 text-white/20"
                }`}
              >
                {isOn ? "ON" : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
    <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-lg border border-white/5">
      <span className="text-[8px] text-white/25 font-mono uppercase">PORTB</span>
      <span className="text-[10px] text-amber-400 font-mono font-black tabular-nums">0x{portValue.toString(16).toUpperCase().padStart(2, "0")}</span>
      <span className="text-white/10 font-mono text-[8px]">·</span>
      <span className="text-[8px] text-white/20 font-mono tabular-nums">{portValue.toString(2).padStart(8, "0")}</span>
    </div>
  </div>
);

// ─── LED component (stable, no flicker) ──────────────────────────────────────
const LED = ({ label, isOn, color = "green", fullscreen = false }) => {
  const colorMap = {
    red:   { on: "bg-red-500     shadow-[0_0_12px_#ff2222,0_0_24px_#ff222240]",  off: "bg-[#200000] border-red-900/30" },
    green: { on: "bg-emerald-400 shadow-[0_0_12px_#34d399,0_0_24px_#34d39940]",  off: "bg-[#001a0c] border-emerald-900/30" },
    blue:  { on: "bg-blue-400    shadow-[0_0_12px_#60a5fa,0_0_24px_#60a5fa40]",  off: "bg-[#00051a] border-blue-900/30" },
  };
  const c = colorMap[color] ?? colorMap.green;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`rounded-full border ${fullscreen ? "w-7 h-7" : "w-3.5 h-3.5 sm:w-4 sm:h-4"} transition-colors duration-0 ${isOn ? `${c.on} border-white/15` : `${c.off} border-white/5`}`}
      />
      {label && (
        <span className={`font-mono font-black tabular-nums ${fullscreen ? "text-[9px]" : "text-[7px]"} ${isOn ? "text-white/60" : "text-white/15"}`}>
          {label}
        </span>
      )}
    </div>
  );
};

// ─── Seven-segment display ────────────────────────────────────────────────────
const SevenSegment = ({ value, label, fullscreen = false }) => {
  const s = Array.from({ length: 8 }, (_, k) => (value & (1 << k)) !== 0);
  const ON = "#ff2a2a";
  const OFF = "#180000";
  const glowClass = "drop-shadow-[0_0_6px_rgba(255,42,42,0.85)]";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`bg-[#070707] p-3 rounded-xl border border-white/8 shadow-2xl ${fullscreen ? "scale-[1.15]" : "scale-90"}`}>
        <svg viewBox="0 0 100 150" className={fullscreen ? "w-20 h-32" : "w-12 h-20"}>
          <polygon points="20,10 80,10 75,20 25,20"   fill={s[0] ? ON : OFF} className={s[0] ? glowClass : "opacity-20"} />
          <polygon points="85,15 85,70 75,65 75,25"   fill={s[1] ? ON : OFF} className={s[1] ? glowClass : "opacity-20"} />
          <polygon points="85,80 85,135 75,125 75,85" fill={s[2] ? ON : OFF} className={s[2] ? glowClass : "opacity-20"} />
          <polygon points="20,140 80,140 75,130 25,130" fill={s[3] ? ON : OFF} className={s[3] ? glowClass : "opacity-20"} />
          <polygon points="15,80 15,135 25,125 25,85" fill={s[4] ? ON : OFF} className={s[4] ? glowClass : "opacity-20"} />
          <polygon points="15,15 15,70 25,65 25,25"   fill={s[5] ? ON : OFF} className={s[5] ? glowClass : "opacity-20"} />
          <polygon points="20,75 75,75 70,85 25,85"   fill={s[6] ? ON : OFF} className={s[6] ? glowClass : "opacity-20"} />
          <circle cx="90" cy="140" r="5"              fill={s[7] ? ON : OFF} className={s[7] ? glowClass : "opacity-20"} />
        </svg>
      </div>
      <span className={`text-white/30 font-mono uppercase font-black ${fullscreen ? "text-xs" : "text-[8px]"}`}>{label}</span>
      <span className="text-[8px] text-white/15 font-mono tabular-nums">0x{value.toString(16).toUpperCase().padStart(2, "0")}</span>
    </div>
  );
};

// ─── ADC Potentiometer ────────────────────────────────────────────────────────
const ADCSlider = ({ value, onChange, fullscreen = false }) => {
  const pct = Math.round((value / 255) * 100);
  return (
    <div className={`flex flex-col gap-2 bg-black/40 rounded-xl border border-yellow-500/10 ${fullscreen ? "p-5" : "p-3"}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Zap size={10} className="text-yellow-400" />
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">ADC — ADRESH</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-yellow-400 font-black tabular-nums">{pct}%</span>
          <span className="text-[9px] font-mono text-white/20 tabular-nums">0x{value.toString(16).toUpperCase().padStart(2, "0")}</span>
        </div>
      </div>
      <input
        type="range" min="0" max="255" step="1" value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-yellow-400"
        style={{ background: `linear-gradient(to right, #eab308 0%, #eab308 ${pct}%, rgba(255,255,255,0.07) ${pct}%, rgba(255,255,255,0.07) 100%)` }}
      />
      <div className="flex justify-between text-[7px] font-mono text-white/10">
        <span>0V (0x00)</span><span>VDD (0xFF)</span>
      </div>
    </div>
  );
};

// ─── LED bar ──────────────────────────────────────────────────────────────────
const LedBar = ({ portValue, color, portName, fullscreen }) => (
  <div className="flex flex-col gap-1.5">
    <div className={`flex justify-around items-end ${fullscreen ? "gap-6" : "gap-1"}`}>
      {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => (
        <LED key={bit} label={`D${bit}`} isOn={(portValue & (1 << bit)) !== 0} color={color} fullscreen={fullscreen} />
      ))}
    </div>
    <div className="flex items-center justify-center gap-3 mt-1">
      <span className="text-[8px] text-white/20 font-mono uppercase">{portName}</span>
      <span className="text-[11px] text-white/65 font-mono font-black tabular-nums">
        0x{portValue.toString(16).toUpperCase().padStart(2, "0")}
      </span>
      <span className="text-[9px] text-white/15 font-mono tabular-nums">{portValue.toString(2).padStart(8, "0")}</span>
    </div>
  </div>
);

// ─── Main Platine component ───────────────────────────────────────────────────
const Platine = ({ state, onInputChange, ledColor = "red", fullscreen = false }) => {
  if (!state)
    return (
      <div className="p-10 text-white/20 font-mono text-sm flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-white/10 border-t-indigo-500/60 rounded-full animate-spin" />
        <span>WAITING FOR HARDWARE…</span>
      </div>
    );

  const handlePushDown = (bit) => onInputChange("PORTA", (state.PORTA | (1 << bit)) & 0xff);
  const handlePushUp   = (bit) => onInputChange("PORTA", state.PORTA & ~(1 << bit) & 0xff);
  const handleDipToggle = (bit) => onInputChange("PORTB", (state.PORTB ^ (1 << bit)) & 0xff);
  const handleADC = (val) => onInputChange("ADRESH", val & 0xff);

  return (
    <div className={`w-full h-full flex flex-col items-center p-2 sm:p-3 overflow-y-auto overflow-x-hidden ${fullscreen ? "bg-black/50" : "bg-transparent"}`}>
      {/* ── PCB Board ──────────────────────────────────────────────────────── */}
      <div className={`w-full transition-all duration-500 bg-gradient-to-b from-[#0e2e18] to-[#0a1f10] rounded-[1.75rem] border-[6px] border-[#071509] shadow-[0_20px_80px_rgba(0,0,0,0.8)] relative ${fullscreen ? "max-w-[1400px] min-h-[85vh] p-8 mt-6" : "max-w-[950px] p-4 sm:p-6"}`}>
        
        {/* Board top label */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-6 py-0.5 bg-black/40 rounded-full border border-white/5 text-[7px] text-white/10 font-mono tracking-[0.5em] uppercase pointer-events-none select-none">
          PIC16F1789 Lab System v4.0
        </div>

        {/* Corner screws */}
        <div className="absolute top-5 left-5"><Screw /></div>
        <div className="absolute top-5 right-5"><Screw /></div>
        <div className="absolute bottom-5 left-5"><Screw /></div>
        <div className="absolute bottom-5 right-5"><Screw /></div>

        <div className={`flex flex-col relative z-10 gap-4 ${fullscreen ? "pt-8" : "pt-4"}`}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex justify-between items-center border-b border-white/8 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="bg-yellow-500/10 p-2 rounded-xl border border-yellow-500/20 shadow-[0_0_12px_rgba(234,179,8,0.1)]">
                <ShieldCheck className="text-yellow-400" size={15} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-sm font-black text-[#90b890] tracking-tighter uppercase">LYON 1 — GEII</span>
                <span className="text-[6px] text-white/20 tracking-widest uppercase mt-0.5">PIC16F1789 · v4.0 · SIMU</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-black/70 px-3 py-2 rounded-lg border border-white/5 flex items-center gap-3 shadow-xl">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
                    <span className="text-[6px] font-black text-white/30 uppercase">Online</span>
                  </div>
                  <span className="text-[6px] font-bold text-emerald-400">PROD_ENV</span>
                </div>
                <div className="w-px h-6 bg-white/5" />
                <div className="flex flex-col items-center gap-0.5">
                  <Wifi size={11} className="text-indigo-400" />
                  <span className="text-[6px] font-black text-white/20 uppercase">WS</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section label helper ────────────────────────────────────────── */}
          {/* ── 1. LED Strip (PORTD outputs) ────────────────────────────────── */}
          <div className="bg-black/30 px-4 py-3 rounded-xl border border-white/5">
            <div className="text-[8px] text-white/20 font-mono uppercase tracking-widest mb-2.5 font-black">PORTD — Sorties LED</div>
            <LedBar portValue={state.PORTD} color={ledColor} portName="PORTD" fullscreen={fullscreen} />
          </div>

          {/* ── 2. LCD + 7-Segments ─────────────────────────────────────────── */}
          <div className={`grid grid-cols-1 lg:grid-cols-2 ${fullscreen ? "gap-8" : "gap-3"}`}>
            <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1 min-h-[100px]">
              <div className="text-[8px] text-white/20 font-mono uppercase tracking-widest font-black self-start mb-1">LCD · HD44780</div>
              <LCDScreen line1={state.LCD_LINE1} line2={state.LCD_LINE2} fullscreen={fullscreen} />
            </div>
            <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
              <div className="text-[8px] text-white/20 font-mono uppercase tracking-widest font-black">7-SEG — PORTC / PORTE</div>
              <div className={`flex justify-center items-center ${fullscreen ? "gap-14" : "gap-6"}`}>
                <SevenSegment value={state.PORTC} label="SEG_A (PORTC)" fullscreen={fullscreen} />
                <SevenSegment value={state.PORTE} label="SEG_B (PORTE)" fullscreen={fullscreen} />
              </div>
            </div>
          </div>

          {/* ── 3. ADC Potentiometer ─────────────────────────────────────────── */}
          <ADCSlider value={state.ADRESH ?? 0} onChange={handleADC} fullscreen={fullscreen} />

          {/* ── 4. Inputs: Push buttons + DIP switches ──────────────────────── */}
          <div className={`grid grid-cols-1 xl:grid-cols-2 ${fullscreen ? "gap-6" : "gap-3"}`}>
            {/* PORTA Buttons */}
            <div className={`bg-black/40 rounded-xl border border-white/8 ${fullscreen ? "p-5" : "p-3"}`}>
              <div className="text-[8px] text-white/20 font-mono uppercase tracking-widest mb-2.5 font-black">PORTA — Boutons poussoirs (RA0–RA7)</div>
              <div className={`flex justify-around items-end ${fullscreen ? "gap-4" : "gap-1"}`}>
                {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => (
                  <TactileButton
                    key={bit}
                    label={`RA${bit}`}
                    bitIndex={bit}
                    isPressed={(state.PORTA & (1 << bit)) !== 0}
                    onDown={handlePushDown}
                    onUp={handlePushUp}
                    fullscreen={fullscreen}
                  />
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-white/5">
                <span className="text-[8px] text-white/20 font-mono uppercase">PORTA</span>
                <span className="text-[10px] text-indigo-300 font-mono font-black tabular-nums">0x{(state.PORTA ?? 0).toString(16).toUpperCase().padStart(2, "0")}</span>
                <span className="text-[8px] text-white/15 font-mono tabular-nums">{(state.PORTA ?? 0).toString(2).padStart(8, "0")}</span>
              </div>
            </div>

            {/* PORTB DIP switches */}
            <div className={`bg-black/40 rounded-xl border border-white/8 flex flex-col items-center justify-center relative ${fullscreen ? "p-6" : "p-3"}`}>
              <div className="text-[8px] text-white/20 font-mono uppercase tracking-widest font-black self-start mb-2">PORTB — Interrupteurs DIP</div>
              <DipSwitch portValue={state.PORTB} onToggle={handleDipToggle} fullscreen={fullscreen} />
            </div>
          </div>

          {/* ── 5. Footer: Peripherals + CPU registers ──────────────────────── */}
          <div className="bg-black/20 p-3 rounded-xl border border-white/5">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {/* Buzzer */}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors duration-0 ${state.PORTC & 0x80 ? "bg-red-500/20 border-red-500 shadow-[0_0_10px_#ff0000]" : "bg-black/40 border-white/5"}`}>
                  <Volume2 size={14} className={state.PORTC & 0x80 ? "text-red-400" : "text-white/10"} />
                </div>
                <span className={`text-[8px] font-mono font-black ${state.PORTC & 0x80 ? "text-red-400" : "text-white/15"}`}>BUZZER</span>
              </div>

              {/* CPU registers mini panel */}
              <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-white/5 flex-wrap">
                {[
                  { n: "PORTD", v: state.PORTD ?? 0 },
                  { n: "PORTC", v: state.PORTC ?? 0 },
                  { n: "W",     v: state.W ?? 0 },
                  { n: "PCL",   v: state.PCL ?? 0 },
                ].map((r) => (
                  <div key={r.n} className="flex items-center gap-1 text-[8px] font-mono">
                    <span className="text-white/20">{r.n}:</span>
                    <span className="text-emerald-400 bg-white/5 px-1.5 rounded tabular-nums border border-white/5">
                      0x{r.v.toString(16).toUpperCase().padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Signature */}
            <div className="border-t border-white/5 pt-2 mt-2 flex justify-between items-center px-1">
              <span className="text-[6px] text-white/10 font-black uppercase tracking-widest">LYON 1 UCBL</span>
              <span className="text-[8px] text-indigo-400/50 font-black italic">Fait par Rafael — Étudiant GEII</span>
              <span className="text-[6px] text-white/10 font-black uppercase tracking-widest">PROMO 2026</span>
            </div>
          </div>

        </div>
      </div>

      <div className="mt-3 text-[8px] font-mono text-white/5 tracking-[0.8em] uppercase">
        Logic Unit Synchronized // PIC16F1789
      </div>
    </div>
  );
};

export default Platine;
