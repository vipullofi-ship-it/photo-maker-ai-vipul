
import React from 'react';
import { ProcessedPhoto } from '../types';
import { Loader2, Trash2, Maximize, AlertCircle, Plus, Minus } from 'lucide-react';

interface PhotoCardProps {
  photo: ProcessedPhoto;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onProcess: (id: string) => void;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo, onUpdateQuantity, onRemove, onProcess }) => {
  return (
    <div className="group relative bg-[#1c1f23] border border-white/5 rounded-[2rem] overflow-hidden transition-all duration-500 hover:border-teal-400/30 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
      <div className="relative aspect-[3/4] bg-black/40 flex items-center justify-center overflow-hidden">
        {photo.status === 'processing' ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
            <span className="text-[10px] font-black tracking-widest text-teal-400 uppercase animate-pulse">Analyzing</span>
          </div>
        ) : photo.processedUrl ? (
          <img src={photo.processedUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <img src={photo.originalUrl} className="w-full h-full object-cover opacity-20 grayscale" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <Maximize size={24} className="text-slate-600" />
            </div>
          </div>
        )}
        
        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          <button onClick={() => onRemove(photo.id)} className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all backdrop-blur-md">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[120px]">{photo.originalName}</span>
          {photo.status === 'ready' && <div className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_10px_#2dd4bf]"></div>}
        </div>

        {photo.status === 'ready' ? (
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">QTY</span>
            <div className="flex items-center gap-3">
              <button onClick={() => onUpdateQuantity(photo.id, Math.max(0, photo.quantity - 1))} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-full text-slate-400"><Minus size={12} /></button>
              <span className="text-sm font-black text-white">{photo.quantity}</span>
              <button onClick={() => onUpdateQuantity(photo.id, photo.quantity + 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-full text-slate-400"><Plus size={12} /></button>
            </div>
          </div>
        ) : photo.status === 'idle' && (
          <button onClick={onProcess} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Setup Asset</button>
        )}
      </div>
    </div>
  );
};

export default PhotoCard;
