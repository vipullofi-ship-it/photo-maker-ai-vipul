
import React, { useState, useEffect } from 'react';
import { X, Download, RotateCcw } from 'lucide-react';
import { SheetPhoto, A4_WIDTH_CM, A4_HEIGHT_CM, CM_TO_VIEWPORT, PASSPORT_SETTINGS } from '../types';

interface LayoutStudioProps {
  initialPhotos: { url: string; quantity: number; photoId: string }[];
  onClose: () => void;
  onExport: (dataUrl: string) => void;
}

const LayoutStudio: React.FC<LayoutStudioProps> = ({ initialPhotos, onClose, onExport }) => {
  const [sheetPhotos, setSheetPhotos] = useState<SheetPhoto[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const photos: SheetPhoto[] = [];
    const itemWidth = PASSPORT_SETTINGS.photoWidthCm;
    const itemHeight = PASSPORT_SETTINGS.photoHeightCm;
    const spacing = PASSPORT_SETTINGS.spacingMm / 10;
    const maxHorizontal = PASSPORT_SETTINGS.maxHorizontal; 

    // Calculate grid width to center horizontally
    const totalGridWidth = (maxHorizontal * itemWidth) + ((maxHorizontal - 1) * spacing);
    const startX = (A4_WIDTH_CM - totalGridWidth) / 2;
    const startY = 2.0; 

    let currentX = startX;
    let currentY = startY;
    let countInRow = 0;

    initialPhotos.forEach((group) => {
      for (let i = 0; i < group.quantity; i++) {
        if (countInRow >= maxHorizontal) {
          countInRow = 0;
          currentX = startX;
          currentY += itemHeight + spacing;
        }
        
        if (currentY + itemHeight < A4_HEIGHT_CM - 1) {
          photos.push({
            id: `${group.photoId}-${i}`,
            photoId: group.photoId,
            url: group.url,
            x: currentX,
            y: currentY,
            width: itemWidth,
            height: itemHeight
          });
        }
        
        currentX += itemWidth + spacing;
        countInRow++;
      }
    });
    setSheetPhotos(photos);
  }, [initialPhotos]);

  const handleDrag = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const photo = sheetPhotos.find(p => p.id === id);
    if (!photo) return;
    const initialX = photo.x;
    const initialY = photo.y;
    setActiveId(id);
    const onMove = (mv: MouseEvent | TouchEvent) => {
      const cx = 'touches' in mv ? mv.touches[0].clientX : (mv as MouseEvent).clientX;
      const cy = 'touches' in mv ? mv.touches[0].clientY : (mv as MouseEvent).clientY;
      const dx = (cx - startX) / CM_TO_VIEWPORT;
      const dy = (cy - startY) / CM_TO_VIEWPORT;
      setSheetPhotos(prev => prev.map(p => p.id === id ? { 
        ...p, x: Math.max(0, Math.min(A4_WIDTH_CM - p.width, initialX + dx)),
        y: Math.max(0, Math.min(A4_HEIGHT_CM - p.height, initialY + dy))
      } : p));
    };
    const onEnd = () => { setActiveId(null); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onEnd); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onEnd);
  };

  const captureSheet = async () => {
    setIsExporting(true);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const dpi = 300;
    const cmToPx = dpi / 2.54;
    canvas.width = A4_WIDTH_CM * cmToPx;
    canvas.height = A4_HEIGHT_CM * cmToPx;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (const p of sheetPhotos) {
      const img = new Image(); img.src = p.url;
      await new Promise(res => img.onload = res);
      ctx.drawImage(img, p.x * cmToPx, p.y * cmToPx, p.width * cmToPx, p.height * cmToPx);
      
      // Explicit Black Borders for printing standards
      ctx.strokeStyle = '#000000'; 
      ctx.lineWidth = 2.0; // Slightly thicker for easier cutting
      ctx.strokeRect(p.x * cmToPx, p.y * cmToPx, p.width * cmToPx, p.height * cmToPx);
    }
    onExport(canvas.toDataURL('image/jpeg', 0.98));
    setIsExporting(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-3xl animate-in fade-in duration-700 overflow-hidden">
      <header className="px-12 py-8 flex items-center justify-between border-b border-white/5 bg-black/20">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Production Sheet</h2>
          <p className="text-[10px] text-[#2dd4bf] font-black tracking-[0.5em] uppercase mt-1">Symmetrical A4 Matrix Calibration</p>
        </div>
        <button onClick={onClose} className="p-4 hover:bg-white/5 rounded-full text-white/30 transition-all"><X size={32} /></button>
      </header>
      
      <main className="flex-1 overflow-auto flex justify-center p-20 custom-scrollbar bg-black/40">
        <div className="relative bg-white shadow-[0_50px_100px_rgba(0,0,0,1)] border border-white/5" style={{ width: `${A4_WIDTH_CM * CM_TO_VIEWPORT}px`, height: `${A4_HEIGHT_CM * CM_TO_VIEWPORT}px` }}>
          <div className="absolute inset-0 pointer-events-none opacity-[0.01]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: `${CM_TO_VIEWPORT/2}px ${CM_TO_VIEWPORT/2}px` }}></div>
          {sheetPhotos.map((p) => (
            <div key={p.id} onMouseDown={(e) => handleDrag(p.id, e)} className={`absolute cursor-move transition-transform duration-300 select-none border border-black ${activeId === p.id ? 'z-50 scale-105 shadow-2xl ring-2 ring-[#2dd4bf]' : 'z-10 shadow-sm'}`} style={{ left: `${p.x * CM_TO_VIEWPORT}px`, top: `${p.y * CM_TO_VIEWPORT}px`, width: `${p.width * CM_TO_VIEWPORT}px`, height: `${p.height * CM_TO_VIEWPORT}px` }}>
              <img src={p.url} className="w-full h-full object-cover pointer-events-none" />
              {activeId === p.id && <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-[9px] font-black text-[#2dd4bf] uppercase bg-black/95 px-5 py-2 rounded-full border border-[#2dd4bf44] backdrop-blur-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">{p.x.toFixed(2)} / {p.y.toFixed(2)} cm</div>}
            </div>
          ))}
        </div>
      </main>

      <footer className="px-12 py-10 flex items-center justify-between border-t border-white/5 bg-black/30 backdrop-blur-3xl">
        <div className="flex gap-16">
          <div className="flex flex-col"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">A4 GRID</span><span className="text-sm font-black text-white uppercase tracking-[0.2em]">Symmetrical 6-Horizontal</span></div>
          <div className="flex flex-col"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">BATCH SIZE</span><span className="text-sm font-black text-white uppercase tracking-[0.2em]">{sheetPhotos.length} Units</span></div>
        </div>
        <div className="flex gap-6">
          <button onClick={onClose} className="px-10 py-5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Cancel</button>
          <button onClick={captureSheet} disabled={isExporting} className="bg-[#2dd4bf] text-white px-16 py-5 rounded-full font-black text-xs uppercase tracking-widest shadow-[0_15px_40px_rgba(45,212,191,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-4">
            {isExporting ? <RotateCcw className="animate-spin" size={20}/> : <Download size={20} />}
            {isExporting ? 'Generating...' : 'Download Production Ready Sheet'}
          </button>
        </div>
      </footer>
    </div>
  );
};
export default LayoutStudio;
