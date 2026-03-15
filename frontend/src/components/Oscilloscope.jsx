import React, { useMemo } from "react";

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#d946ef",
];

const BIT_LABELS = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7"];

const CHANNELS = 8;
const VIEW_W = 240;
const VIEW_H = 160;
const CHANNEL_H = VIEW_H / CHANNELS; // 20 px per channel
const HIGH_OFF = 2; // y offset from top of channel when HIGH
const LOW_OFF = 13; // y offset from top of channel when LOW

/**
 * Build a digital step-waveform polyline string for a single bit channel.
 * Each sample occupies VIEW_W / (n-1) pixels.
 * Transitions are rendered as vertical jumps (right-angle corners).
 */
function buildDigitalPath(history, bitIndex) {
  if (history.length < 2) return "";

  const n = history.length;
  const xStep = VIEW_W / (n - 1);
  const channelTop = (CHANNELS - 1 - bitIndex) * CHANNEL_H;

  const pts = [];

  for (let i = 0; i < n; i++) {
    const x = i * xStep;
    const bitOn = (history[i] & (1 << bitIndex)) !== 0;
    const y = channelTop + (bitOn ? HIGH_OFF : LOW_OFF);

    if (i === 0) {
      pts.push(`${x},${y}`);
    } else {
      // Vertical segment first (keep x from previous sample), then move to new x
      const prevBitOn = (history[i - 1] & (1 << bitIndex)) !== 0;
      if (bitOn !== prevBitOn) {
        // vertical jump at current x
        pts.push(`${x},${channelTop + (prevBitOn ? HIGH_OFF : LOW_OFF)}`);
      }
      pts.push(`${x},${y}`);
    }
  }

  return pts.join(" ");
}

const Oscilloscope = ({ history = [] }) => {
  const paths = useMemo(
    () =>
      Array.from({ length: CHANNELS }, (_, i) => buildDigitalPath(history, i)),
    [history],
  );

  return (
    <div className="flex flex-col h-full bg-[#060606] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-7 bg-black/60 border-b border-white/5 flex-shrink-0">
        <span className="text-[9px] font-black tracking-widest text-[#00ff00]/60 uppercase flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff00] animate-pulse inline-block" />
          Waveform&nbsp;—&nbsp;PORTD
        </span>
        <span className="text-[8px] font-mono text-white/20 uppercase">
          {history.length}&nbsp;samples
        </span>
      </div>

      {/* Main oscilloscope area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Bit labels column */}
        <div
          className="flex flex-col justify-around py-0 shrink-0 border-r border-white/5 bg-black/40"
          style={{ width: 22 }}
        >
          {Array.from({ length: CHANNELS }, (_, i) => {
            const bitIndex = CHANNELS - 1 - i; // D7 at top → D0 at bottom
            const isActive =
              history.length > 0 &&
              (history[history.length - 1] & (1 << bitIndex)) !== 0;
            return (
              <div
                key={bitIndex}
                className="flex items-center justify-center"
                style={{ height: CHANNEL_H }}
              >
                <span
                  className="text-[7px] font-black font-mono uppercase"
                  style={{
                    color: isActive
                      ? COLORS[bitIndex]
                      : "rgba(255,255,255,0.12)",
                  }}
                >
                  {BIT_LABELS[bitIndex]}
                </span>
              </div>
            );
          })}
        </div>

        {/* SVG waveforms */}
        <div className="flex-1 relative overflow-hidden bg-[#030303]">
          <svg
            className="w-full h-full"
            preserveAspectRatio="none"
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          >
            {/* Horizontal channel dividers */}
            {Array.from({ length: CHANNELS + 1 }, (_, i) => (
              <line
                key={`h${i}`}
                x1="0"
                y1={i * CHANNEL_H}
                x2={VIEW_W}
                y2={i * CHANNEL_H}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="0.5"
              />
            ))}

            {/* Vertical time-grid lines (every quarter) */}
            {[VIEW_W * 0.25, VIEW_W * 0.5, VIEW_W * 0.75].map((x) => (
              <line
                key={`v${x}`}
                x1={x}
                y1="0"
                x2={x}
                y2={VIEW_H}
                stroke="rgba(0,255,0,0.04)"
                strokeWidth="0.5"
              />
            ))}

            {/* Waveforms */}
            {paths.map((pts, bitIndex) =>
              pts ? (
                <polyline
                  key={bitIndex}
                  points={pts}
                  fill="none"
                  stroke={COLORS[bitIndex]}
                  strokeWidth="1.2"
                  strokeLinejoin="miter"
                  style={{
                    filter: `drop-shadow(0 0 2px ${COLORS[bitIndex]}88)`,
                  }}
                />
              ) : null,
            )}

            {/* "No data" message */}
            {history.length < 2 && (
              <text
                x={VIEW_W / 2}
                y={VIEW_H / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.08)"
                fontSize="8"
                fontFamily="monospace"
              >
                EN ATTENTE DE DONNÉES…
              </text>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Oscilloscope;
