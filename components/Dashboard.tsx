
import React, { useState, useRef, useEffect } from 'react';
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
  onReturn: () => void;
  onRequestPermissions: () => void;
  permissionsGranted: boolean;
  onCorrectionSubmit: (address: string) => void;
  gpsEnabled: boolean;
  onToggleGps: () => void;
  language: Language;
  onToggleLanguage: () => void;
  correctionInput: string;
  setCorrectionInput: (val: string) => void;
  onPickCorrectionOnMap: () => void; // Used to trigger mode
  onConfirmCorrection: () => void; // Used to confirm center
  onCancelCorrection: () => void;
  onCalibrate: () => void;
  onImHere: () => void;
  onToHere: () => void;
  isMapLocked: boolean;
  onClearPath: () => void;
  onRotateDelta: (delta: number) => void;
  pickingTarget: PickingMode;
  stepLength: number;
  onStepLengthChange: (v: number) => void;
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
  correctionInput,
  setCorrectionInput,
  onPickCorrectionOnMap,
  onConfirmCorrection,
  onCancelCorrection,
  onCalibrate,
  onImHere,
  onToHere,
  isMapLocked,
  onClearPath,
  onRotateDelta,
  pickingTarget,
  stepLength,
  onStepLengthChange
}) => {
  const [showStopConfirmModal, setShowStopConfirmModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Correction Mode Local State
  const [showAddressInput, setShowAddressInput] = useState(false);

  const t = TRANSLATIONS[language];

  // --- Joystick Logic ---
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const lastAngle = useRef<number>(0);

  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    // Critical: Prevent scrolling while using joystick
    if (e.cancelable) e.preventDefault();
    
    if (isMapLocked) return;
    setJoystickActive(true);
    
    // Set initial angle
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    if (joystickRef.current) {
        const rect = joystickRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        lastAngle.current = Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI;
    }
  };

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (e.cancelable) e.preventDefault();
    if (!joystickActive || isMapLocked || !joystickRef.current) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const rect = joystickRef.current.getBoundingClientRect();
    const radius = rect.width / 2;
    const centerX = rect.left + radius;
    const centerY = rect.top + radius;
    
    // 1. Calculate Knob Visual Position
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.sqrt(dx*dx + dy*dy);
    const maxDist = radius - 15; // Keep knob inside
    
    if (distance > maxDist) {
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * maxDist;
        dy = Math.sin(angle) * maxDist;
    }
    setKnobPos({ x: dx, y: dy });

    // 2. Calculate Rotation Delta
    const currentAngle = Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI;
    let delta = currentAngle - lastAngle.current;
    
    // Normalize delta for smooth 360 crossing
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    onRotateDelta(delta);
    lastAngle.current = currentAngle;
  };

  const handleJoystickEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (e.cancelable) e.preventDefault();
    setJoystickActive(false);
    setKnobPos({ x: 0, y: 0 }); // Snap back to center
  };

  // --- Form Logic ---
  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (correctionInput.trim()) {
        onCorrectionSubmit(correctionInput);
        setShowAddressInput(false); // Reset for next time
    }
  };
  
  const handleStopClick = () => setShowStopConfirmModal(true);
  const confirmStop = () => { setShowStopConfirmModal(false); onStop(); };
  const handleReturnClick = () => { setShowStopConfirmModal(false); onReturn(); };

  // Is Correction Panel Active?
  const isCorrectionMode = pickingTarget === 'correction';

  // Reset address mode when exiting correction
  useEffect(() => {
      if (!isCorrectionMode) setShowAddressInput(false);
  }, [isCorrectionMode]);

  const changeStep = (delta: number) => {
    const newVal = Math.max(0.1, Math.min(2.0, stepLength + delta));
    onStepLengthChange(parseFloat(newVal.toFixed(2)));
  };

  return (
    <>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>

      {/* HELP BUTTON (Top Left) */}
      <div className="absolute top-4 left-4 z-[1000]">
         <button 
           onClick={() => setShowHelpModal(true)}
           className="w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/20 text-white font-handjet font-bold text-xl flex items-center justify-center hover:bg-white/10"
         >
           ?
         </button>
      </div>

      {/* FLOATING STEPS (Left Center) */}
      <div className="absolute left-3 top-1/2 -translate-y-24 z-[900] pointer-events-none">
         <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-xl p-2 flex flex-col items-center shadow-[0_0_20px_rgba(0,0,0,0.5)] pointer-events-auto">
             <span className="text-green-500 text-[10px] font-mono uppercase tracking-widest font-bold">
               {t.steps}
             </span>
             <span className="text-white font-handjet text-3xl leading-none drop-shadow-md">
               {sensorData.steps}
             </span>
         </div>
      </div>

      {/* 
          VIRTUAL JOYSTICK (Bottom Right) 
      */}
      <div 
        className={`absolute right-8 bottom-64 z-[1100] touch-none ${isMapLocked ? 'opacity-30 grayscale pointer-events-none' : 'opacity-90'}`}
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onMouseDown={handleJoystickStart}
        onMouseMove={handleJoystickMove}
        onMouseUp={handleJoystickEnd}
        onMouseLeave={handleJoystickEnd}
      >
         {/* Outer Ring */}
         <div 
           ref={joystickRef}
           className="w-24 h-24 rounded-full bg-black/30 backdrop-blur-sm border-2 border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center relative select-none"
         >
            {/* Inner Knob */}
            <div 
              className="w-12 h-12 rounded-full bg-white/90 shadow-lg absolute transition-transform duration-75 ease-linear pointer-events-none flex items-center justify-center"
              style={{ 
                  transform: `translate(${knobPos.x}px, ${knobPos.y}px)` 
              }}
            >
                <div className="w-8 h-8 rounded-full border border-black/10 opacity-50 bg-gradient-to-br from-gray-100 to-gray-400" />
            </div>
            
            {/* Simple decoration */}
            <div className="absolute top-1 text-[8px] text-white/30 font-mono pointer-events-none">ROT</div>
         </div>
      </div>

      {/* CORRECTION MODE PANEL (Replaces Modal) */}
      {isCorrectionMode && (
         <div className="absolute bottom-0 left-0 right-0 z-[1200] bg-black/90 backdrop-blur-xl border-t-2 border-orange-500 rounded-t-3xl p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-20 duration-300">
             <div className="flex flex-col gap-3 max-w-lg mx-auto">
                {/* Header Row */}
                <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-1">
                   <span className="text-orange-500 font-handjet font-bold text-xl uppercase tracking-widest">{t.correctionTitle}</span>
                   <button onClick={onCancelCorrection} className="text-gray-500 hover:text-white px-2 font-mono text-xl">✕</button>
                </div>
                
                {/* STEP LENGTH ADJUSTER */}
                {!showAddressInput && (
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-2 px-3">
                     <span className="text-gray-400 font-mono text-xs uppercase tracking-wide">{t.stepLen}</span>
                     <div className="flex items-center gap-3">
                        <button onClick={() => changeStep(-0.02)} className="w-8 h-8 rounded bg-neutral-700 text-white font-bold hover:bg-neutral-600">-</button>
                        <span className="font-handjet text-xl text-orange-400 w-12 text-center">{stepLength.toFixed(2)}</span>
                        <button onClick={() => changeStep(+0.02)} className="w-8 h-8 rounded bg-neutral-700 text-white font-bold hover:bg-neutral-600">+</button>
                     </div>
                  </div>
                )}

                {/* Mode Switcher logic */}
                {!showAddressInput ? (
                    <div className="flex flex-row items-stretch gap-4">
                        {/* Left Side: Instruction Text */}
                        <div className="flex-1 flex flex-col justify-center text-gray-400 font-mono text-sm leading-tight">
                            <p>{t.correctionDesc}</p>
                            <div className="mt-2 text-xs text-gray-500 uppercase tracking-wider">{t.pickCorrect}</div>
                        </div>

                        {/* Right Side: Stacked Buttons */}
                        <div className="flex flex-col gap-2 w-1/3 min-w-[120px]">
                            <button 
                              onClick={onConfirmCorrection}
                              className="bg-orange-600 hover:bg-orange-700 text-white font-handjet font-bold text-2xl uppercase py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                            >
                              {t.hereBtn}
                            </button>
                            <button 
                              onClick={() => setShowAddressInput(true)}
                              className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-handjet font-bold text-sm uppercase py-2 rounded-lg border border-white/10 active:bg-neutral-600"
                            >
                              {t.byAddress}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                         <form onSubmit={handleAddressSubmit} className="flex gap-2">
                           <input
                             autoFocus
                             type="text"
                             value={correctionInput}
                             onChange={(e) => setCorrectionInput(e.target.value)}
                             placeholder={t.placeholderAddr}
                             className="flex-1 bg-neutral-800 border border-neutral-600 text-white text-base px-3 py-3 rounded-xl focus:border-orange-500 focus:outline-none uppercase font-mono"
                           />
                           <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-4 rounded-xl font-bold font-handjet text-xl">
                              ➜
                           </button>
                        </form>
                        <button 
                           onClick={() => setShowAddressInput(false)}
                           className="text-center text-gray-500 text-xs uppercase font-mono hover:text-white tracking-widest border-t border-white/5 pt-2"
                        >
                            {t.backToMap}
                        </button>
                    </div>
                )}
             </div>
         </div>
      )}

      {/* STANDARD BOTTOM BAR */}
      {!isCorrectionMode && (
      <div className="absolute bottom-0 left-0 right-0 z-[1000] flex flex-col pointer-events-none">
        
        <div className="pointer-events-auto bg-black/60 backdrop-blur-xl border-t border-white/10 px-3 pt-2 rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
            
            {/* Status with Marquee */}
            <div className="flex justify-between items-center mb-2 text-[10px] h-4 overflow-hidden">
               <div className="flex-1 relative h-full mr-2 overflow-hidden">
                   <div className="absolute whitespace-nowrap animate-marquee text-cyan-400/80 font-mono tracking-wide">
                      {aiContext ? aiContext.toUpperCase() : "SYSTEM READY // WAITING FOR INPUT"}
                   </div>
               </div>
               <div className="flex gap-2 font-handjet shrink-0 bg-black/20 backdrop-blur pl-2">
                 <button onClick={onToggleLanguage} className="px-1.5 py-0.5 border border-white/20 bg-white/5 text-white rounded hover:bg-white/10">{language}</button>
                 <button onClick={onToggleGps} className={`px-1.5 py-0.5 border ${gpsEnabled ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'} bg-white/5 rounded`}>{gpsEnabled ? 'GPS' : 'OFF'}</button>
               </div>
            </div>

            {/* Main Action Row */}
            <div className="flex items-center gap-3 h-16 mb-3">
               <div className="flex flex-col justify-center items-center bg-white/5 border border-white/5 rounded-2xl w-20 h-full">
                  <span className="text-gray-500 text-[10px] font-mono uppercase">{t.dist}</span>
                  <span className="text-white font-handjet text-2xl leading-none">{distanceWalked.toFixed(0)}m</span>
               </div>

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
                           <button onClick={onPickCorrectionOnMap} className="flex-[3] bg-neutral-800 border border-orange-500 text-orange-500 font-bold rounded-2xl uppercase font-handjet text-xl tracking-wide hover:bg-neutral-700">
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

               <div className="flex flex-col justify-center items-center bg-white/5 border border-white/5 rounded-2xl w-20 h-full">
                  <span className="text-gray-500 text-[10px] font-mono uppercase">{t.azimuth}</span>
                  <span className="text-white font-handjet text-2xl leading-none">{sensorData.heading.toFixed(0)}°</span>
               </div>
            </div>

            {/* Tools */}
            <div className="flex gap-2 h-10">
                {mode === AppMode.PLANNING ? (
                  <div className="flex gap-2 flex-[2]">
                     <button onClick={onImHere} className="flex-1 bg-orange-900/40 border border-orange-500 text-orange-400 rounded-lg text-sm font-handjet font-bold uppercase hover:bg-orange-800/60 tracking-wider shadow-sm">{t.imHere}</button>
                     <button onClick={onToHere} className="flex-1 bg-blue-900/40 border border-blue-500 text-blue-400 rounded-lg text-sm font-handjet font-bold uppercase hover:bg-blue-800/60 tracking-wider shadow-sm">{t.toHere}</button>
                  </div>
                ) : (
                  <button onClick={onClearPath} className="flex-[2] bg-white/5 border border-white/10 text-gray-400 rounded-lg text-sm font-handjet font-bold uppercase hover:bg-white/10 hover:text-white tracking-wider">{t.resetPath}</button>
                )}

                <div className="flex gap-2 flex-[2]">
                   <button 
                     onClick={onCalibrate} 
                     className={`flex-1 border rounded-lg text-sm font-handjet font-bold uppercase tracking-wider shadow-sm transition-colors
                        ${isMapLocked 
                            ? 'bg-red-900/40 border-red-500 text-red-400' 
                            : 'bg-yellow-900/20 border-yellow-500/40 text-yellow-500 hover:bg-yellow-900/30'}`}
                   >
                      {isMapLocked ? t.unlock : t.calib}
                   </button>
                </div>
            </div>

        </div>
      </div>
      )}

      {/* HELP MODAL */}
      {showHelpModal && (
        <div className="absolute inset-0 z-[3000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
           <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 p-6 rounded-2xl shadow-2xl relative flex flex-col max-h-[80vh]">
              <button 
                onClick={() => setShowHelpModal(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-white z-10"
              >✕</button>
              
              <h3 className="text-white text-2xl font-handjet font-bold mb-4 border-b border-white/10 pb-2 flex-shrink-0">
                {t.helpTitle}
              </h3>
              
              <div className="overflow-y-auto pr-2 custom-scrollbar mb-6">
                <ul className="text-gray-300 font-mono text-sm space-y-3 leading-relaxed">
                  {(t.helpText as string[]).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>

              {/* SUPPORT PROJECT BUTTON */}
              <a 
                href="https://dalink.to/dzheityuk" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-white text-black py-4 rounded-xl text-center font-handjet font-bold text-xl uppercase tracking-widest shadow-lg hover:bg-gray-200 active:scale-[0.98] transition-all flex-shrink-0"
              >
                {t.supportBtn}
              </a>
           </div>
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
