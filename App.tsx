

import React, { useState, useEffect, useRef, useCallback } from 'react';
import MapComponent from './components/MapComponent';
import Dashboard from './components/Dashboard';
import SearchBar from './components/SearchBar';
import { AppMode, Coordinate, SensorData, SearchResult, Language, PickingMode, MapRotationMode } from './types';
import { calculateNewPosition, reverseGeocode } from './services/geoUtils';
import { getDestinationInfo } from './services/geminiService';
import { DEFAULT_CENTER, STEP_LENGTH, MOTION_THRESHOLD, TRANSLATIONS } from './constants';

const App: React.FC = () => {
  // --- State ---
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<AppMode>(AppMode.PLANNING);
  const [userPosition, setUserPosition] = useState<Coordinate>(DEFAULT_CENTER);
  const [mapCenter, setMapCenter] = useState<Coordinate>(DEFAULT_CENTER);
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(true); // Default ON
  const [language, setLanguage] = useState<Language>('RU');
  
  // Route & Path
  const [fromAddress, setFromAddress] = useState<string>('');
  const [toAddress, setToAddress] = useState<string>('');
  const [plannedRoute, setPlannedRoute] = useState<Coordinate[]>([]);
  const [walkedPath, setWalkedPath] = useState<Coordinate[]>([]);
  const [aiContext, setAiContext] = useState<string>('');
  
  // Sensors
  const [sensorData, setSensorData] = useState<SensorData>({ steps: 0, heading: 0, isWalking: false });
  const [permissionsGranted, setPermissionsGranted] = useState<boolean>(false);
  const [headingOffset, setHeadingOffset] = useState<number>(0); // Calibration offset

  // Display Mode
  const [rotationMode, setRotationMode] = useState<MapRotationMode>('NORTH_UP');

  // UI
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [pickingTarget, setPickingTarget] = useState<PickingMode>(null);

  // Correction Modal State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionInput, setCorrectionInput] = useState('');

  // --- Refs for Sensor Loop ---
  const lastStepTime = useRef<number>(0);
  const headingRef = useRef<number>(0); // Raw heading
  const smoothedHeadingRef = useRef<number>(0); // Smoothed heading for display

  // --- Splash Screen Timer ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // --- Initialization & GPS ---
  useEffect(() => {
    let watchId: number | null = null;

    if (navigator.geolocation && gpsEnabled) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (mode === AppMode.PLANNING) {
            const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            if (!fromAddress) {
              setUserPosition(coord);
              setMapCenter(coord);
            }
          }
        },
        (err) => {
          console.warn("GPS Access Failed or Denied.", err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [gpsEnabled, mode, fromAddress]);

  // --- Smoothing Algorithm ---
  // Calculates shortest rotation direction and applies a low-pass filter (lerp)
  const smoothHeading = (current: number, target: number, factor: number) => {
    let delta = target - current;
    // Handle wrap-around (e.g. 350 -> 10)
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    
    // REDUCED SENSITIVITY: 0.05 factor for heavy, smooth rotation (30-50% less sensitive)
    return (current + delta * factor + 360) % 360;
  };

  // --- Sensor Loop (Animation Frame) ---
  useEffect(() => {
    let animationFrameId: number;

    const updateLoop = () => {
      // 1. Get current raw target
      const rawTarget = (headingRef.current + headingOffset) % 360;
      
      // 2. Smooth it
      const smoothed = smoothHeading(smoothedHeadingRef.current, rawTarget, 0.05); 
      smoothedHeadingRef.current = smoothed;

      // 3. Update React State only if changed significantly to avoid rerenders
      setSensorData(prev => {
        if (Math.abs(prev.heading - smoothed) > 0.1) {
            return { ...prev, heading: smoothed };
        }
        return prev;
      });

      animationFrameId = requestAnimationFrame(updateLoop);
    };

    if (permissionsGranted) {
      updateLoop();
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [permissionsGranted, headingOffset]);


  // --- Core Logic: Register a Step (PDR) ---
  const registerStep = useCallback(() => {
    setUserPosition(prevPos => {
      // Use the smoothed heading for movement to avoid jittery path
      const newPos = calculateNewPosition(prevPos, STEP_LENGTH, smoothedHeadingRef.current);
      
      setWalkedPath(prevPath => [...prevPath, newPos]);
      return newPos;
    });

    setSensorData(prev => ({
      ...prev,
      steps: prev.steps + 1,
      isWalking: true
    }));
  }, []);

  // --- Sensor Handlers ---
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    let rawHeading = 0;
    const ev = event as any;
    if (ev.webkitCompassHeading) {
      rawHeading = ev.webkitCompassHeading;
    } else if (event.alpha !== null) {
      rawHeading = 360 - event.alpha;
    }
    // Just update the ref, the loop handles smoothing
    headingRef.current = rawHeading;
  }, []);

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    if (mode !== AppMode.TRACKING && mode !== AppMode.BACKTRACK) return;
    
    const acc = event.accelerationIncludingGravity;
    // Safety check for null acceleration data
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    const magnitude = Math.sqrt(acc.x*acc.x + acc.y*acc.y + acc.z*acc.z);
    const delta = Math.abs(magnitude - 9.8);

    if (delta > MOTION_THRESHOLD) {
      const now = Date.now();
      if (now - lastStepTime.current > 500) {
        lastStepTime.current = now;
        registerStep();
      }
    }
  }, [mode, registerStep]);

  useEffect(() => {
    if (!permissionsGranted) return;
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [permissionsGranted, handleOrientation, handleMotion]);

  const requestPermissions = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') setPermissionsGranted(true);
      } catch (e) {
        // Even if error, try to set granted as some devices don't support the promise correctly
        setPermissionsGranted(true);
      }
    } else {
      setPermissionsGranted(true);
    }
  };

  const geocodeAddress = async (query: string): Promise<{ coord: Coordinate, displayName: string } | null> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data: SearchResult[] = await res.json();
      if (data && data.length > 0) {
        return {
          coord: { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) },
          displayName: data[0].display_name
        };
      }
    } catch (e) {
      console.error("Geocoding failed", e);
    }
    return null;
  };

  const handleRouteRequest = async () => {
    setIsSearching(true);
    setPlannedRoute([]);
    setAiContext('');

    try {
      let startCoord = userPosition;
      
      if (fromAddress.trim()) {
        const startResult = await geocodeAddress(fromAddress);
        if (startResult) {
          startCoord = startResult.coord;
          setUserPosition(startCoord);
        }
      }

      const endResult = await geocodeAddress(toAddress);
      if (!endResult) {
        alert(TRANSLATIONS[language].geoError);
        setIsSearching(false);
        return;
      }
      const endCoord = endResult.coord;
      setMapCenter(startCoord);

      // Use routed-foot for pedestrian paths
      const routeUrl = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${startCoord.lng},${startCoord.lat};${endCoord.lng},${endCoord.lat}?overview=full&geometries=geojson`;
      const routeRes = await fetch(routeUrl);
      const routeJson = await routeRes.json();

      if (routeJson.routes && routeJson.routes.length > 0) {
        const coords = routeJson.routes[0].geometry.coordinates.map((c: number[]) => ({
          lat: c[1],
          lng: c[0]
        }));
        setPlannedRoute(coords);
      }
      const context = await getDestinationInfo(endResult.displayName);
      setAiContext(context);
    } catch (e) {
      console.error("Routing failed", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCorrectionSubmit = async (address: string) => {
    setIsSearching(true);
    const result = await geocodeAddress(address);
    if (result) {
      setUserPosition(result.coord);
      setWalkedPath(prev => {
        const newPath = [...prev];
        if (newPath.length > 0) newPath[newPath.length - 1] = result.coord;
        else newPath.push(result.coord);
        return newPath;
      });
      setMapCenter(result.coord);
      setShowCorrectionModal(false);
      setCorrectionInput('');
    } else {
      alert(TRANSLATIONS[language].correctionError);
    }
    setIsSearching(false);
  };

  const handleMapClick = async (coord: Coordinate) => {
    if (pickingTarget) {
      const addr = await reverseGeocode(coord);
      if (pickingTarget === 'from') {
        setFromAddress(addr);
        setUserPosition(coord);
        setMapCenter(coord);
        setPickingTarget(null);
      } else if (pickingTarget === 'to') {
        setToAddress(addr);
        setPickingTarget(null);
      } else if (pickingTarget === 'correction') {
        setCorrectionInput(addr);
        setShowCorrectionModal(true);
        setPickingTarget(null);
      }
    }
  };

  const handlePickCorrectionOnMap = () => {
    setShowCorrectionModal(false);
    setPickingTarget('correction');
  };
  
  // NEW: Handle snapping to map center during correction
  const handleConfirmCorrectionMapPick = async () => {
    // 1. Snap User Position to the Reticle (Map Center)
    setUserPosition(mapCenter);

    // 2. Fix the path history to snap the line visually
    setWalkedPath(prev => {
      const newPath = [...prev];
      if (newPath.length > 0) newPath[newPath.length - 1] = mapCenter;
      else newPath.push(mapCenter);
      return newPath;
    });
    
    // 3. Close picking mode
    setPickingTarget(null);
    setCorrectionInput(''); // clear input
    
    // Optional: Reverse geocode silently to update address cache if needed
    reverseGeocode(mapCenter).then(addr => {
        // Just log or could update UI toast
    });
  };

  const handleCenterChange = (center: Coordinate) => {
    // In planning, we track center for picking.
    // In correction picking mode (TRACKING), we also track it.
    if (mode === AppMode.PLANNING || pickingTarget === 'correction') {
      setMapCenter(center);
    }
  };
  
  // Logic: "I'm Here" sets the current map center as the Start Point (Point A)
  const handleImHere = async () => {
    // 1. Snap User Position to the Reticle (Map Center)
    setUserPosition(mapCenter);
    
    // 2. Get Address
    const addr = await reverseGeocode(mapCenter);
    
    // 3. Set as Point A (From)
    setFromAddress(addr);
    
    // 4. Update map center to ensure sync
    setMapCenter(mapCenter);
  };

  // Logic: "To Here" sets the current map center as the Destination (Point B)
  const handleToHere = async () => {
    // 1. Get Address of the crosshair
    const addr = await reverseGeocode(mapCenter);
    // 2. Set as Point B (To)
    setToAddress(addr);
  };

  const handleStart = () => {
    setMode(AppMode.TRACKING);
    setWalkedPath([userPosition]);
  };

  const handleStop = () => {
    setMode(AppMode.BACKTRACK);
  };
  
  const handleReturn = () => {
     const pathBack = [...walkedPath].reverse();
     setPlannedRoute(pathBack);
     setWalkedPath([userPosition]);
     setMode(AppMode.TRACKING); 
     setToAddress(fromAddress || "START");
  };

  const handleReset = () => {
    setMode(AppMode.PLANNING);
    setPlannedRoute([]);
    setWalkedPath([]);
    setSensorData(prev => ({ ...prev, steps: 0 }));
    setFromAddress('');
    setToAddress('');
    setAiContext('');
    setHeadingOffset(0);
    setRotationMode('NORTH_UP');
  };

  const handleToggleGps = () => setGpsEnabled(prev => !prev);
  const handleToggleLanguage = () => setLanguage(prev => prev === 'RU' ? 'EN' : 'RU');
  const handleToggleRotation = () => setRotationMode(prev => prev === 'NORTH_UP' ? 'HEADS_UP' : 'NORTH_UP');

  const handleLongPress = (coord: Coordinate) => {
    if (mode === AppMode.TRACKING || mode === AppMode.BACKTRACK) {
      setUserPosition(coord);
      setWalkedPath(prev => {
        const newPath = [...prev];
        if (newPath.length > 0) newPath[newPath.length - 1] = coord;
        else newPath.push(coord);
        return newPath;
      });
    }
  };
  
  const handleCalibrate = () => {
    const currentRaw = headingRef.current;
    const newOffset = -currentRaw;
    setHeadingOffset(newOffset);
  };

  const totalDistance = sensorData.steps * STEP_LENGTH;

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-black font-mono">
      {showSplash && (
        <div className="absolute inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-opacity duration-500 ease-out" style={{ opacity: showSplash ? 1 : 0, pointerEvents: showSplash ? 'auto' : 'none' }}>
           <h1 className="glitch font-gemunu font-bold text-6xl md:text-7xl text-white tracking-widest mb-4" data-text="GiroMap">GiroMap</h1>
           <div className="absolute bottom-12 text-lg text-neutral-500 font-pixelify tracking-[0.3em] uppercase">{TRANSLATIONS[language].byAuthor}</div>
        </div>
      )}

      <MapComponent 
        center={mapCenter}
        userPosition={userPosition}
        heading={sensorData.heading}
        plannedRoute={plannedRoute}
        walkedPath={walkedPath}
        mode={mode}
        onLongPress={handleLongPress}
        onMapClick={handleMapClick}
        rotationMode={rotationMode}
        onCenterChange={handleCenterChange}
        pickingTarget={pickingTarget}
      />

      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-[500]" />
      
      {/* Floating "HERE" Button - Only visible during Correction Picking */}
      {pickingTarget === 'correction' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-16 z-[1500] animate-in zoom-in duration-200">
           <button 
             onClick={handleConfirmCorrectionMapPick}
             className="bg-orange-600 text-white font-handjet font-bold text-xl px-6 py-2 rounded-full shadow-[0_0_20px_rgba(255,69,0,0.6)] border border-white/20 uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform"
           >
             {TRANSLATIONS[language].hereBtn}
           </button>
           {/* Triangle pointer pointing down to dot */}
           <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-orange-600 absolute left-1/2 -translate-x-1/2 -bottom-2"></div>
        </div>
      )}

      {mode === AppMode.PLANNING && (
        <SearchBar 
          fromValue={fromAddress}
          toValue={toAddress}
          onFromChange={setFromAddress}
          onToChange={setToAddress}
          onRoute={handleRouteRequest} 
          isSearching={isSearching}
          onPickLocation={(target) => setPickingTarget(target)}
          pickingTarget={pickingTarget}
          language={language}
        />
      )}

      {/* Hide Dashboard during map picking to give more view space */}
      {pickingTarget !== 'correction' && (
        <Dashboard 
          mode={mode}
          sensorData={sensorData}
          targetAddress={toAddress}
          aiContext={aiContext}
          distanceWalked={totalDistance}
          onStart={handleStart}
          onStop={handleStop}
          onReset={handleReset}
          onReturn={handleReturn}
          onRequestPermissions={requestPermissions}
          permissionsGranted={permissionsGranted}
          onCorrectionSubmit={handleCorrectionSubmit}
          gpsEnabled={gpsEnabled}
          onToggleGps={handleToggleGps}
          language={language}
          onToggleLanguage={handleToggleLanguage}
          showCorrectionModal={showCorrectionModal}
          setShowCorrectionModal={setShowCorrectionModal}
          correctionInput={correctionInput}
          setCorrectionInput={setCorrectionInput}
          onPickCorrectionOnMap={handlePickCorrectionOnMap}
          onCalibrate={handleCalibrate}
          onImHere={handleImHere}
          onToHere={handleToHere}
          rotationMode={rotationMode}
          onToggleRotation={handleToggleRotation}
        />
      )}
      
      {/* If picking correction, show a simple "Cancel" button at bottom instead of full dashboard */}
      {pickingTarget === 'correction' && (
        <div className="absolute bottom-10 left-0 right-0 z-[1000] flex justify-center pb-[env(safe-area-inset-bottom)]">
           <button 
             onClick={() => setPickingTarget(null)}
             className="bg-neutral-900/80 backdrop-blur border border-white/20 text-white font-handjet px-8 py-2 rounded-full uppercase text-xl shadow-lg"
           >
             {TRANSLATIONS[language].cancel}
           </button>
        </div>
      )}
    </div>
  );
};

export default App;