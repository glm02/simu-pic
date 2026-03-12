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

const LCDScreen = ({ line1 = "", line2 = "" }) => (
  <div className="flex flex-col items-center">
    <div className="bg-[#1a1a1a] p-2 rounded-lg shadow-2xl border border-white/10 relative overflow-hidden">
      <div className="bg-[#8fbc8f] p-4 min-w-[280px] rounded shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
        <div className="font-mono text-[#0a1a00] text-xl tracking-[0.2em] font-black uppercase">
          {line1.padEnd(16, ' ').substring(0, 16)}
        </div>
        <div className="font-mono text-[#0a1a00] text-xl tracking-[0.2em] font-black uppercase mt-1">
          {line2.padEnd(16, ' ').substring(0, 16)}
        </div>
      </div>
    </div>
    <span className="text-[10px] text-white/30 font-mono mt-2 tracking-widest">PERIPH: LCD_DRIVER_4BIT</span>
  </div>
);

const TactileButton = ({ label, bitIndex, isPressed, onDown, onUp }) => (
  <div className="flex flex-col items-center">
    <div 
      onMouseDown={() => onDown(bitIndex)} onMouseUp={() => onUp(bitIndex)} onMouseLeave={() => isPressed && onUp(bitIndex)}
      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border-2 transition-all cursor-pointer ${isPressed ? 'bg-indigo-500 border-white scale-95 shadow-inner' : 'bg-[#333] border-white/20 hover:border-white/40 shadow-lg'}`}
    >
      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-black/20 ${isPressed ? 'bg-indigo-300' : 'bg-[#444]'}`}></div>
    </div>
    <span className={`text-[9px] sm:text-[10px] font-mono mt-2 font-bold ${isPressed ? 'text-indigo-400' : 'text-white/60'}`}>{label}</span>
  </div>
);

const DipSwitch = ({ portValue, onToggle }) => (
  <div className="bg-[#b30000] p-3 rounded-lg flex space-x-1 border-2 border-black/50 shadow-2xl scale-100 sm:scale-110">
    {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => {
      const isOn = (portValue & (1 << bit)) !== 0;
      return (
        <div key={bit} className="flex flex-col items-center" onClick={() => onToggle(bit)}>
          <span className="text-[9px] text-white font-bold mb-1">{bit}</span>
          <div className="w-5 h-12 bg-black rounded p-0.5 cursor-pointer">
            <div className={`w-full h-5 bg-white rounded-sm transition-all ${isOn ? 'mt-0' : 'mt-6'}`}></div>
          </div>
        </div>
      );
    })}
  </div>
);

const LED = ({ label, isOn, color = 'green' }) => {
  const colors = {
    red: 'bg-red-500 shadow-[0_0_15px_#ff0000]',
    green: 'bg-green-500 shadow-[0_0_15px_#22c55e]',
    blue: 'bg-indigo-500 shadow-[0_0_15px_#6366f1]'
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-white/5 transition-all duration-300 ${isOn ? colors[color] + ' animate-pulse' : 'bg-[#1a1a1a]'}`}></div>
      {label && <span className={`text-[6px] font-black mt-1 ${isOn ? 'text-white/80' : 'text-white/10'}`}>{label}</span>}
    </div>
  );
};

const SevenSegment = ({ value, label }) => {
  const s = [(value&1)!=0, (value&2)!=0, (value&4)!=0, (value&8)!=0, (value&16)!=0, (value&32)!=0, (value&64)!=0, (value&128)!=0];
  return (
    <div className="flex flex-col items-center">
      <div className="bg-black p-4 rounded-xl border border-white/10 shadow-3xl">
        <svg viewBox="0 0 100 150" className="w-12 h-18">
          <polygon points="20,10 80,10 75,20 25,20" fill={s[0] ? "#f00" : "#100"} />
          <polygon points="85,15 85,70 75,65 75,25" fill={s[1] ? "#f00" : "#100"} />
          <polygon points="85,80 85,135 75,125 75,85" fill={s[2] ? "#f00" : "#100"} />
          <polygon points="20,140 80,140 75,130 25,130" fill={s[3] ? "#f00" : "#100"} />
          <polygon points="15,80 15,135 25,125 25,85" fill={s[4] ? "#f00" : "#100"} />
          <polygon points="15,15 15,70 25,65 25,25" fill={s[5] ? "#f00" : "#100"} />
          <polygon points="20,75 75,75 70,85 25,85" fill={s[6] ? "#f00" : "#100"} />
          <circle cx="90" cy="140" r="5" fill={s[7] ? "#f00" : "#100"} />
        </svg>
      </div>
      <span className="text-[9px] text-white/40 mt-2 font-mono uppercase">{label}</span>
    </div>
  );
};

const Platine = ({ state, onInputChange, ledColor = 'red' }) => {
  if (!state) return <div className="p-10 text-white font-mono">WAITING FOR HARDWARE...</div>;

  const handlePushDown = (bit) => onInputChange("PORTA", state.PORTA | (1 << bit));
  const handlePushUp = (bit) => onInputChange("PORTA", state.PORTA & ~(1 << bit));
  const handleDipToggle = (bit) => onInputChange("PORTB", state.PORTB ^ (1 << bit));

  return (
    <div className="w-full h-full flex flex-col items-center bg-[#050505] p-2 sm:p-4 overflow-y-auto">
      {/* THE MAIN PCB */}
      <div className="w-full max-w-[850px] bg-[#0d2b17] rounded-[1.5rem] border-[6px] border-[#081a0e] p-4 sm:p-5 shadow-inner relative overflow-visible scale-[0.95] lg:scale-100 origin-top">
        
        {/* Decorative elements */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-6 py-0.5 bg-black/40 rounded-full border border-white/5 text-[8px] text-white/10 font-mono tracking-[0.6em] uppercase">
             PIC16F1789 Laboratory System v3.0
        </div>
        
        <div className="absolute top-6 left-6"><Screw /></div>
        <div className="absolute top-6 right-6"><Screw /></div>
        <div className="absolute bottom-6 left-6"><Screw /></div>
        <div className="absolute bottom-6 right-6"><Screw /></div>

        <div className="flex flex-col space-y-2 relative z-10 pt-1">
          
          {/* 1. TOP ZONE: Header & Indicators */}
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
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
             <div className="flex justify-around items-center flex-wrap gap-1">
                {[7,6,5,4,3,2,1,0].map(bit => (
                  <LED key={bit} label={null} isOn={(state.PORTD & (1 << bit)) !== 0} color={ledColor} />
                ))}
             </div>
          </div>

          {/* 3. DISPLAY & INPUTS MIX */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
             <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex items-center justify-center min-h-[80px]">
                <LCDScreen line1={state.LCD_LINE1} line2={state.LCD_LINE2} />
             </div>
             <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex justify-around items-center">
                <SevenSegment value={state.PORTC} label="SEG_A" />
                <SevenSegment value={state.PORTE} label="SEG_B" />
             </div>
          </div>

          {/* 4. INPUT ZONE */}
          <div className="flex flex-col xl:flex-row gap-2">
             <div className="flex-1 bg-black/40 p-2 rounded-lg border border-white/10 relative">
                <span className="absolute -top-1.5 left-4 bg-[#001a0a] px-2 text-[6px] font-black text-indigo-400/30 tracking-widest uppercase rounded-full">Inputs [PORTA]</span>
                <div className="flex justify-around items-center mt-1 gap-1">
                  {[7,6,5,4,3,2,1,0].map(bit => (
                    <TactileButton key={bit} label={`RA${bit}`} bitIndex={bit} isPressed={(state.PORTA & (1 << bit)) !== 0} onDown={handlePushDown} onUp={handlePushUp} />
                  ))}
                </div>
             </div>
             <div className="bg-black/40 p-2 rounded-lg border border-white/10 relative flex items-center justify-center min-w-fit">
                <span className="absolute -top-1.5 left-4 bg-[#001a0a] px-2 text-[6px] font-black text-white/15 tracking-widest uppercase rounded-full">Switches [PORTB]</span>
                <DipSwitch portValue={state.PORTB} onToggle={handleDipToggle} />
             </div>
          </div>

          {/* 5. PERIPHERALS */}
          <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center justify-center space-x-8">
             <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${state.PORTC & 0x80 ? 'bg-red-500/20 border-red-500' : 'bg-black/40 border-white/5'}`}>
                   <Volume2 size={16} className={state.PORTC & 0x80 ? 'text-red-500' : 'text-white/5'} />
                </div>
             </div>
             <div className="text-[7px] text-white/5 font-mono italic">UNIT_SYNC_ACTIVE</div>
          </div>

        </div>
      </div>
      
      <div className="mt-12 text-[10px] font-mono text-white/10 tracking-[1em] uppercase">
          Logic Unit Synchronized // PIC16F1789
      </div>
    </div>
  );
};

export default Platine;
