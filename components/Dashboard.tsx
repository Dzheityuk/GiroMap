import React, { useState } from 'react';
import { AppMode, SensorData, Language, PickingMode } from '../types';
import { TRANSLATIONS } from '../constants';

interface DashboardProps {
  mode: AppMode;
  sensorData: SensorData;
  targetAddress: string;
  aiContext: string;
  distanceWalked: number;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onRequestPermissions: () => void;
  permissionsGranted: boolean;
  onCorrectionSubmit: (address: string) => void;
  gpsEnabled: boolean;
  onToggleGps: () => void;
  language: Language;
  onToggleLanguage: () => void;
  
  // Correction State Props (Lifted to App)
  showCorrectionModal: boolean;
  setShowCorrectionModal: (show: boolean) => void;
  correctionInput: string;
  setCorrectionInput: (val: string) => void;
  onPickCorrectionOnMap: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  mode,
  sensorData,
  targetAddress,
  aiContext,
  distanceWalked,
  onStart,
  onStop,
  onReset,
  onRequestPermissions,
  permissionsGranted,
  onCorrectionSubmit,
  gpsEnabled,
  onToggleGps,
  language,
  onToggleLanguage,
  showCorrectionModal,
  setShowCorrectionModal,
  correctionInput,
  setCorrectionInput,
  onPickCorrectionOnMap
}) => {
  const [showStopConfirmModal, setShowStopConfirmModal] = useState(false);

  const t = TRANSLATIONS[language];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (correctionInput.trim()) {
      onCorrectionSubmit(correctionInput);
    }
  };

  const handleStopClick = () => {
    setShowStopConfirmModal(true);
  };

  const confirmStop = () => {
    setShowStopConfirmModal(false);
    onStop();
  };

  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 z-[1000] flex flex-col">
        
        {/* Transparent Glass Container - Reduced padding for compactness */}
        <div className="bg-black/40 backdrop-blur-xl border-t border-white/10 px-3 pb-4 pt-3 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            
            {/* Header: AI Context + Toggles */}
            <div className="flex justify-between items-start mb-2">
              {aiContext ? (
                <div className="text-xs font-mono text-cyan-400/80 border-l border-cyan-500/50 pl-2 max-w-[55%] leading-none tracking-wide">
                  {aiContext.toUpperCase()}
                </div>
              ) : <div />}
              
              <div className="flex gap-2 font-handjet">
                <button 
                  onClick={onToggleLanguage}
                  className="px-2 py-0.5 text-lg font-bold border border-white/20 bg-white/5 text-white rounded uppercase hover:bg-white/10 tracking-widest"
                >
                  {language}
                </button>
                <button 
                  onClick={onToggleGps}
                  className={`px-2 py-0.5 text-lg font-bold border ${gpsEnabled ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'} bg-white/5 rounded uppercase tracking-widest`}
                >
                  {gpsEnabled ? t.gpsOn : t.gpsOff}
                </button>
              </div>
            </div>

            {/* Main Stats Grid - Compacted */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-white/5 border border-white/10 p-1 rounded-lg backdrop-blur-sm text-center">
                <div className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-0">{t.dist}</div>
                <div className="text-white text-2xl font-handjet font-bold tracking-widest leading-none">{distanceWalked.toFixed(0)}<span className="text-lg font-normal text-gray-400 ml-1">m</span></div>
              </div>
              <div className="bg-white/5 border border-white/10 p-1 rounded-lg backdrop-blur-sm text-center">
                <div className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-0">{t.azimuth}</div>
                <div className="text-white text-2xl font-handjet font-bold tracking-widest leading-none">{sensorData.heading.toFixed(0)}°</div>
              </div>
              <div className="bg-white/5 border border-white/10 p-1 rounded-lg backdrop-blur-sm text-center">
                <div className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-0">{t.steps}</div>
                <div className="text-white text-2xl font-handjet font-bold tracking-widest leading-none">{sensorData.steps}</div>
              </div>
            </div>

            {/* Target & Controls - Smaller Buttons */}
            <div className="flex flex-col gap-2 font-handjet">
               
               {/* Current Target Address (Mini) */}
               {mode === AppMode.TRACKING && (
                 <div className="flex justify-center mb-1">
                    <div className="text-xs font-mono text-gray-400 uppercase tracking-widest bg-black/50 px-3 py-0.5 rounded-full border border-white/5 truncate max-w-[80%]">
                      {targetAddress || t.notSet}
                    </div>
                 </div>
               )}

              {!permissionsGranted ? (
                <button 
                  onClick={onRequestPermissions}
                  className="w-full bg-white text-black font-bold py-3 rounded-lg uppercase text-xl tracking-widest hover:bg-gray-200 transition-colors shadow-lg"
                >
                  {t.allowSensors}
                </button>
              ) : (
                <>
                  {mode === AppMode.PLANNING && (
                    <button 
                      onClick={onStart}
                      className="w-full bg-white text-black font-bold py-3 rounded-lg uppercase text-xl tracking-widest hover:bg-gray-200 transition-colors shadow-lg"
                    >
                      {t.start}
                    </button>
                  )}

                  {mode === AppMode.TRACKING && (
                    <div className="flex gap-2">
                        <button 
                          onClick={() => setShowCorrectionModal(true)}
                          className="flex-1 bg-neutral-800/80 border border-orange-500/50 text-orange-500 font-bold py-3 rounded-lg uppercase tracking-widest text-xl hover:bg-neutral-700 transition-colors"
                        >
                          {t.correct}
                        </button>
                        <button 
                          onClick={handleStopClick}
                          className="flex-1 bg-red-600/90 text-white font-bold py-3 rounded-lg uppercase tracking-widest text-xl hover:bg-red-700 transition-colors shadow-red-900/50 shadow-lg"
                        >
                          {t.stop}
                        </button>
                    </div>
                  )}

                  {mode === AppMode.BACKTRACK && (
                    <button 
                      onClick={onReset}
                      className="w-full bg-white text-black font-bold py-3 rounded-lg uppercase text-xl tracking-widest hover:bg-gray-200 transition-colors shadow-lg"
                    >
                      {t.newRoute}
                    </button>
                  )}
                </>
              )}
            </div>
        </div>
      </div>

      {/* Correction Modal */}
      {showCorrectionModal && (
        <div className="absolute inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <form onSubmit={handleFormSubmit} className="w-full max-w-sm bg-neutral-900 border border-neutral-700 p-5 rounded-2xl shadow-2xl font-mono">
            <h3 className="text-orange-500 text-2xl font-handjet font-bold mb-3 uppercase text-center border-b border-neutral-800 pb-2 tracking-widest">
              {t.correctionTitle}
            </h3>
            
            <input
              autoFocus
              type="text"
              value={correctionInput}
              onChange={(e) => setCorrectionInput(e.target.value)}
              placeholder={t.placeholderAddr}
              className="w-full bg-black border border-neutral-600 text-white text-base p-2 rounded-lg mb-3 focus:border-orange-500 focus:outline-none uppercase"
            />
            
            <button
               type="button"
               onClick={onPickCorrectionOnMap}
               className="w-full mb-3 bg-neutral-800 border border-neutral-600 text-gray-300 py-2 rounded-lg uppercase text-lg font-handjet font-bold hover:bg-neutral-700 flex items-center justify-center gap-2"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
               {t.pickOnMapBtn}
            </button>

            <div className="flex gap-2 font-handjet">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="flex-1 bg-neutral-800 text-white py-2 rounded-lg uppercase text-lg font-bold hover:bg-neutral-700"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="flex-1 bg-orange-600 text-white py-2 rounded-lg uppercase text-lg font-bold hover:bg-orange-700"
              >
                {t.confirm}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stop Confirmation Modal */}
      {showStopConfirmModal && (
        <div className="absolute inset-0 z-[2000] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-neutral-900 border-2 border-red-900/50 p-6 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.2)] font-mono">
            <h3 className="text-red-500 text-3xl font-handjet font-bold mb-2 uppercase text-center tracking-widest">
              {t.stopConfirmTitle}
            </h3>
            <p className="text-gray-400 text-base mb-6 text-center uppercase tracking-wide">
              {t.stopConfirmDesc}
            </p>
            <div className="flex gap-4 font-handjet">
              <button
                onClick={() => setShowStopConfirmModal(false)}
                className="flex-1 bg-neutral-800 text-white py-3 rounded-lg uppercase text-xl font-bold hover:bg-neutral-700 transition-colors"
              >
                {t.no}
              </button>
              <button
                onClick={confirmStop}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg uppercase text-xl font-bold hover:bg-red-700 transition-colors shadow-lg"
              >
                {t.yes}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;