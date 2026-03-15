import React from "react";
import { Volume2, ShieldCheck, Zap, Activity } from "lucide-react";

// ─── Decorative PCB screw ─────────────────────────────────────────────────────
const Screw = () => (
  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 border border-black/40 shadow-inner flex items-center justify-center relative">
    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
      <div className="w-full h-px bg-gray-900/40 rotate-45 absolute" />
      <div className="w-full h-px bg-gray-900/40 -rotate-45 absolute" />
    </div>
  </div>
);

// ─── LCD Display ──────────────────────────────────────────────────────────────
const LCDScreen = ({ line1 = "", line2 = "", fullscreen = false }) => {
  const display1 = line1?.trim() ? line1 : "SIMU-PIC v3.0";
  const display2 = line2?.trim() ? line2 : "GEII - LYON 1";

  return (
    <div className="flex flex-col items-center">
      <div
        className={`bg-[#0a0a0a] p-2 rounded-xl shadow-2xl border border-white/10 relative overflow-hidden transition-all duration-500 ${
          fullscreen ? "scale-110 my-4" : "scale-100"
        }`}
      >
        {/* green ambient glow */}
        <div className="absolute inset-0 bg-[#00ff41]/3 rounded-xl pointer-events-none" />
        <div
          className={`bg-[#0d1a0f] p-4 min-w-[280px] rounded border border-[#00ff41]/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] ${
            fullscreen ? "min-w-[400px]" : ""
          }`}
        >
          {[display1, display2].map((line, i) => (
            <div
              key={i}
              className={`font-mono text-[#00ff41] tracking-[0.18em] font-black uppercase drop-shadow-[0_0_6px_rgba(0,255,65,0.7)] ${
                fullscreen ? "text-2xl" : "text-sm"
              } ${i === 1 ? "mt-1" : ""}`}
            >
              {line.substring(0, 16).padEnd(16, "\u00a0")}
            </div>
          ))}
        </div>
      </div>
      <span
        className={`text-white/20 font-mono mt-1.5 tracking-widest uppercase ${
          fullscreen ? "text-xs" : "text-[9px]"
        }`}
      >
        LCD · HD44780
      </span>
    </div>
  );
};

// ─── Tactile push-button ──────────────────────────────────────────────────────
const TactileButton = ({
  label,
  bitIndex,
  isPressed,
  onDown,
  onUp,
  fullscreen = false,
}) => (
  <div className="flex flex-col items-center gap-1">
    <div
      onMouseDown={() => onDown(bitIndex)}
      onMouseUp={() => onUp(bitIndex)}
      onMouseLeave={() => isPressed && onUp(bitIndex)}
      onTouchStart={(e) => {
        e.preventDefault();
        onDown(bitIndex);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onUp(bitIndex);
      }}
      className={`rounded-xl flex items-center justify-center border-2 transition-all duration-75 cursor-pointer select-none ${
        fullscreen ? "w-12 h-12" : "w-9 h-9 sm:w-10 sm:h-10"
      } ${
        isPressed
          ? "bg-indigo-500 border-white scale-95 shadow-[0_0_12px_rgba(99,102,241,0.6)] shadow-inner"
          : "bg-[#2a2a2a] border-white/15 hover:border-indigo-400/50 shadow-lg hover:shadow-indigo-500/10"
      }`}
    >
      <div
        className={`rounded-full border border-black/20 ${fullscreen ? "w-6 h-6" : "w-4 h-4"} ${
          isPressed ? "bg-indigo-300" : "bg-[#444]"
        }`}
      />
    </div>
    <span
      className={`font-mono font-bold tabular-nums ${fullscreen ? "text-[10px]" : "text-[8px]"} ${
        isPressed ? "text-indigo-300" : "text-white/40"
      }`}
    >
      {label}
    </span>
  </div>
);

// ─── DIP Switch bank ──────────────────────────────────────────────────────────
const DipSwitch = ({ portValue, onToggle, fullscreen = false }) => (
  <div className="flex flex-col items-center gap-2">
    <div
      className={`bg-[#b30000] p-3 rounded-xl grid grid-cols-4 gap-2 border-2 border-black/50 shadow-2xl transition-all ${
        fullscreen ? "scale-110" : "scale-95 sm:scale-100"
      }`}
    >
      {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => {
        const isOn = (portValue & (1 << bit)) !== 0;
        return (
          <div
            key={bit}
            className="flex flex-col items-center min-w-[32px]"
            onClick={() => onToggle(bit)}
          >
            <span className="text-[9px] text-white/80 font-black mb-1 font-mono">
              {bit}
            </span>
            <div className="w-8 h-12 bg-black/60 rounded-md p-1 cursor-pointer border border-black/60 shadow-inner">
              <div
                className={`w-full h-5 rounded transition-all duration-100 flex items-center justify-center text-[7px] font-black ${
                  isOn
                    ? "mt-0 bg-white text-red-700 shadow-[0_0_10px_white]"
                    : "mt-4 bg-white/5 text-white/20"
                }`}
              >
                {isOn ? "ON" : "OFF"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
    {/* PORTB hex readout */}
    <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-lg border border-white/5">
      <span className="text-[8px] text-white/30 font-mono uppercase">
        PORTB
      </span>
      <span className="text-[10px] text-amber-400 font-mono font-black tabular-nums">
        0x{portValue.toString(16).toUpperCase().padStart(2, "0")}
      </span>
      <span className="text-white/10 font-mono text-[8px]">|</span>
      <span className="text-[9px] text-white/20 font-mono tabular-nums">
        {portValue.toString(2).padStart(8, "0")}
      </span>
    </div>
  </div>
);

// ─── LED strip ────────────────────────────────────────────────────────────────
const LED = ({ label, isOn, color = "green", fullscreen = false }) => {
  const colorMap = {
    red: {
      on: "bg-red-500   shadow-[0_0_14px_#ff0000,0_0_28px_#ff000040]",
      dot: "#ff0000",
    },
    green: {
      on: "bg-green-400 shadow-[0_0_14px_#22c55e,0_0_28px_#22c55e40]",
      dot: "#22c55e",
    },
    blue: {
      on: "bg-indigo-400 shadow-[0_0_14px_#6366f1,0_0_28px_#6366f140]",
      dot: "#6366f1",
    },
  };
  const c = colorMap[color] ?? colorMap.green;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`rounded-full border transition-all duration-150 ${
          fullscreen ? "w-6 h-6" : "w-3 h-3 sm:w-4 sm:h-4"
        } ${isOn ? `${c.on} border-white/20` : "bg-[#111] border-white/5"}`}
      />
      {label && (
        <span
          className={`font-mono font-black tabular-nums ${fullscreen ? "text-[9px]" : "text-[7px]"} ${
            isOn ? "text-white/70" : "text-white/15"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
};

// ─── Seven-segment display ────────────────────────────────────────────────────
const SevenSegment = ({ value, label, fullscreen = false }) => {
  const s = Array.from({ length: 8 }, (_, k) => (value & (1 << k)) !== 0);
  const ON = "#ff3333";
  const OFF = "#1a0000";
  const gClass = "drop-shadow-[0_0_8px_rgba(255,51,51,0.9)]";

  return (
    <div className="flex flex-col items-center">
      <div
        className={`bg-[#0a0a0a] p-3 rounded-xl border border-white/10 shadow-2xl transition-all ${
          fullscreen ? "scale-110" : "scale-90"
        }`}
      >
        <svg
          viewBox="0 0 100 150"
          className={fullscreen ? "w-20 h-32" : "w-14 h-22"}
        >
          {/* segments a-g + dp */}
          <polygon
            points="20,10 80,10 75,20 25,20"
            fill={s[0] ? ON : OFF}
            className={s[0] ? gClass : "opacity-10"}
          />
          <polygon
            points="85,15 85,70 75,65 75,25"
            fill={s[1] ? ON : OFF}
            className={s[1] ? gClass : "opacity-10"}
          />
          <polygon
            points="85,80 85,135 75,125 75,85"
            fill={s[2] ? ON : OFF}
            className={s[2] ? gClass : "opacity-10"}
          />
          <polygon
            points="20,140 80,140 75,130 25,130"
            fill={s[3] ? ON : OFF}
            className={s[3] ? gClass : "opacity-10"}
          />
          <polygon
            points="15,80 15,135 25,125 25,85"
            fill={s[4] ? ON : OFF}
            className={s[4] ? gClass : "opacity-10"}
          />
          <polygon
            points="15,15 15,70 25,65 25,25"
            fill={s[5] ? ON : OFF}
            className={s[5] ? gClass : "opacity-10"}
          />
          <polygon
            points="20,75 75,75 70,85 25,85"
            fill={s[6] ? ON : OFF}
            className={s[6] ? gClass : "opacity-10"}
          />
          <circle
            cx="90"
            cy="140"
            r="5"
            fill={s[7] ? ON : OFF}
            className={s[7] ? gClass : "opacity-10"}
          />
        </svg>
      </div>
      <span
        className={`text-white/30 mt-1 font-mono uppercase font-black ${
          fullscreen ? "text-xs" : "text-[9px]"
        }`}
      >
        {label}
      </span>
      <span className="text-[8px] text-white/15 font-mono tabular-nums">
        0x{value.toString(16).toUpperCase().padStart(2, "0")}
      </span>
    </div>
  );
};

// ─── ADC potentiometer slider ─────────────────────────────────────────────────
const ADCSlider = ({ value, onChange, fullscreen = false }) => {
  const pct = Math.round((value / 255) * 100);
  return (
    <div
      className={`flex flex-col gap-2 bg-black/40 rounded-xl border border-white/5 ${fullscreen ? "p-4" : "p-3"}`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <Zap size={10} className="text-yellow-400" />
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
            ADC — ADRESH
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-yellow-400 font-black tabular-nums">
            {pct}%
          </span>
          <span className="text-[9px] font-mono text-white/20 tabular-nums">
            0x{value.toString(16).toUpperCase().padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative">
        <input
          type="range"
          min="0"
          max="255"
          step="1"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-yellow-400"
          style={{
            background: `linear-gradient(to right, #eab308 0%, #eab308 ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
          }}
        />
      </div>

      <div className="flex justify-between text-[7px] font-mono text-white/10">
        <span>0V (0x00)</span>
        <span>VDD (0xFF)</span>
      </div>
    </div>
  );
};

// ─── LED bar with hex readout ─────────────────────────────────────────────────
const LedBar = ({ portValue, color, fullscreen }) => (
  <div className="flex flex-col gap-1.5">
    <div
      className={`flex justify-around items-end ${fullscreen ? "gap-6" : "gap-1"}`}
    >
      {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => (
        <LED
          key={bit}
          label={`D${bit}`}
          isOn={(portValue & (1 << bit)) !== 0}
          color={color}
          fullscreen={fullscreen}
        />
      ))}
    </div>
    {/* PORTD hex + binary readout */}
    <div className="flex items-center justify-center gap-3 mt-1">
      <span className="text-[8px] text-white/20 font-mono uppercase">
        PORTD
      </span>
      <span className="text-[11px] text-white/70 font-mono font-black tabular-nums">
        0x{portValue.toString(16).toUpperCase().padStart(2, "0")}
      </span>
      <span className="text-[9px] text-white/20 font-mono tabular-nums">
        {portValue.toString(2).padStart(8, "0")}
      </span>
    </div>
  </div>
);

// ─── Main Platine component ───────────────────────────────────────────────────
const Platine = ({
  state,
  onInputChange,
  ledColor = "red",
  fullscreen = false,
}) => {
  if (!state)
    return (
      <div className="p-10 text-white/30 font-mono text-sm animate-pulse">
        WAITING FOR HARDWARE…
      </div>
    );

  const handlePushDown = (bit) =>
    onInputChange("PORTA", (state.PORTA | (1 << bit)) & 0xff);
  const handlePushUp = (bit) =>
    onInputChange("PORTA", state.PORTA & ~(1 << bit) & 0xff);
  const handleDipToggle = (bit) =>
    onInputChange("PORTB", (state.PORTB ^ (1 << bit)) & 0xff);
  const handleADC = (val) => onInputChange("ADRESH", val & 0xff);

  return (
    <div
      className={`w-full h-full flex flex-col items-center p-2 sm:p-4 overflow-y-auto overflow-x-hidden ${
        fullscreen ? "bg-black/60" : "bg-transparent"
      }`}
    >
      {/* ── PCB board ────────────────────────────────────────────── */}
      <div
        className={`w-full transition-all duration-700 bg-[#0d2b17] rounded-[2rem] border-[8px] border-[#081a0e] shadow-2xl relative ${
          fullscreen
            ? "max-w-[1400px] min-h-[85vh] p-8 mt-10 scale-100"
            : "max-w-[1000px] p-5 sm:p-7 scale-[0.98] origin-top"
        }`}
      >
        {/* Board label */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-6 py-0.5 bg-black/40 rounded-full border border-white/5 text-[8px] text-white/10 font-mono tracking-[0.6em] uppercase select-none pointer-events-none">
          PIC16F1789 Laboratory System v3.0
        </div>

        {/* Corner screws */}
        <div className="absolute top-6 left-6">
          <Screw />
        </div>
        <div className="absolute top-6 right-6">
          <Screw />
        </div>
        <div className="absolute bottom-6 left-6">
          <Screw />
        </div>
        <div className="absolute bottom-6 right-6">
          <Screw />
        </div>

        <div
          className={`flex flex-col relative z-10 gap-3 ${fullscreen ? "pt-6" : "pt-3"}`}
        >
          {/* ── 1. Header ───────────────────────────────────────── */}
          <div className="flex justify-between items-center border-b border-white/8 pb-2">
            <div className="flex items-center gap-2">
              <div className="bg-yellow-500/10 p-1.5 rounded-lg border border-yellow-500/20">
                <ShieldCheck className="text-yellow-500" size={14} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-sm font-black text-[#a0c0a0] tracking-tighter uppercase">
                  LYON 1 — GEII
                </span>
                <span className="text-[6px] text-white/20 tracking-widest uppercase mt-0.5">
                  PIC SIMU V3 · MINI
                </span>
              </div>
            </div>

            {/* Status panel */}
            <div className="bg-black/80 px-3 py-2 rounded-lg border border-white/5 flex items-center gap-4 shadow-xl scale-75 origin-right">
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
                  <span className="text-[6px] font-black text-white/30 uppercase">
                    Online
                  </span>
                </div>
                <span className="text-[6px] font-bold text-emerald-400">
                  PROD_ENV
                </span>
              </div>
              <div className="w-px h-6 bg-white/5" />
              <div className="flex flex-col items-center gap-0.5">
                <Activity size={12} className="text-indigo-400" />
                <span className="text-[7px] font-black text-white/30 uppercase">
                  Status
                </span>
              </div>
            </div>
          </div>

          {/* ── 2. LED strip (PORTD outputs) ─────────────────────── */}
          <div className="bg-black/30 px-4 py-3 rounded-xl border border-white/5">
            <div className="text-[8px] text-white/20 font-mono uppercase tracking-widest mb-2 font-black">
              PORTD — Sorties LED
            </div>
            <LedBar
              portValue={state.PORTD}
              color={ledColor}
              fullscreen={fullscreen}
            />
          </div>

          {/* ── 3. LCD + 7-segments ───────────────────────────────── */}
          <div
            className={`grid grid-cols-1 lg:grid-cols-2 ${fullscreen ? "gap-8" : "gap-3"}`}
          >
            <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1 min-h-[110px]">
              <div className="text-[8px] text-white/20 font-mono uppercase tracking-widest font-black self-start">
                LCD · HD44780
              </div>
              <LCDScreen
                line1={state.LCD_LINE1}
                line2={state.LCD_LINE2}
                fullscreen={fullscreen}
              />
            </div>

            <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex flex-col gap-1">
              <div className="text-[8px] text-white/20 font-mono uppercase tracking-widest font-black">
                7-SEG — PORTC / PORTE
              </div>
              <div
                className={`flex justify-center items-center ${fullscreen ? "gap-12" : "gap-6"}`}
              >
                <SevenSegment
                  value={state.PORTC}
                  label="SEG_A (PORTC)"
                  fullscreen={fullscreen}
                />
                <SevenSegment
                  value={state.PORTE}
                  label="SEG_B (PORTE)"
                  fullscreen={fullscreen}
                />
              </div>
            </div>
          </div>

          {/* ── 4. ADC Potentiometer ─────────────────────────────── */}
          <div className="bg-black/30 px-4 py-3 rounded-xl border border-yellow-500/10">
            <div className="text-[8px] text-white/20 font-mono uppercase tracking-widest mb-2 font-black">
              ADC — Potentiomètre (ADRESH)
            </div>
            <ADCSlider
              value={state.ADRESH ?? 0}
              onChange={handleADC}
              fullscreen={fullscreen}
            />
          </div>

          {/* ── 5. Input zone: Buttons + DIP switches ────────────── */}
          <div
            className={`flex flex-col xl:flex-row ${fullscreen ? "gap-6" : "gap-3"}`}
          >
            {/* Push buttons — PORTA */}
            <div
              className={`flex-1 bg-black/40 rounded-xl border border-white/8 ${fullscreen ? "p-6" : "p-3"}`}
            >
              <div className="text-[8px] text-white/20 font-mono uppercase tracking-widest mb-2 font-black">
                PORTA — Boutons poussoirs (RA0–RA7)
              </div>
              <div
                className={`flex justify-around items-center ${fullscreen ? "gap-4" : "gap-1"}`}
              >
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
              {/* PORTA hex readout */}
              <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-white/5">
                <span className="text-[8px] text-white/20 font-mono uppercase">
                  PORTA
                </span>
                <span className="text-[10px] text-indigo-300 font-mono font-black tabular-nums">
                  0x
                  {(state.PORTA ?? 0)
                    .toString(16)
                    .toUpperCase()
                    .padStart(2, "0")}
                </span>
                <span className="text-[9px] text-white/15 font-mono tabular-nums">
                  {(state.PORTA ?? 0).toString(2).padStart(8, "0")}
                </span>
              </div>
            </div>

            {/* DIP switches — PORTB */}
            <div
              className={`bg-black/40 rounded-xl border border-white/8 relative flex items-center justify-center flex-1 ${
                fullscreen ? "p-6 px-10" : "p-3"
              }`}
            >
              <div className="absolute top-3 left-4 text-[8px] text-white/20 font-mono uppercase tracking-widest font-black">
                PORTB — Interrupteurs DIP
              </div>
              <DipSwitch
                portValue={state.PORTB}
                onToggle={handleDipToggle}
                fullscreen={fullscreen}
              />
            </div>
          </div>

          {/* ── 6. Peripherals footer ───────────────────────────── */}
          <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-center gap-6">
              {/* Buzzer indicator */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                    state.PORTC & 0x80
                      ? "bg-red-500/20 border-red-500 shadow-[0_0_12px_#ff0000]"
                      : "bg-black/40 border-white/5"
                  }`}
                >
                  <Volume2
                    size={15}
                    className={
                      state.PORTC & 0x80 ? "text-red-400" : "text-white/8"
                    }
                  />
                </div>
                <span
                  className={`text-[8px] font-mono font-black ${
                    state.PORTC & 0x80 ? "text-red-400" : "text-white/15"
                  }`}
                >
                  BUZZER
                </span>
              </div>

              {/* CPU register mini panel */}
              <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-lg border border-white/5">
                {[
                  { n: "W", v: state.W ?? 0 },
                  { n: "STATUS", v: state.STATUS ?? 0 },
                  { n: "BSR", v: state.BSR ?? 0 },
                  { n: "PCL", v: state.PCL ?? 0 },
                ].map((r) => (
                  <div
                    key={r.n}
                    className="flex items-center gap-1 text-[8px] font-mono"
                  >
                    <span className="text-white/20">{r.n}:</span>
                    <span className="text-emerald-400 bg-white/5 px-1 rounded tabular-nums border border-white/5">
                      0x{r.v.toString(16).toUpperCase().padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-[7px] text-white/10 font-mono italic">
                SYST_RUNNING_OK
              </div>
            </div>

            {/* Signature bar */}
            <div className="border-t border-white/5 pt-2 flex justify-between items-center px-2">
              <span className="text-[6px] text-white/15 font-black uppercase tracking-widest">
                LYON 1 UCBL
              </span>
              <span className="text-[8px] text-indigo-400/50 font-black italic tracking-tight">
                Fait par Rafael — Étudiant GEII
              </span>
              <span className="text-[6px] text-white/15 font-black uppercase tracking-widest">
                2026-PROMO
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-[9px] font-mono text-white/5 tracking-[1em] uppercase">
        Logic Unit Synchronized // PIC16F1789
      </div>
    </div>
  );
};

export default Platine;
