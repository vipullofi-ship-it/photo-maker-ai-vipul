
import React, { useState, useEffect, useMemo } from 'react';
import { Upload, Printer, Library, Settings, Home, Sparkles, X, Sun, Moon, Trash2, RotateCcw } from 'lucide-react';
import { ProcessedPhoto } from './types';
import { removeBackgroundAndOptimize } from './services/geminiService';
import PhotoCard from './components/PhotoCard';
import CropModal from './components/CropModal';
import LayoutStudio from './components/LayoutStudio';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'library' | 'settings'>('home');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [photos, setPhotos] = useState<ProcessedPhoto[]>([]);
  const [library, setLibrary] = useState<ProcessedPhoto[]>([]);
  const [showLayoutStudio, setShowLayoutStudio] = useState(false);
  const [croppingPhotoId, setCroppingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const newPhotos: ProcessedPhoto[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      originalName: file.name,
      originalUrl: URL.createObjectURL(file),
      processedUrl: null,
      status: 'idle',
      quantity: 8 
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
    if (photos.length === 0 && newPhotos.length > 0) setCroppingPhotoId(newPhotos[0].id);
    e.target.value = '';
  };

  const handleCropComplete = async (croppedDataUrl: string, customPrompt?: string) => {
    if (!croppingPhotoId) return;
    const id = croppingPhotoId;
    setCroppingPhotoId(null);
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: 'processing', originalUrl: croppedDataUrl } : p));
    
    try {
      const processedUrl = await removeBackgroundAndOptimize(croppedDataUrl.split(',')[1], 'image/jpeg', customPrompt);
      const updatedPhoto: ProcessedPhoto = { 
        ...photos.find(p => p.id === id)!, 
        status: 'ready', 
        processedUrl,
        originalUrl: croppedDataUrl 
      };
      
      setPhotos(prev => prev.map(p => p.id === id ? updatedPhoto : p));
      setLibrary(prev => [updatedPhoto, ...prev]);

      const nextIdle = photos.find(p => p.status === 'idle' && p.id !== id);
      if (nextIdle) setCroppingPhotoId(nextIdle.id);
    } catch (err) {
      setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: 'error', error: 'AI Error' } : p));
    }
  };

  const totalToPrint = useMemo(() => photos.reduce((acc, curr) => acc + (curr.status === 'ready' ? curr.quantity : 0), 0), [photos]);

  return (
    <div className="flex h-screen overflow-hidden p-6 gap-6">
      {/* Sidebar - Pure Icons & Glass */}
      <nav className="w-16 glass rounded-[2.5rem] flex flex-col items-center py-10 flex-shrink-0 border border-white/5 shadow-2xl">
        <div className="w-10 h-10 bg-[#2dd4bf] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#2dd4bf33] mb-12">
          <Sparkles size={20} fill="currentColor" />
        </div>

        <div className="flex flex-col gap-10 flex-1">
          <button onClick={() => setActiveTab('home')} className={`p-3 rounded-xl transition-all duration-300 ${activeTab === 'home' ? 'bg-[#2dd4bf] text-white shadow-lg shadow-[#2dd4bf55]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}><Home size={22} /></button>
          <button onClick={() => setActiveTab('library')} className={`p-3 rounded-xl transition-all duration-300 ${activeTab === 'library' ? 'bg-[#2dd4bf] text-white shadow-lg shadow-[#2dd4bf55]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}><Library size={22} /></button>
          <button onClick={() => setShowLayoutStudio(true)} disabled={totalToPrint === 0} className="p-3 rounded-xl text-slate-500 hover:text-white transition-all duration-300 disabled:opacity-10 hover:bg-white/5"><Printer size={22} /></button>
        </div>

        <button onClick={() => setActiveTab('settings')} className={`p-3 rounded-xl transition-all duration-300 ${activeTab === 'settings' ? 'bg-[#2dd4bf] text-white shadow-lg shadow-[#2dd4bf55]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}><Settings size={22} /></button>
      </nav>

      {/* Main Container */}
      <main className="flex-1 glass rounded-[2.5rem] overflow-hidden flex flex-col border border-white/5 shadow-2xl relative">
        <div key={activeTab} className="tab-content-enter flex-1 flex flex-col overflow-hidden">
          {activeTab === 'home' && (
            <>
              <header className="px-12 py-12 flex items-center justify-between border-b border-white/5">
                <div>
                  <h2 className="text-4xl font-black tracking-tighter text-[var(--text-primary)]">Workshop</h2>
                  <p className="text-[10px] font-bold text-[#2dd4bf] uppercase tracking-[0.5em] mt-3">Live Production Environment</p>
                </div>
                <label className="cursor-pointer bg-[#2dd4bf] text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                  <Upload size={16} /> Upload Asset
                  <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </header>

              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {photos.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-10">
                    <Upload size={120} strokeWidth={0.5} className="text-[var(--text-primary)] mb-4" />
                    <p className="font-bold text-xs tracking-[1em] uppercase">No Data</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {photos.map(p => (
                      <PhotoCard 
                        key={p.id} photo={p} 
                        onUpdateQuantity={(id, qty) => setPhotos(prev => prev.map(pt => pt.id === id ? { ...pt, quantity: qty } : pt))}
                        onRemove={(id) => setPhotos(prev => prev.filter(pt => pt.id !== id))}
                        onProcess={() => setCroppingPhotoId(p.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'library' && (
            <div className="p-12 flex-1 overflow-y-auto custom-scrollbar">
              <h2 className="text-4xl font-black tracking-tighter text-[var(--text-primary)] mb-12">Studio Library</h2>
              {library.length === 0 ? (
                <p className="opacity-20 text-xs uppercase tracking-[0.5em] text-[var(--text-primary)]">Archives Empty</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                  {library.map((p, i) => (
                    <div key={i} className="group relative aspect-[3/4] rounded-3xl overflow-hidden bg-black/20 border border-white/5 transition-all duration-500 hover:scale-105">
                      <img src={p.processedUrl!} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-5 transition-all duration-400 backdrop-blur-md">
                        <button onClick={() => {setPhotos([p, ...photos]); setActiveTab('home');}} className="p-4 bg-white text-black rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all" title="Recall Asset"><RotateCcw size={22} /></button>
                        <button onClick={() => setLibrary(prev => prev.filter((_, idx) => idx !== i))} className="p-4 bg-red-500 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all"><Trash2 size={22} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-16 max-w-3xl mx-auto w-full">
              <h2 className="text-4xl font-black tracking-tighter mb-12 text-[var(--text-primary)]">System Config</h2>
              <div className="p-10 glass rounded-[3rem] border border-white/5 flex items-center justify-between shadow-2xl">
                <div>
                  <h4 className="font-bold text-xl text-[var(--text-primary)]">Interface Theme</h4>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Select workspace visual mode.</p>
                </div>
                <div className="flex bg-black/20 rounded-full p-1.5 border border-white/10">
                  <button onClick={() => setTheme('light')} className={`px-8 py-3.5 rounded-full flex items-center gap-3 text-[10px] font-black uppercase transition-all duration-400 ${theme === 'light' ? 'bg-white text-black shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}><Sun size={14}/> Light</button>
                  <button onClick={() => setTheme('dark')} className={`px-8 py-3.5 rounded-full flex items-center gap-3 text-[10px] font-black uppercase transition-all duration-400 ${theme === 'dark' ? 'bg-[#2dd4bf] text-white shadow-xl shadow-[#2dd4bf33]' : 'text-slate-500 hover:text-slate-300'}`}><Moon size={14}/> Dark</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="px-12 py-8 border-t border-white/5 flex items-center justify-between bg-black/10 backdrop-blur-3xl">
           <div className="flex gap-16">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Batch</span>
                <span className="text-xl font-black text-[#2dd4bf]">{totalToPrint} Units</span>
              </div>
           </div>
           <div className="text-[10px] font-black opacity-10 uppercase tracking-[1.5em] text-[var(--text-primary)]">VIPUL STUDIO SYSTEM</div>
        </footer>
      </main>

      {croppingPhotoId && (
        <CropModal 
          imageUrl={photos.find(p => p.id === croppingPhotoId)!.originalUrl}
          onCancel={() => setCroppingPhotoId(null)}
          onConfirm={handleCropComplete}
        />
      )}

      {showLayoutStudio && <LayoutStudio initialPhotos={photos.filter(p => p.status === 'ready' && p.processedUrl).map(p => ({ url: p.processedUrl!, quantity: p.quantity, photoId: p.id }))} onClose={() => setShowLayoutStudio(false)} onExport={(u) => {
        const link = document.createElement('a');
        link.href = u;
        link.download = 'VIPUL_STUDIO_PRODUCTION.jpg';
        link.click();
      }} />}
    </div>
  );
};

export default App;
