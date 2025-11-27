import React, { useState } from 'react';
import { AppMode, SensorData, Language, PickingMode, MapRotationMode } from '../types';
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
  onReturn: () => void;
  onRequestPermissions: () => void;
  permissionsGranted: boolean;
  onCorrectionSubmit: (address: string) => void;
  gpsEnabled: boolean;
  onToggleGps: () => void;
  language: Language;
  onToggleLanguage: () => void;
  showCorrectionModal: boolean;
  setShowCorrectionModal: (show: boolean) => void;
  correctionInput: string;
  setCorrectionInput: (val: string) => void;
  onPickCorrectionOnMap: () => void;
  onCalibrate: () => void;
  onImHere: () => void;
  onToHere: () => void;
  rotationMode: MapRotationMode;
  onToggleRotation: () => void;
  onClearPath: () => void;
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
  onReturn,
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
  onPickCorrectionOnMap,
  onCalibrate,
  onImHere,
  onToHere,
  rotationMode,
  onToggleRotation,
  onClearPath
}) => {
  const [showStopConfirmModal, setShowStopConfirmModal] = useState(false);
  const t = TRANSLATIONS[language];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (correctionInput.trim()) {
      onCorrectionSubmit(correctionInput);
    }
  };

  const handleStopClick = () => setShowStopConfirmModal(true);
  const confirmStop = () => {
    setShowStopConfirmModal(false);
    onStop();
  };
  const handleReturnClick = () => {
    setShowStopConfirmModal(false);
    onReturn();
  };

  return (
    <>
      {/* 
          FLOATING STEPS COUNTER (Left Center) 
          Compact, not rotated, distinct look.
      */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-[900] pointer-events-none">
         <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-xl p-2 flex flex-col items-center shadow-[0_0_20px_rgba(0,0,0,0.5)] pointer-events-auto min-w-[60px]">
             <span className="text-green-500 text-[10px] font-mono uppercase tracking-widest font-bold mb-0">
               {t.steps}
             </span>
             <span className="text-white font-handjet text-3xl leading-none drop-shadow-md">
               {sensorData.steps}
             </span>
         </div>
      </div>


      {/* BOTTOM COMPACT BAR */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] flex flex-col pointer-events-none">
        
        {/* We need pointer-events-auto specifically on the content so clicks pass through the empty space above */}
        <div className="pointer-events-auto bg-black/60 backdrop-blur-xl border-t border-white/10 px-3 pt-2 rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
            
            {/* Row 1: Status & Context (Tiny) */}
            <div className="flex justify-between items-center mb-2 text-[10px]">
               <div className="font-mono text-cyan-400/80 pl-2 max-w-[60%] truncate tracking-wide">
                  {aiContext ? aiContext.toUpperCase() : "SYSTEM READY"}
               </div>
               <div className="flex gap-2 font-handjet">
                 <button onClick={onToggleLanguage} className="px-1.5 py-0.5 border border-white/20 bg-white/5 text-white rounded hover:bg-white/10">{language}</button>
                 <button onClick={onToggleGps} className={`px-1.5 py-0.5 border ${gpsEnabled ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'} bg-white/5 rounded`}>{gpsEnabled ? 'GPS' : 'OFF'}</button>
               </div>
            </div>

            {/* Row 2: MAIN ACTION ROW (Dist | ACTION | Azimuth) */}
            <div className="flex items-center gap-3 h-16 mb-3">
               
               {/* Dist (Left) */}
               <div className="flex flex-col justify-center items-center bg-white/5 border border-white/5 rounded-2xl w-20 h-full">
                  <span className="text-gray-500 text-[10px] font-mono uppercase">{t.dist}</span>
                  <span className="text-white font-handjet text-2xl leading-none">{distanceWalked.toFixed(0)}m</span>
               </div>

               {/* CENTRAL ACTION BUTTON */}
               <div className="flex-1 h-full">
                  {!permissionsGranted ? (
                    <button onClick={onRequestPermissions} className="w-full h-full bg-white text-black font-bold rounded-2xl uppercase font-handjet text-xl tracking-widest shadow-lg animate-pulse">
                      {t.allowSensors}
                    </button>
                  ) : (
                    <>
                      {mode === AppMode.PLANNING && (
                        <button 
                          onClick={onStart} 
                          disabled={!targetAddress}
                          className={`w-full h-full font-bold rounded-2xl uppercase font-handjet text-3xl tracking-widest shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-colors
                            ${!targetAddress ? 'bg-neutral-800 text-gray-600 border border-white/5' : 'bg-white text-black hover:bg-gray-200'}`}
                        >
                          {t.start}
                        </button>
                      )}

                      {mode === AppMode.TRACKING && (
                        <div className="flex gap-2 h-full">
                           <button onClick={() => setShowCorrectionModal(true)} className="flex-[3] bg-neutral-800 border border-orange-500 text-orange-500 font-bold rounded-2xl uppercase font-handjet text-xl tracking-wide hover:bg-neutral-700">
                             {t.correct}
                           </button>
                           <button onClick={handleStopClick} className="flex-[2] bg-red-600 text-white font-bold rounded-2xl uppercase font-handjet text-xl tracking-wide hover:bg-red-700 shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                             {t.stop}
                           </button>
                        </div>
                      )}

                      {mode === AppMode.BACKTRACK && (
                         <button onClick={onReset} className="w-full h-full bg-white text-black font-bold rounded-2xl uppercase font-handjet text-2xl tracking-widest shadow-lg">
                           {t.newRoute}
                         </button>
                      )}
                    </>
                  )}
               </div>

               {/* Azimuth (Right) */}
               <div className="flex flex-col justify-center items-center bg-white/5 border border-white/5 rounded-2xl w-20 h-full">
                  <span className="text-gray-500 text-[10px] font-mono uppercase">{t.azimuth}</span>
                  <span className="text-white font-handjet text-2xl leading-none">{sensorData.heading.toFixed(0)}°</span>
               </div>
            </div>

            {/* Row 3: Tools (Buttons made slightly larger/accented) */}
            <div className="flex gap-2 h-10">
                {/* Mode Specific Left Actions */}
                {mode === AppMode.PLANNING ? (
                  <div className="flex gap-2 flex-[2]">
                     <button onClick={onImHere} className="flex-1 bg-orange-900/30 border border-orange-500/50 text-orange-400 rounded-lg text-sm font-handjet font-bold uppercase hover:bg-orange-800/40 tracking-wider shadow-sm">{t.imHere}</button>
                     <button onClick={onToHere} className="flex-1 bg-blue-900/30 border border-blue-500/50 text-blue-400 rounded-lg text-sm font-handjet font-bold uppercase hover:bg-blue-800/40 tracking-wider shadow-sm">{t.toHere}</button>
                  </div>
                ) : (
                  <button onClick={onClearPath} className="flex-[2] bg-white/5 border border-white/10 text-gray-400 rounded-lg text-sm font-handjet font-bold uppercase hover:bg-white/10 hover:text-white tracking-wider">{t.resetPath}</button>
                )}

                {/* Right Side Tools */}
                <div className="flex gap-2 flex-[2]">
                   <button onClick={onToggleRotation} className={`w-12 rounded-lg border text-lg font-handjet font-bold flex items-center justify-center ${rotationMode === 'HEADS_UP' ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                      ↻
                   </button>
                   <button onClick={onCalibrate} className="flex-1 border border-yellow-500/40 bg-yellow-900/20 text-yellow-500 rounded-lg text-sm font-handjet font-bold uppercase hover:bg-yellow-900/30 tracking-wider shadow-sm">
                      {t.calib}
                   </button>
                </div>
            </div>

        </div>
      </div>

      {/* ... Modals (Correction & Stop) ... */}
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
              className="w-full bg-black border border-neutral-600 text-white text-base p-2 rounded-lg mb-3 focus:border-white focus:outline-none uppercase"
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

      {showStopConfirmModal && (
        <div className="absolute inset-0 z-[2000] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-neutral-900 border-2 border-red-900/50 p-6 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.2)] font-mono">
            <h3 className="text-red-500 text-3xl font-handjet font-bold mb-2 uppercase text-center tracking-widest">
              {t.stopConfirmTitle}
            </h3>
            <p className="text-gray-400 text-base mb-6 text-center uppercase tracking-wide">
              {t.stopConfirmDesc}
            </p>
            <div className="flex flex-col gap-2 font-handjet">
              <button
                onClick={handleReturnClick}
                className="w-full bg-white text-black py-3 rounded-lg uppercase text-xl font-bold hover:bg-gray-200 transition-colors shadow-lg"
              >
                {t.return}
              </button>
              <div className="flex gap-2">
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
        </div>
      )}
    </>
  );
};

export default Dashboard;