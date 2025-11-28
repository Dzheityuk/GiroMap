import React, { useState, useEffect, useRef } from 'react';
import { Language, PickingMode, SearchResult } from '../types';
import { TRANSLATIONS } from '../constants';
import { getAddressSuggestions } from '../services/geoUtils';

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
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [activeField, setActiveField] = useState<'from' | 'to' | null>(null);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[language];

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setSuggestions([]);
        setActiveField(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (field: 'from' | 'to', value: string) => {
    if (field === 'from') onFromChange(value);
    else onToChange(value);

    setActiveField(field);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await getAddressSuggestions(value, language);
      setSuggestions(results);
    }, 500); // 500ms debounce
  };

  const handleSelectSuggestion = (suggestion: SearchResult) => {
    if (activeField === 'from') {
      onFromChange(suggestion.display_name);
    } else if (activeField === 'to') {
      onToChange(suggestion.display_name);
    }
    setSuggestions([]);
    setActiveField(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (toValue.trim()) {
      onRoute();
      setIsExpanded(false);
      setSuggestions([]);
    }
  };

  // If we are actively picking a location on the map, keep the bar visible if needed, 
  // or just show the indicator.
  const expanded = isExpanded || pickingTarget !== null;

  return (
    <>
      {/* 
         COMPACT MODE: Transparent Magnifying Glass 
      */}
      {!expanded && (
        <div className="absolute top-4 right-4 z-[1000]">
          <button 
            onClick={() => setIsExpanded(true)}
            className="w-12 h-12 bg-black/30 backdrop-blur-sm border border-white/10 rounded-full shadow-lg flex items-center justify-center text-orange-500 hover:bg-black/50 hover:scale-105 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      )}

      {/* 
         EXPANDED MODE: Full Form 
      */}
      {expanded && (
        <div className="absolute top-0 left-0 right-0 p-3 z-[1000] flex justify-center" ref={wrapperRef}>
            <form onSubmit={handleSubmit} className="w-full max-w-sm bg-black/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 font-mono">
              
              <div className="flex justify-between items-center mb-1">
                 <span className="text-sm font-handjet font-bold text-gray-400 uppercase tracking-widest">{t.planRouteHeader}</span>
                 <button 
                   type="button" 
                   onClick={() => setIsExpanded(false)}
                   className="w-6 h-6 flex items-center justify-center bg-white/10 rounded-full text-gray-400 hover:text-white hover:bg-white/20"
                 >
                   <span className="text-xs">✕</span>
                 </button>
              </div>

              {/* FROM Input */}
              <div className="relative">
                <div className="flex items-center gap-2 bg-neutral-900/80 rounded-lg px-2 py-1 border border-white/10">
                  <div className="w-5 flex justify-center text-orange-500 font-bold text-base font-handjet">A</div>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={fromValue}
                      onChange={(e) => handleInputChange('from', e.target.value)}
                      onFocus={() => { setActiveField('from'); if(fromValue.length >= 3) handleInputChange('from', fromValue); }}
                      placeholder={t.searchFrom}
                      className="w-full bg-transparent text-white font-mono text-sm focus:outline-none uppercase placeholder-neutral-600 py-1"
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
                {/* Suggestions Dropdown for FROM */}
                {activeField === 'from' && suggestions.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl max-h-40 overflow-y-auto z-[1001]">
                    {suggestions.map((item, idx) => (
                      <li 
                        key={idx}
                        onClick={() => handleSelectSuggestion(item)}
                        className="px-3 py-2 text-xs text-gray-300 hover:bg-orange-900/30 hover:text-white cursor-pointer border-b border-white/5 last:border-0 truncate"
                      >
                        {item.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* TO Input */}
              <div className="relative">
                <div className="flex items-center gap-2 bg-neutral-900/80 rounded-lg px-2 py-1 border border-white/10">
                  <div className="w-5 flex justify-center text-white font-bold text-base font-handjet">B</div>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={toValue}
                      onChange={(e) => handleInputChange('to', e.target.value)}
                      onFocus={() => { setActiveField('to'); if(toValue.length >= 3) handleInputChange('to', toValue); }}
                      placeholder={t.searchTo}
                      className="w-full bg-transparent text-white font-mono text-sm focus:outline-none uppercase placeholder-neutral-600 py-1"
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
                {/* Suggestions Dropdown for TO */}
                 {activeField === 'to' && suggestions.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl max-h-40 overflow-y-auto z-[1001]">
                    {suggestions.map((item, idx) => (
                      <li 
                        key={idx}
                        onClick={() => handleSelectSuggestion(item)}
                        className="px-3 py-2 text-xs text-gray-300 hover:bg-orange-900/30 hover:text-white cursor-pointer border-b border-white/5 last:border-0 truncate"
                      >
                        {item.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="submit"
                disabled={isSearching || !toValue.trim()}
                className={`w-full mt-1 py-2 flex items-center justify-center font-handjet font-bold text-xl uppercase tracking-widest transition-colors rounded-xl shadow-lg
                  ${isSearching ? 'bg-neutral-800 text-gray-500' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
              >
                {isSearching ? t.searchBtn : t.routeBtn}
              </button>

            </form>
        </div>
      )}
      
      {pickingTarget && (
        <div className="absolute top-36 left-0 right-0 flex justify-center z-[900] pointer-events-none">
            <div className="bg-orange-600/90 backdrop-blur text-white text-base font-handjet font-bold uppercase py-1 px-4 rounded-full shadow-lg animate-bounce tracking-widest">
            {pickingTarget === 'from' ? t.pickA : pickingTarget === 'to' ? t.pickB : t.pickCorrect}
            </div>
        </div>
      )}
    </>
  );
};

export default SearchBar;