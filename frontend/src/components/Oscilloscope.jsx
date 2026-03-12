import React, { useMemo } from 'react';

const Oscilloscope = ({ history = [] }) => {
  const COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', 
    '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'
  ];

  const points = useMemo(() => {
    // history is an array of 8-bit values
    // We want to return an array of 8 strings (one for each bit)
    if (history.length < 2) return Array(8).fill("");
    
    return Array(8).fill(0).map((_, bitIndex) => {
      return history.map((val, x) => {
        const bitOn = (val & (1 << bitIndex)) !== 0;
        const y = bitOn ? (7 - bitIndex) * 20 + 2 : (7 - bitIndex) * 20 + 15;
        return `${x * 4},${y}`;
      }).join(' ');
    });
  }, [history]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-3 h-7 bg-black/60 border-b border-white/5">
        <span className="text-[9px] font-black tracking-widest text-[#00ff00]/60 uppercase flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff00] animate-pulse"></div>
            Realtime_Waveform [PORTD]
        </span>
        <span className="text-[8px] font-mono text-white/20 uppercase">Scale: 1ms/div</span>
      </div>
      <div className="flex-1 relative bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] bg-repeat opacity-90 overflow-hidden">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 240 160">
            {/* Grid Lines */}
            {[20, 40, 60, 80, 100, 120, 140].map(y => (
                <line key={y} x1="0" y1={y} x2="240" y2={y} stroke="rgba(0,255,0,0.05)" strokeWidth="0.5" />
            ))}
            
            {/* Waveforms */}
            {points.map((p, i) => (
                <polyline
                    key={i}
                    points={p}
                    fill="none"
                    stroke={COLORS[i]}
                    strokeWidth="1.5"
                    style={{ filter: `drop-shadow(0 0 2px ${COLORS[i]})` }}
                    className="transition-all duration-300"
                />
            ))}
        </svg>
      </div>
    </div>
  );
};

export default Oscilloscope;
