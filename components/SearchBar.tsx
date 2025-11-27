import React, { useState } from 'react';
import { Language, PickingMode } from '../types';
import { TRANSLATIONS } from '../constants';

interface SearchBarProps {
  fromValue: string;
  toValue: string;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  onRoute: () => void;
  isSearching: boolean;
  onPickLocation: (target: PickingMode) => void;
  pickingTarget: PickingMode;
  language: Language;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  fromValue, 
  toValue, 
  onFromChange, 
  onToChange, 
  onRoute, 
  isSearching,
  onPickLocation,
  pickingTarget,
  language
}) => {
  
  const [isExpanded, setIsExpanded] = useState(false);
  const t = TRANSLATIONS[language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (toValue.trim()) {
      onRoute();
      setIsExpanded(false); // Auto collapse on search
    }
  };

  // If we are actively picking a location on the map, keep the bar visible if needed, 
  // or just show the indicator.
  const expanded = isExpanded || pickingTarget !== null;

  return (
    <>
      {/* 
         COMPACT MODE: Just a Magnifying Glass Icon on the Right 
      */}
      {!expanded && (
        <div className="absolute top-4 right-4 z-[1000]">
          <button 
            onClick={() => setIsExpanded(true)}
            className="w-14 h-14 bg-black/60 backdrop-blur-xl border border-white/20 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center text-orange-500 hover:bg-white/10 hover:scale-105 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      )}

      {/* 
         EXPANDED MODE: Full Form 
      */}
      {expanded && (
        <div className="absolute top-0 left-0 right-0 p-4 z-[1000] flex justify-center">
            <form onSubmit={handleSubmit} className="w-full max-w-md bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-4 font-mono">
              
              <div className="flex justify-between items-center">
                 <span className="text-xl font-handjet font-bold text-gray-400 uppercase tracking-widest">{t.planRouteHeader}</span>
                 <button 
                   type="button" 
                   onClick={() => setIsExpanded(false)}
                   className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full text-gray-400 hover:text-white hover:bg-white/20"
                 >
                   ✕
                 </button>
              </div>

              {/* FROM Input */}
              <div className="relative flex items-center gap-2 bg-neutral-900/80 rounded-lg p-2 border border-white/10">
                <div className="w-6 flex justify-center text-orange-500 font-bold text-lg font-handjet">A</div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={fromValue}
                    onChange={(e) => onFromChange(e.target.value)}
                    placeholder={t.searchFrom}
                    className="w-full bg-transparent text-white font-mono text-base focus:outline-none uppercase placeholder-neutral-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onPickLocation('from')}
                  className={`p-1 rounded hover:bg-neutral-700 transition-colors ${pickingTarget === 'from' ? 'text-orange-500 animate-pulse' : 'text-gray-400'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>

              {/* TO Input */}
              <div className="relative flex items-center gap-2 bg-neutral-900/80 rounded-lg p-2 border border-white/10">
                <div className="w-6 flex justify-center text-white font-bold text-lg font-handjet">B</div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={toValue}
                    onChange={(e) => onToChange(e.target.value)}
                    placeholder={t.searchTo}
                    className="w-full bg-transparent text-white font-mono text-base focus:outline-none uppercase placeholder-neutral-600"
                  />
                </div>
                
                 <button
                  type="button"
                  onClick={() => onPickLocation('to')}
                  className={`p-1 rounded hover:bg-neutral-700 transition-colors ${pickingTarget === 'to' ? 'text-orange-500 animate-pulse' : 'text-gray-400'}`}
                >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>

              <button
                type="submit"
                disabled={isSearching || !toValue.trim()}
                className={`w-full mt-2 py-3 flex items-center justify-center font-handjet font-bold text-2xl uppercase tracking-widest transition-colors rounded-xl shadow-lg
                  ${isSearching ? 'bg-neutral-800 text-gray-500' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
              >
                {isSearching ? t.searchBtn : t.routeBtn}
              </button>

            </form>
        </div>
      )}
      
      {pickingTarget && (
        <div className="absolute top-24 left-0 right-0 flex justify-center z-[900] pointer-events-none">
            <div className="bg-orange-600/90 backdrop-blur text-white text-lg font-handjet font-bold uppercase py-1 px-6 rounded-full shadow-lg animate-bounce tracking-widest">
            {pickingTarget === 'from' ? t.pickA : pickingTarget === 'to' ? t.pickB : t.pickCorrect}
            </div>
        </div>
      )}
    </>
  );
};

export default SearchBar;