
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Wand2, Sun, Contrast, Droplet, Maximize } from 'lucide-react';

interface Rect { x: number; y: number; width: number; height: number; }
interface Point { x: number; y: number; }
interface CropModalProps {
  imageUrl: string;
  onConfirm: (croppedUrl: string, customPrompt?: string) => void;
  onCancel: () => void;
}

const CHANNELS = ['rgb', 'r', 'g', 'b'] as const;
type Channel = typeof CHANNELS[number];

const CropModal: React.FC<CropModalProps> = ({ imageUrl, onConfirm, onCancel }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [imgDisplaySize, setImgDisplaySize] = useState({ width: 0, height: 0 });
  
  const [activeChannel, setActiveChannel] = useState<Channel>('rgb');
  const [aiPrompt, setAiPrompt] = useState('');
  const [adjustments, setAdjustments] = useState({ brightness: 100, contrast: 100, saturation: 100 });
  const [curves, setCurves] = useState<Record<Channel, Point[]>>({
    rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    r: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    g: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    b: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
  });

  const [activePointIdx, setActivePointIdx] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | 'curve' | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startCrop, setStartCrop] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });

  const handleImageLoad = () => {
    if (!imgRef.current) return;
    const { width, height } = imgRef.current;
    setImgDisplaySize({ width, height });
    setCrop({ x: width * 0.1, y: height * 0.1, width: width * 0.8, height: height * 0.8 });
  };

  const getCurveValue = (points: Point[], x: number) => {
    const sorted = [...points].sort((a, b) => a.x - b.x);
    if (x <= sorted[0].x) return sorted[0].y;
    if (x >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;
    for (let i = 0; i < sorted.length - 1; i++) {
      const p1 = sorted[i]; const p2 = sorted[i+1];
      if (x >= p1.x && x <= p2.x) return p1.y + (x - p1.x) * (p2.y - p1.y) / (p2.x - p1.x);
    }
    return x;
  };

  const generateTable = (chan: Channel) => {
    const master = curves.rgb;
    const spec = curves[chan];
    const vals = [];
    for (let i = 0; i < 256; i++) {
      const v = getCurveValue(spec, getCurveValue(master, i));
      vals.push((Math.max(0, Math.min(255, v)) / 255).toFixed(3));
    }
    return vals.join(' ');
  };

  const tableR = useMemo(() => generateTable('r'), [curves]);
  const tableG = useMemo(() => generateTable('g'), [curves]);
  const tableB = useMemo(() => generateTable('b'), [curves]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragType) return;
    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;

    if (dragType === 'curve' && activePointIdx !== null) {
      const rect = document.getElementById('curves-area')!.getBoundingClientRect();
      const nx = Math.max(0, Math.min(255, Math.round(((e.clientX - rect.left) / rect.width) * 255)));
      const ny = Math.max(0, Math.min(255, Math.round(255 - ((e.clientY - rect.top) / rect.height) * 255)));
      setCurves(prev => {
        const pts = [...prev[activeChannel]];
        if (activePointIdx === 0) pts[0] = { x: 0, y: ny };
        else if (activePointIdx === pts.length - 1) pts[pts.length - 1] = { x: 255, y: ny };
        else pts[activePointIdx] = { x: nx, y: ny };
        return { ...prev, [activeChannel]: pts.sort((a,b) => a.x - b.x) };
      });
      return;
    }

    const { width: imgW, height: imgH } = imgDisplaySize;
    let newCrop = { ...startCrop };

    switch (dragType) {
      case 'move':
        newCrop.x = Math.max(0, Math.min(imgW - startCrop.width, startCrop.x + dx));
        newCrop.y = Math.max(0, Math.min(imgH - startCrop.height, startCrop.y + dy));
        break;
      case 'se':
        newCrop.width = Math.max(40, Math.min(imgW - startCrop.x, startCrop.width + dx));
        newCrop.height = Math.max(40, Math.min(imgH - startCrop.y, startCrop.height + dy));
        break;
      case 'nw':
        const moveX = Math.min(dx, startCrop.width - 40);
        const moveY = Math.min(dy, startCrop.height - 40);
        newCrop.x = Math.max(0, startCrop.x + moveX);
        newCrop.y = Math.max(0, startCrop.y + moveY);
        newCrop.width = startCrop.width - (newCrop.x - startCrop.x);
        newCrop.height = startCrop.height - (newCrop.y - startCrop.y);
        break;
      case 'ne':
        const moveY_ne = Math.min(dy, startCrop.height - 40);
        newCrop.y = Math.max(0, startCrop.y + moveY_ne);
        newCrop.width = Math.max(40, Math.min(imgW - startCrop.x, startCrop.width + dx));
        newCrop.height = startCrop.height - (newCrop.y - startCrop.y);
        break;
      case 'sw':
        const moveX_sw = Math.min(dx, startCrop.width - 40);
        newCrop.x = Math.max(0, startCrop.x + moveX_sw);
        newCrop.width = startCrop.width - (newCrop.x - startCrop.x);
        newCrop.height = Math.max(40, Math.min(imgH - startCrop.y, startCrop.height + dy));
        break;
    }
    setCrop(newCrop);
  }, [isDragging, dragType, startPos, startCrop, imgDisplaySize, activePointIdx, activeChannel]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', () => { setIsDragging(false); setDragType(null); setActivePointIdx(null); });
    }
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [isDragging, onMouseMove]);

  const handleMouseDown = (e: React.MouseEvent, type: typeof dragType, pIdx?: number) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragType(type);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartCrop({ ...crop });
    if (pIdx !== undefined) setActivePointIdx(pIdx);
  };

  const addCurvePoint = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 255);
    const y = Math.round(255 - ((e.clientY - rect.top) / rect.height) * 255);
    setCurves(prev => {
      const pts = [...prev[activeChannel]];
      const exists = pts.some(p => Math.abs(p.x - x) < 10);
      if (exists) return prev;
      return { ...prev, [activeChannel]: [...pts, {x, y}].sort((a,b) => a.x - b.x) };
    });
  };

  const curveDataPath = useMemo(() => {
    const pts = curves[activeChannel];
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.x / 255) * 100} ${(1 - p.y / 255) * 100}`).join(' ');
    const fill = `${path} L 100 100 L 0 100 Z`;
    return { path, fill };
  }, [curves, activeChannel]);

  const filterString = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) url(#pro-grading-filter)`;

  const handleConfirm = async () => {
    if (!imgRef.current) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    ctx.filter = filterString;
    ctx.drawImage(imgRef.current, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, canvas.width, canvas.height);
    onConfirm(canvas.toDataURL('image/jpeg', 0.95), aiPrompt);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 bg-black/95 backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-500">
      <svg width="0" height="0" className="absolute">
        <filter id="pro-grading-filter">
          <feComponentTransfer>
            <feFuncR type="table" tableValues={tableR} />
            <feFuncG type="table" tableValues={tableG} />
            <feFuncB type="table" tableValues={tableB} />
          </feComponentTransfer>
        </filter>
        <linearGradient id="curve-fill-grad" x1="0" x2="0" y1="0" y2="1">
           <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.5" />
           <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
        </linearGradient>
      </svg>
      
      <div className="bg-[var(--bg-main)] w-full max-w-7xl h-full rounded-[3.5rem] overflow-hidden flex flex-col border border-white/5 shadow-[0_40px_150px_rgba(0,0,0,1)]">
        <div className="px-12 py-8 border-b border-white/5 flex items-center justify-between bg-black/10">
          <div>
            <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Asset Mastering</h3>
            <p className="text-[10px] text-[#2dd4bf] font-black tracking-[0.5em] uppercase mt-1">Calibration Engine</p>
          </div>
          <button onClick={onCancel} className="p-3 hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white"><X size={28} /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative bg-black/20 flex items-center justify-center p-16 select-none overflow-hidden">
             <div className="relative inline-block border border-white/5 shadow-2xl">
               <img ref={imgRef} src={imageUrl} onLoad={handleImageLoad} style={{ filter: filterString }} className="max-h-[50vh] rounded-2xl ring-1 ring-white/10" draggable={false} />
               
               <div style={{ left: crop.x, top: crop.y, width: crop.width, height: crop.height }} className="absolute border-2 border-[#2dd4bf] cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0.75)]" onMouseDown={e => handleMouseDown(e, 'move')}>
                 <div onMouseDown={e => handleMouseDown(e, 'nw')} className="absolute -top-3 -left-3 w-6 h-6 bg-[#2dd4bf] border-2 border-white rounded-full cursor-nw-resize shadow-2xl hover:scale-125 transition-transform"></div>
                 <div onMouseDown={e => handleMouseDown(e, 'ne')} className="absolute -top-3 -right-3 w-6 h-6 bg-[#2dd4bf] border-2 border-white rounded-full cursor-ne-resize shadow-2xl hover:scale-125 transition-transform"></div>
                 <div onMouseDown={e => handleMouseDown(e, 'sw')} className="absolute -bottom-3 -left-3 w-6 h-6 bg-[#2dd4bf] border-2 border-white rounded-full cursor-sw-resize shadow-2xl hover:scale-125 transition-transform"></div>
                 <div onMouseDown={e => handleMouseDown(e, 'se')} className="absolute -bottom-3 -right-3 w-6 h-6 bg-[#2dd4bf] border-2 border-white rounded-full cursor-se-resize shadow-2xl hover:scale-125 transition-transform"></div>
                 <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                    {[...Array(9)].map((_, i) => <div key={i} className="border-[0.5px] border-white/40"></div>)}
                 </div>
               </div>
             </div>
          </div>

          <div className="w-[420px] border-l border-white/5 flex flex-col p-12 space-y-10 bg-black/10 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Wand2 size={14}/> Studio Command</label>
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Asset mastering prompt..." className="w-full h-24 bg-black/40 border border-white/10 rounded-3xl p-6 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#2dd4bf] transition-all resize-none font-medium placeholder:opacity-20" />
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Master Curves / <span className="text-[#2dd4bf]">{activeChannel.toUpperCase()}</span></label>
                <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
                   {CHANNELS.map(ch => (
                     <button key={ch} onClick={() => setActiveChannel(ch)} className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${activeChannel === ch ? 'bg-[#2dd4bf] text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{ch.toUpperCase()}</button>
                   ))}
                </div>
              </div>

              <div id="curves-area" className="relative aspect-square w-full bg-[#07080a] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-inner cursor-crosshair" onClick={addCurvePoint}>
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                   <line x1="0" y1="100%" x2="100%" y2="0" stroke="white" strokeWidth="2" strokeDasharray="6 6" />
                </svg>
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-[0.05]">
                  {[...Array(16)].map((_, i) => <div key={i} className="border-[0.5px] border-white"></div>)}
                </div>
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  <path d={curveDataPath.fill} fill="url(#curve-fill-grad)" className="transition-all duration-300" />
                  <path d={curveDataPath.path} fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" className="curve-path" />
                  {curves[activeChannel].map((p, i) => (
                    <circle key={i} cx={`${(p.x/255)*100}`} cy={`${(1-p.y/255)*100}`} r="2" fill="#07080a" stroke="white" strokeWidth="1" className="cursor-pointer pointer-events-auto hover:scale-150 transition-transform" onMouseDown={e => { e.stopPropagation(); handleMouseDown(e, 'curve', i); }} onDoubleClick={() => i !== 0 && i !== curves[activeChannel].length-1 && setCurves(pr => ({...pr, [activeChannel]: pr[activeChannel].filter((_, idx)=>idx!==i)}))} />
                  ))}
                </svg>
              </div>
            </div>

            <div className="space-y-10">
              {[
                { label: 'Brightness', key: 'brightness', icon: <Sun size={18}/> },
                { label: 'Contrast', key: 'contrast', icon: <Contrast size={18}/> },
                { label: 'Saturation', key: 'saturation', icon: <Droplet size={18}/> },
              ].map(adj => (
                <div key={adj.key} className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                    <span className="flex items-center gap-3">{adj.icon} {adj.label}</span>
                    <span className="text-[#2dd4bf] text-xs font-black">{adjustments[adj.key as keyof typeof adjustments]}%</span>
                  </div>
                  <input type="range" min="50" max="150" value={adjustments[adj.key as keyof typeof adjustments]} onChange={e => setAdjustments(prev => ({...prev, [adj.key]: parseInt(e.target.value)}))} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Thinner Symmetrical Footer */}
        <div className="px-12 py-6 border-t border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-2xl">
           <button onClick={onCancel} className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Discard</button>
           <button onClick={handleConfirm} className="bg-[#2dd4bf] text-white px-20 py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-[0_10px_30px_rgba(45,212,191,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
             <Maximize size={16} /> Finish Prep
           </button>
        </div>
      </div>
    </div>
  );
};
export default CropModal;
