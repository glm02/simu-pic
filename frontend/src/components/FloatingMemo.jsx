import React, { useState, useRef } from 'react';
import { GripHorizontal } from 'lucide-react';

const FloatingMemo = () => {
  const [pos, setPos] = useState({ x: window.innerWidth - 200, y: 100 });
  const [dragging, setDragging] = useState(false);
  const rel = useRef(null);

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    setDragging(true);
    rel.current = {
      x: e.pageX - pos.x,
      y: e.pageY - pos.y
    };
    e.stopPropagation();
    e.preventDefault();
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    setPos({
      x: e.pageX - rel.current.x,
      y: e.pageY - rel.current.y
    });
    e.stopPropagation();
    e.preventDefault();
  };

  const onMouseUp = () => {
    setDragging(false);
  };

  React.useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging]);

  return (
    <div 
      style={{ left: pos.x, top: pos.y }}
      className="fixed w-36 bg-black/60 border border-white/10 rounded-lg p-2 backdrop-blur-md z-[100] shadow-2xl transition-shadow select-none hover:opacity-100 opacity-60"
    >
      <div 
        onMouseDown={onMouseDown}
        className="cursor-move flex items-center justify-center mb-1 text-white/20 hover:text-white/50 transition-colors"
      >
        <GripHorizontal size={14} />
      </div>
      <div className="space-y-1">
        {[
          { p: 'PortA', d: 'Buttons', c: 'text-indigo-300' },
          { p: 'PortB', d: 'Switches', c: 'text-white' },
          { p: 'PortC', d: 'SegA/Buzz', c: 'text-red-400' },
          { p: 'PortD', d: 'Leds', c: 'text-emerald-400' },
          { p: 'PortE', d: 'SegB', c: 'text-yellow-400' }
        ].map(item => (
           <div key={item.p} className="flex justify-between items-center text-[8px] font-black border-b border-white/5 pb-0.5">
              <span className="text-white/30 uppercase">{item.p}</span>
              <span className={`${item.c}/80`}>{item.d}</span>
           </div>
        ))}
      </div>
    </div>
  );
};

export default FloatingMemo;
