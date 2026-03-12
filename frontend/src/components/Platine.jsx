import React from 'react';
import { Volume2, Zap, ShieldCheck, Info, Cpu, Activity } from 'lucide-react';

const Screw = () => (
  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 border border-black/40 shadow-inner flex items-center justify-center relative">
    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
      <div className="w-full h-px bg-gray-900/40 rotate-45 absolute"></div>
      <div className="w-full h-px bg-gray-900/40 -rotate-45 absolute"></div>
    </div>
  </div>
);

const LCDScreen = ({ line1 = "", line2 = "", fullscreen = false }) => {
  const defaultLine1 = "SIMU-PIC v2.5";
  const defaultLine2 = "GEII - LYON 1";
  
  const display1 = (line1 && line1.trim()) ? line1 : defaultLine1;
  const display2 = (line2 && line2.trim()) ? line2 : defaultLine2;

  return (
    <div className="flex flex-col items-center">
      <div className={`bg-[#0a0a0a] p-2 rounded-xl shadow-2xl border border-white/10 relative overflow-hidden transition-all duration-500 ${fullscreen ? 'scale-110 my-4' : 'scale-100'}`}>
        <div className={`bg-[#1a1a1a] p-4 min-w-[280px] rounded border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] ${fullscreen ? 'min-w-[400px]' : ''}`}>
          <div className={`font-mono text-[#00ff41] tracking-[0.2em] font-black uppercase drop-shadow-[0_0_5px_rgba(0,255,65,0.8)] ${fullscreen ? 'text-2xl' : 'text-sm'}`}>
            {display1.substring(0, 16)}
          </div>
          <div className={`font-mono text-[#00ff41] tracking-[0.2em] font-black uppercase mt-1 drop-shadow-[0_0_5px_rgba(0,255,65,0.8)] ${fullscreen ? 'text-2xl' : 'text-sm'}`}>
            {display2.substring(0, 16)}
          </div>
        </div>
      </div>
      <span className={`text-white/30 font-mono mt-2 tracking-widest ${fullscreen ? 'text-xs' : 'text-[10px]'}`}>PERIPH: LCD_HD44780_GREEN_NIGHT</span>
    </div>
  );
};

const TactileButton = ({ label, bitIndex, isPressed, onDown, onUp, fullscreen = false }) => (
  <div className="flex flex-col items-center">
    <div 
      onMouseDown={() => onDown(bitIndex)} onMouseUp={() => onUp(bitIndex)} onMouseLeave={() => isPressed && onUp(bitIndex)}
      className={`rounded-xl flex items-center justify-center border-2 transition-all cursor-pointer ${
        fullscreen ? 'w-12 h-12' : 'w-9 h-9 sm:w-10 sm:h-10'
      } ${isPressed ? 'bg-indigo-500 border-white scale-95 shadow-inner' : 'bg-[#333] border-white/20 hover:border-white/40 shadow-lg'}`}
    >
      <div className={`rounded-full border border-black/20 ${fullscreen ? 'w-6 h-6' : 'w-4 h-4'} ${isPressed ? 'bg-indigo-300' : 'bg-[#444]'}`}></div>
    </div>
    <span className={`font-mono mt-1 font-bold ${fullscreen ? 'text-[10px]' : 'text-[8px]'} ${isPressed ? 'text-indigo-400' : 'text-white/60'}`}>{label}</span>
  </div>
);

const DipSwitch = ({ portValue, onToggle, fullscreen = false }) => (
  <div className={`bg-[#b30000] p-3 rounded-lg flex flex-wrap justify-center border-2 border-black/50 shadow-2xl transition-all gap-1 ${fullscreen ? 'scale-110' : 'scale-90 sm:scale-100'}`}>
    {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => {
      const isOn = (portValue & (1 << bit)) !== 0;
      return (
        <div key={bit} className="flex flex-col items-center" onClick={() => onToggle(bit)}>
          <span className="text-[8px] text-white/80 font-black mb-1">{bit}</span>
          <div className="w-8 h-12 bg-black/40 rounded p-1 cursor-pointer border border-black/50">
            <div className={`w-full h-5 rounded-sm transition-all flex items-center justify-center text-[8px] font-black ${
              isOn 
              ? 'mt-0 bg-white border-white text-red-700 shadow-[0_0_10px_white]' 
              : 'mt-5 bg-white/10 border-white/30 text-white opacity-40'
            }`}>
               {isOn ? 'ON' : 'OFF'}
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

const LED = ({ label, isOn, color = 'green', fullscreen = false }) => {
  const colors = {
    red: 'bg-red-500 shadow-[0_0_15px_#ff0000]',
    green: 'bg-green-500 shadow-[0_0_15px_#22c55e]',
    blue: 'bg-indigo-500 shadow-[0_0_15px_#6366f1]'
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`rounded-full border border-white/5 transition-all duration-300 ${
        fullscreen ? 'w-6 h-6' : 'w-3 h-3 sm:w-4 sm:h-4'
      } ${isOn ? colors[color] : 'bg-[#1a1a1a]'}`}></div>
      {label && <span className={`font-black mt-1 ${fullscreen ? 'text-[8px]' : 'text-[6px]'} ${isOn ? 'text-white/80' : 'text-white/10'}`}>{label}</span>}
    </div>
  );
};

const SevenSegment = ({ value, label, fullscreen = false }) => {
  const s = [(value&1)!=0, (value&2)!=0, (value&4)!=0, (value&8)!=0, (value&16)!=0, (value&32)!=0, (value&64)!=0, (value&128)!=0];
  const onColor = "#ff3333";
  const offColor = "#1a1a2e";
  const glow = "shadow-[0_0_15px_rgba(255,51,51,0.8)]";

  return (
    <div className="flex flex-col items-center">
      <div className={`bg-[#0a0a0a] p-4 rounded-xl border border-white/10 shadow-3xl transition-all ${fullscreen ? 'scale-110' : 'scale-90'}`}>
        <svg viewBox="0 0 100 150" className={`${fullscreen ? 'w-20 h-32' : 'w-16 h-24'}`}>
          <polygon points="20,10 80,10 75,20 25,20" fill={s[0] ? onColor : offColor} className={s[0] ? "drop-shadow-[0_0_8px_rgba(255,51,51,0.9)]" : "opacity-20"} />
          <polygon points="85,15 85,70 75,65 75,25" fill={s[1] ? onColor : offColor} className={s[1] ? "drop-shadow-[0_0_8px_rgba(255,51,51,0.9)]" : "opacity-20"} />
          <polygon points="85,80 85,135 75,125 75,85" fill={s[2] ? onColor : offColor} className={s[2] ? "drop-shadow-[0_0_8px_rgba(255,51,51,0.9)]" : "opacity-20"} />
          <polygon points="20,140 80,140 75,130 25,130" fill={s[3] ? onColor : offColor} className={s[3] ? "drop-shadow-[0_0_8px_rgba(255,51,51,0.9)]" : "opacity-20"} />
          <polygon points="15,80 15,135 25,125 25,85" fill={s[4] ? onColor : offColor} className={s[4] ? "drop-shadow-[0_0_8px_rgba(255,51,51,0.9)]" : "opacity-20"} />
          <polygon points="15,15 15,70 25,65 25,25" fill={s[5] ? onColor : offColor} className={s[5] ? "drop-shadow-[0_0_8px_rgba(255,51,51,0.9)]" : "opacity-20"} />
          <polygon points="20,75 75,75 70,85 25,85" fill={s[6] ? onColor : offColor} className={s[6] ? "drop-shadow-[0_0_8px_rgba(255,51,51,0.9)]" : "opacity-20"} />
          <circle cx="90" cy="140" r="5" fill={s[7] ? onColor : offColor} className={s[7] ? "drop-shadow-[0_0_8px_rgba(255,51,51,0.9)]" : "opacity-20"} />
        </svg>
      </div>
      <span className={`text-white/40 mt-2 font-mono uppercase font-black ${fullscreen ? 'text-xs' : 'text-[10px]'}`}>{label}</span>
    </div>
  );
};

const Platine = ({ state, onInputChange, ledColor = 'red', fullscreen = false }) => {
  if (!state) return <div className="p-10 text-white font-mono">WAITING FOR HARDWARE...</div>;

  const handlePushDown = (bit) => onInputChange("PORTA", state.PORTA | (1 << bit));
  const handlePushUp = (bit) => onInputChange("PORTA", state.PORTA & ~(1 << bit));
  const handleDipToggle = (bit) => onInputChange("PORTB", state.PORTB ^ (1 << bit));

  return (
    <div className={`w-full h-full flex flex-col items-center p-2 sm:p-4 overflow-y-auto overflow-x-hidden ${fullscreen ? 'bg-black/60' : 'bg-transparent'}`}>
      {/* THE MAIN PCB */}
      <div className={`w-full transition-all duration-700 bg-[#0d2b17] rounded-[2rem] border-[8px] border-[#081a0e] p-6 sm:p-8 shadow-2xl relative ${
        fullscreen ? 'max-w-[1400px] min-h-[85vh] scale-100 mt-10' : 'max-w-[1000px] scale-[0.98] origin-top'
      }`}>
        
        {/* Decorative elements */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-6 py-0.5 bg-black/40 rounded-full border border-white/5 text-[8px] text-white/10 font-mono tracking-[0.6em] uppercase">
             PIC16F1789 Laboratory System v3.0
        </div>
        
        <div className="absolute top-6 left-6"><Screw /></div>
        <div className="absolute top-6 right-6"><Screw /></div>
        <div className="absolute bottom-6 left-6"><Screw /></div>
        <div className="absolute bottom-6 right-6"><Screw /></div>

        <div className={`flex flex-col relative z-10 ${fullscreen ? 'pt-4' : 'pt-2'}`}>
          
          {/* 1. TOP ZONE: Header & Indicators */}
          <div className={`flex justify-between items-center border-b border-white/10 ${fullscreen ? 'pb-4' : 'pb-2'}`}>
            <div className="flex items-center space-x-2">
               <div className="bg-yellow-500/10 p-1.5 rounded-lg border border-yellow-500/20">
                  <ShieldCheck className="text-yellow-500" size={14} />
               </div>
               <div className="flex flex-col">
                  <span className="text-base font-black text-[#a0c0a0] tracking-tighter uppercase leading-none">LYON 1 - GEII</span>
                  <span className="text-[6px] text-white/20 tracking-[0.1em] uppercase">PIC SIMU V3_MINI</span>
               </div>
            </div>
            
            <div className="bg-black/80 px-2 py-1.5 rounded-lg border border-white/5 flex items-center space-x-4 shadow-xl scale-75 origin-right">
               <div className="flex flex-col items-center px-1">
                  <div className="flex items-center space-x-1 mb-1">
                     <div className={`w-1.5 h-1.5 rounded-full ${state ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></div>
                     <span className="text-[6px] font-black text-white/40 uppercase">Railway_Ready</span>
                  </div>
                  <span className="text-[6px] font-bold text-emerald-400">PROD_ENV</span>
               </div>
               <div className="w-px h-6 bg-white/5"></div>
               <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full mb-1 ${state ? 'bg-indigo-500 shadow-[0_0_15px_#6366f1]' : 'bg-red-500'}`}></div>
                  <span className="text-[7px] font-black text-white/30 uppercase">STATUS</span>
               </div>
            </div>
          </div>

          {/* 2. OUTPUT ZONE: LEDs */}
          <div className="bg-black/30 p-2 rounded-lg border border-white/5 mx-2">
           <div className={`flex justify-around items-center flex-wrap ${fullscreen ? 'gap-6' : 'gap-1'}`}>
              {[7,6,5,4,3,2,1,0].map(bit => (
                <LED key={bit} label={null} isOn={(state.PORTD & (1 << bit)) !== 0} color={ledColor} fullscreen={fullscreen} />
              ))}
           </div>
        </div>

        {/* 3. DISPLAY & INPUTS MIX */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 ${fullscreen ? 'gap-8 my-6' : 'gap-3'}`}>
           <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex items-center justify-center min-h-[100px]">
              <LCDScreen line1={state.LCD_LINE1} line2={state.LCD_LINE2} fullscreen={fullscreen} />
           </div>
           <div className={`bg-black/30 p-4 rounded-lg border border-white/5 flex justify-center items-center ${fullscreen ? 'gap-12' : 'gap-6'}`}>
              <SevenSegment value={state.PORTC} label="SEG_A" fullscreen={fullscreen} />
              <SevenSegment value={state.PORTE} label="SEG_B" fullscreen={fullscreen} />
           </div>
        </div>

        {/* 4. INPUT ZONE */}
        <div className={`flex flex-col xl:flex-row ${fullscreen ? 'gap-6' : 'gap-3'}`}>
           <div className={`flex-1 bg-black/40 rounded-xl border border-white/10 relative ${fullscreen ? 'p-6' : 'p-3'}`}>
              <div className={`flex justify-around items-center ${fullscreen ? 'gap-4' : 'gap-1'}`}>
                {[7,6,5,4,3,2,1,0].map(bit => (
                  <TactileButton key={bit} label={`RA${bit}`} bitIndex={bit} isPressed={(state.PORTA & (1 << bit)) !== 0} onDown={handlePushDown} onUp={handlePushUp} fullscreen={fullscreen} />
                ))}
              </div>
           </div>
           <div className={`bg-black/40 rounded-xl border border-white/10 relative flex items-center justify-center flex-1 ${fullscreen ? 'p-6 px-10' : 'p-3'}`}>
              <DipSwitch portValue={state.PORTB} onToggle={handleDipToggle} fullscreen={fullscreen} />
           </div>
        </div>

          {/* 5. PERIPHERALS & FOOTER */}
          <div className="bg-black/20 p-2 rounded-xl border border-white/5 flex flex-col items-center">
             <div className="flex items-center justify-center space-x-6 w-full mb-1">
                <div className="flex flex-col items-center">
                   <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${state.PORTC & 0x80 ? 'bg-red-500/20 border-red-500 shadow-[0_0_10px_#ff0000]' : 'bg-black/40 border-white/5'}`}>
                      <Volume2 size={16} className={state.PORTC & 0x80 ? 'text-red-500' : 'text-white/5'} />
                   </div>
                </div>
                <div className="text-[7px] text-white/10 font-mono italic">SYST_RUNNING_OK</div>
             </div>
             
             {/* Feature 1: Student Signature */}
             <div className="w-full border-t border-white/5 pt-1 mt-1 flex justify-between items-center px-4">
                <span className="text-[6px] text-white/20 font-black uppercase tracking-widest">LYON 1 UCBL</span>
                <span className="text-[8px] text-indigo-400/50 font-black italic tracking-tighter">Fait par Rafael - Étudiant en GEII</span>
                <span className="text-[6px] text-white/20 font-black uppercase tracking-widest">2026-PROMO</span>
             </div>
          </div>

        </div>
      </div>
      
      {/* Feature 10: CPU Register Panel (Compact) */}
      <div className="flex justify-center mt-4">
          <div className="bg-black/80 border border-white/10 rounded-xl p-2 px-4 flex items-center gap-6 backdrop-blur-3xl shadow-3xl border-b-emerald-500 border-b-2">
             <div className="flex items-center gap-2">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">Register_Sync</span>
             </div>
             <div className="flex gap-4">
                {[
                  { n: 'W', v: state.W || 0 },
                  { n: 'BSR', v: state.BSR || 0 },
                  { n: 'STATUS', v: state.STATUS || 0 },
                  { n: 'PCL', v: state.PCL || 0 }
                ].map(r => (
                  <div key={r.n} className="flex gap-2 items-center text-[8px] font-mono">
                     <span className="text-white/20">{r.n}:</span>
                     <span className="text-emerald-400 bg-white/5 px-1 rounded tabular-nums border border-white/5">0x{r.v.toString(16).toUpperCase().padStart(2, '0')}</span>
                  </div>
                ))}
             </div>
          </div>
      </div>

      <div className="mt-6 text-[9px] font-mono text-white/5 tracking-[1em] uppercase">
          Logic Unit Synchronized // PIC16F1789
      </div>
    </div>
  );
};

export default Platine;
