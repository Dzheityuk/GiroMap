import React, { useState, useEffect, useRef, useCallback } from 'react';
import MapComponent from './components/MapComponent';
import Dashboard from './components/Dashboard';
import SearchBar from './components/SearchBar';
import { AppMode, Coordinate, SensorData, SearchResult, Language, PickingMode, MapRotationMode } from './types';
import { calculateNewPosition, reverseGeocode, getDistance } from './services/geoUtils';
import { getDestinationInfo } from './services/geminiService';
import { DEFAULT_CENTER, STEP_LENGTH, MOTION_THRESHOLD, TRANSLATIONS } from './constants';

const App: React.FC = () => {
  // --- State ---
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<AppMode>(AppMode.PLANNING);
  const [userPosition, setUserPosition] = useState<Coordinate>(DEFAULT_CENTER);
  const [mapCenter, setMapCenter] = useState<Coordinate>(DEFAULT_CENTER);
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(false); // DEFAULT OFF per request
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
  const [headingOffset, setHeadingOffset] = useState<number>(0);

  // Display Mode
  const [rotationMode, setRotationMode] = useState<MapRotationMode>('NORTH_UP');

  // UI
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [pickingTarget, setPickingTarget] = useState<PickingMode>(null);

  // Correction Modal State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionInput, setCorrectionInput] = useState('');

  // --- Refs ---
  const lastStepTime = useRef<number>(0);
  const headingRef = useRef<number>(0);
  const smoothedHeadingRef = useRef<number>(0);

  // --- Splash Screen ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // --- GPS Logic ---
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

  // --- Smoothing ---
  const smoothHeading = (current: number, target: number, factor: number) => {
    let delta = target - current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return (current + delta * factor + 360) % 360;
  };

  // --- Sensor Loop ---
  useEffect(() => {
    let animationFrameId: number;
    const updateLoop = () => {
      const rawTarget = (headingRef.current + headingOffset) % 360;
      const smoothed = smoothHeading(smoothedHeadingRef.current, rawTarget, 0.05); 
      smoothedHeadingRef.current = smoothed;

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


  // --- PDR Logic ---
  const registerStep = useCallback(() => {
    setUserPosition(prevPos => {
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

  // --- Sensor Listeners ---
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    let rawHeading = 0;
    const ev = event as any;
    if (ev.webkitCompassHeading) {
      rawHeading = ev.webkitCompassHeading;
    } else if (event.alpha !== null) {
      rawHeading = 360 - event.alpha;
    }
    headingRef.current = rawHeading;
  }, []);

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    if (mode !== AppMode.TRACKING && mode !== AppMode.BACKTRACK) return;
    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;
    const magnitude = Math.sqrt(acc.x*acc.x + acc.y*acc.y + acc.z*acc.z);
    if (Math.abs(magnitude - 9.8) > MOTION_THRESHOLD) {
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
      } catch (e) { setPermissionsGranted(true); }
    } else { setPermissionsGranted(true); }
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
    } catch (e) { console.error("Geocoding failed", e); }
    return null;
  };

  const updateRoute = async (start: Coordinate, end: Coordinate) => {
    const routeUrl = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    try {
      const routeRes = await fetch(routeUrl);
      const routeJson = await routeRes.json();
      if (routeJson.routes && routeJson.routes.length > 0) {
        const coords = routeJson.routes[0].geometry.coordinates.map((c: number[]) => ({
          lat: c[1],
          lng: c[0]
        }));
        setPlannedRoute(coords);
        return coords;
      }
    } catch (e) { console.error("Route update failed", e); }
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

      await updateRoute(startCoord, endCoord);
      
      const context = await getDestinationInfo(endResult.displayName);
      setAiContext(context);
    } catch (e) { console.error("Routing failed", e); } 
    finally { setIsSearching(false); }
  };

  // Helper to Snap Walked Path to the Route
  // Finds the point on the planned route closest to the current correction,
  // and creates a walked path that perfectly follows the route up to that point.
  const snapToPlannedRoute = (currentRoute: Coordinate[], newPos: Coordinate) => {
    if (!currentRoute || currentRoute.length === 0) return [newPos];
    
    let minIdx = 0;
    let minDst = Infinity;
    
    currentRoute.forEach((pt, idx) => {
        const d = getDistance(pt, newPos);
        if (d < minDst) {
            minDst = d;
            minIdx = idx;
        }
    });

    // Return segment + new point to ensure connection
    const snapped = currentRoute.slice(0, minIdx + 1);
    // snapped.push(newPos); // Optional: append exact GPS fix or just stick to route? Sticking to route is cleaner visually.
    return snapped;
  };

  const handleCorrectionSubmit = async (address: string) => {
    setIsSearching(true);
    const result = await geocodeAddress(address);
    if (result) {
      const newPos = result.coord;
      setUserPosition(newPos);
      setMapCenter(newPos);
      
      // Update visual path using snapping if a route exists
      if (plannedRoute.length > 0) {
          const snapped = snapToPlannedRoute(plannedRoute, newPos);
          setWalkedPath(snapped);
      } else {
          // No route, just append
          setWalkedPath(prev => [...prev, newPos]);
      }

      // Reroute from new position to destination
      if (toAddress && (mode === AppMode.TRACKING || mode === AppMode.BACKTRACK)) {
          const endResult = await geocodeAddress(toAddress);
          if (endResult) {
             await updateRoute(newPos, endResult.coord);
          }
      }
      
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
  
  const handleConfirmCorrectionMapPick = async () => {
    const newPos = mapCenter;
    setUserPosition(newPos);

    // Update visual path using snapping if a route exists
    if (plannedRoute.length > 0) {
        const snapped = snapToPlannedRoute(plannedRoute, newPos);
        setWalkedPath(snapped);
    } else {
        setWalkedPath(prev => {
           const newPath = [...prev];
           newPath.push(newPos);
           return newPath;
        });
    }

    // Reroute from new position to destination
    if (toAddress && (mode === AppMode.TRACKING || mode === AppMode.BACKTRACK)) {
        const endResult = await geocodeAddress(toAddress);
        if (endResult) {
            await updateRoute(newPos, endResult.coord);
        }
    }
    
    setPickingTarget(null);
    setCorrectionInput('');
  };

  const handleCenterChange = (center: Coordinate) => {
    if (mode === AppMode.PLANNING || pickingTarget === 'correction') {
      setMapCenter(center);
    }
  };
  
  const handleImHere = async () => {
    setUserPosition(mapCenter);
    const addr = await reverseGeocode(mapCenter);
    setFromAddress(addr);
    setMapCenter(mapCenter);
    
    // Auto-Build Route
    if (toAddress) {
        setIsSearching(true);
        const endResult = await geocodeAddress(toAddress);
        if (endResult) {
            await updateRoute(mapCenter, endResult.coord);
            getDestinationInfo(endResult.displayName).then(setAiContext);
        }
        setIsSearching(false);
    }
  };

  const handleToHere = async () => {
    const addr = await reverseGeocode(mapCenter);
    setToAddress(addr);
    
    // Auto-Build Route
    if (fromAddress) {
        setIsSearching(true);
        const startResult = await geocodeAddress(fromAddress);
        if (startResult) {
            await updateRoute(startResult.coord, mapCenter);
            getDestinationInfo(addr).then(setAiContext);
        }
        setIsSearching(false);
    }
  };

  const handleStart = () => {
    setMode(AppMode.TRACKING);
    setWalkedPath([userPosition]);
  };

  const handleStop = () => setMode(AppMode.BACKTRACK);
  
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
      // Snap on long press too
      if (plannedRoute.length > 0) {
         const snapped = snapToPlannedRoute(plannedRoute, coord);
         setWalkedPath(snapped);
      } else {
         setWalkedPath(prev => [...prev, coord]);
      }
      
      if (toAddress) {
        geocodeAddress(toAddress).then(end => {
           if (end) updateRoute(coord, end.coord);
        });
      }
    }
  };
  
  const handleCalibrate = () => {
    const currentRaw = headingRef.current;
    const newOffset = -currentRaw;
    setHeadingOffset(newOffset);
  };

  const handleManualRotation = (delta: number) => {
    setHeadingOffset(prev => prev + delta);
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
        onRotateDelta={handleManualRotation}
      />

      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-[500]" />
      
      {pickingTarget === 'correction' && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1500] animate-in slide-in-from-right duration-300">
           <button 
             onClick={handleConfirmCorrectionMapPick}
             className="w-16 h-16 bg-orange-600 rounded-full border-4 border-black/50 shadow-[0_0_20px_rgba(255,69,0,0.8)] flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
           >
             <span className="font-handjet font-bold text-white text-xl uppercase tracking-widest leading-none">
               {TRANSLATIONS[language].hereBtn}
             </span>
           </button>
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
      
      {pickingTarget === 'correction' && (
        <div className="absolute bottom-10 left-0 right-0 z-[1000] flex justify-center pb-[env(safe-area-inset-bottom)]">
           <button 
             onClick={() => setPickingTarget(null)}
             className="bg-neutral-900/80 backdrop-blur border border-white/20 text-white font-handjet px-8 py-2 rounded-full uppercase text-xl shadow-lg hover:bg-neutral-800"
           >
             {TRANSLATIONS[language].cancel}
           </button>
        </div>
      )}
    </div>
  );
};

export default App;