import React from 'react';
import { Trash2 } from 'lucide-react';

const Console = ({ logs, onClear }) => {
  return (
    <div className="h-40 xl:h-48 bg-[#181818] border-t border-[#333] flex flex-col flex-shrink-0">
      <div className="flex items-center justify-between px-4 h-8 text-[11px] font-semibold text-gray-400 border-b border-[#333] bg-[#252526]">
        <div className="flex space-x-4 h-full">
          <span className="text-white border-b border-blue-500 h-full flex items-center">TERMINAL</span>
        </div>
        <Trash2 
          size={14} 
          className="cursor-pointer hover:text-white transition-colors" 
          onClick={onClear} 
        />
      </div>
      <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] text-gray-400 space-y-1.5 scrollbar-thin">
        {logs.map((log, i) => {
          const isObject = typeof log === 'object';
          const text = isObject ? log.text : log;
          const time = isObject ? log.time : new Date().toLocaleTimeString([], {hour12: false});
          const type = isObject ? log.type : '';

          let colorClass = "text-gray-400";
          if (type === 'success' || text.includes("✓") || text.includes("Terminée")) colorClass = "text-emerald-400 flex items-center gap-2";
          if (type === 'error' || text.includes("⚠") || text.includes("Erreur")) colorClass = "text-rose-400 flex items-center gap-2";
          if (type === 'info' || text.includes("→") || text.includes("↺")) colorClass = "text-indigo-400 font-bold";
          
          return (
            <div key={i} className={`group flex items-start space-x-2 ${colorClass}`}>
              <span className="opacity-20 shrink-0">[{time}]</span>
              <span className="break-all">{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Console;
