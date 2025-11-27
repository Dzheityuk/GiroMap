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

  // If we are actively picking a location on the map, keep the bar expanded
  const expanded = isExpanded || pickingTarget !== null;

  return (
    <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col items-center">
      
      {!expanded ? (
        <button 
          onClick={() => setIsExpanded(true)}
          className="bg-black/40 backdrop-blur-xl border border-white/10 text-white px-6 py-2 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] font-handjet uppercase text-xl tracking-widest flex items-center gap-2 hover:bg-white/5 transition-all w-full max-w-xs justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          {t.routeBtn}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-md bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 font-mono">
          
          <div className="flex justify-between items-center mb-0">
             <span className="text-lg font-handjet font-bold text-gray-400 uppercase tracking-widest">{t.planRouteHeader}</span>
             <button 
               type="button" 
               onClick={() => setIsExpanded(false)}
               className="text-gray-500 hover:text-white text-xl font-mono"
             >
               ✕
             </button>
          </div>

          {/* FROM Input */}
          <div className="relative flex items-center gap-2 bg-neutral-900/80 rounded-lg p-1 border border-white/10">
            <div className="w-6 flex justify-center text-orange-500 font-bold text-base">A</div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={fromValue}
                onChange={(e) => onFromChange(e.target.value)}
                placeholder={t.searchFrom}
                className="w-full bg-transparent text-white font-mono text-base p-1 focus:outline-none uppercase placeholder-neutral-600"
              />
            </div>
            <button
              type="button"
              onClick={() => onPickLocation('from')}
              className={`p-1 rounded hover:bg-neutral-700 transition-colors ${pickingTarget === 'from' ? 'text-orange-500 animate-pulse' : 'text-gray-400'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* TO Input */}
          <div className="relative flex items-center gap-2 bg-neutral-900/80 rounded-lg p-1 border border-white/10">
            <div className="w-6 flex justify-center text-white font-bold text-base">B</div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={toValue}
                onChange={(e) => onToChange(e.target.value)}
                placeholder={t.searchTo}
                className="w-full bg-transparent text-white font-mono text-base p-1 focus:outline-none uppercase placeholder-neutral-600"
              />
            </div>
            
             <button
              type="button"
              onClick={() => onPickLocation('to')}
              className={`p-1 rounded hover:bg-neutral-700 transition-colors ${pickingTarget === 'to' ? 'text-orange-500 animate-pulse' : 'text-gray-400'}`}
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          <button
            type="submit"
            disabled={isSearching || !toValue.trim()}
            className={`w-full mt-1 py-2 flex items-center justify-center font-handjet font-bold text-xl uppercase tracking-wider transition-colors rounded-lg shadow-lg
              ${isSearching ? 'bg-neutral-800 text-gray-500' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
          >
            {isSearching ? t.searchBtn : t.routeBtn}
          </button>

        </form>
      )}
      
      {pickingTarget && (
        <div className="mt-2 bg-orange-600/90 backdrop-blur text-white text-lg font-handjet font-bold uppercase py-1 px-4 rounded-full shadow-lg animate-bounce tracking-widest">
          {pickingTarget === 'from' ? t.pickA : pickingTarget === 'to' ? t.pickB : t.pickCorrect}
        </div>
      )}
    </div>
  );
};

export default SearchBar;