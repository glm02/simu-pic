import React, { useRef, useEffect } from "react";
import { Trash2, Terminal } from "lucide-react";

const Console = ({ logs, onClear }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-40 xl:h-48 bg-[#181818] border-t border-[#2a2a2a] flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-8 border-b border-[#2a2a2a] bg-[#1e1e1e] flex-shrink-0">
        <div className="flex items-center gap-3 h-full">
          <span className="text-white text-[11px] font-semibold border-b-2 border-blue-500 h-full flex items-center gap-1.5">
            <Terminal size={11} className="text-blue-400" />
            TERMINAL
          </span>
          <span className="text-[9px] font-mono text-white/20 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
            {logs.length}
          </span>
        </div>
        <button
          onClick={onClear}
          title="Effacer la console"
          className="p-1 rounded hover:bg-white/10 transition-colors group"
        >
          <Trash2
            size={13}
            className="text-white/30 group-hover:text-rose-400 transition-colors"
          />
        </button>
      </div>

      {/* Log lines */}
      <div
        ref={scrollRef}
        className="flex-1 px-3 py-2 overflow-y-auto font-mono text-[11px] space-y-0.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {logs.length === 0 && (
          <div className="text-white/10 italic pt-1">Aucun message…</div>
        )}

        {logs.map((log, i) => {
          const isObj = typeof log === "object" && log !== null;
          const text = isObj ? log.text : String(log);
          const time = isObj
            ? log.time
            : new Date().toLocaleTimeString([], { hour12: false });
          const type = isObj ? log.type : "info";

          let lineColor = "text-gray-400";
          let icon = "›";

          const lc = text.toLowerCase();

          if (
            type === "success" ||
            lc.includes("✓") ||
            lc.includes("terminée") ||
            lc.includes("chargé") ||
            lc.includes("copié") ||
            lc.includes("téléchargé")
          ) {
            lineColor = "text-emerald-400";
            icon = "✓";
          } else if (
            type === "error" ||
            lc.includes("⚠") ||
            lc.includes("erreur") ||
            lc.includes("perdue") ||
            lc.includes("invalide")
          ) {
            lineColor = "text-rose-400";
            icon = "⚠";
          } else if (
            type === "info" ||
            lc.includes("→") ||
            lc.includes("↺") ||
            lc.includes("transmission") ||
            lc.includes("initialisé") ||
            lc.includes("connexion")
          ) {
            lineColor = "text-indigo-400";
            icon = "→";
          } else if (lc.includes("formaté") || lc.includes("format")) {
            lineColor = "text-amber-400";
            icon = "⚡";
          }

          return (
            <div
              key={i}
              className={`flex items-start gap-2 leading-relaxed hover:bg-white/3 rounded px-1 -mx-1 transition-colors ${lineColor}`}
            >
              <span className="opacity-25 shrink-0 tabular-nums text-[10px] pt-px">
                [{time}]
              </span>
              <span className="shrink-0 opacity-70 pt-px">{icon}</span>
              <span className="break-all">{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Console;
