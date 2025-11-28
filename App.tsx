
import React, { useState, useEffect, useRef, useCallback } from 'react';
import MapComponent from './components/MapComponent';
import Dashboard from './components/Dashboard';
import SearchBar from './components/SearchBar';
import { AppMode, Coordinate, SensorData, SearchResult, Language, PickingMode } from './types';
import { calculateNewPosition, reverseGeocode, getDistance } from './services/geoUtils';
import { getDestinationInfo } from './services/geminiService';
import { DEFAULT_CENTER, STEP_LENGTH, MOTION_THRESHOLD, TRANSLATIONS } from './constants';

const App: React.FC = () => {
  // --- State ---
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<AppMode>(AppMode.PLANNING);
  const [userPosition, setUserPosition] = useState<Coordinate>(DEFAULT_CENTER);
  const [mapCenter, setMapCenter] = useState<Coordinate>(DEFAULT_CENTER);
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>('RU');
  
  const [fromAddress, setFromAddress] = useState<string>('');
  const [toAddress, setToAddress] = useState<string>('');
  const [plannedRoute, setPlannedRoute] = useState<Coordinate[]>([]);
  const [walkedPath, setWalkedPath] = useState<Coordinate[]>([]);
  const [aiContext, setAiContext] = useState<string>('');
  
  const [sensorData, setSensorData] = useState<SensorData>({ steps: 0, heading: 0, isWalking: false });
  const [permissionsGranted, setPermissionsGranted] = useState<boolean>(false);

  // Manual Rotation & Lock State
  const [manualRotation, setManualRotation] = useState<number>(0);
  const [isMapLocked, setIsMapLocked] = useState<boolean>(false);

  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [pickingTarget, setPickingTarget] = useState<PickingMode>(null);

  const [correctionInput, setCorrectionInput] = useState('');

  const lastStepTime = useRef<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // --- GPS ---
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
        (err) => console.warn(err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [gpsEnabled, mode, fromAddress]);


  // --- RAIL SHOOTER LOGIC (Core Request) ---
  const moveAlongRoute = (currentPos: Coordinate, route: Coordinate[], dist: number): Coordinate => {
    // 1. Find closest point index on route (simplified)
    let minDst = Infinity;
    let closestIdx = 0;
    
    for (let i = 0; i < route.length; i++) {
        const d = getDistance(route[i], currentPos);
        if (d < minDst) {
            minDst = d;
            closestIdx = i;
        }
    }

    // 2. If we are at the end, stay there
    if (closestIdx >= route.length - 1) return currentPos;

    // 3. Move from closest point towards next point
    const currentPt = route[closestIdx];
    const nextPt = route[closestIdx + 1];
    
    // Calculate bearing between route points
    const lat1 = (currentPt.lat * Math.PI) / 180;
    const lon1 = (currentPt.lng * Math.PI) / 180;
    const lat2 = (nextPt.lat * Math.PI) / 180;
    const lon2 = (nextPt.lng * Math.PI) / 180;
    
    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    const bearingRad = Math.atan2(y, x);
    const bearingDeg = (bearingRad * 180 / Math.PI + 360) % 360;

    // 4. Calculate new position moving 'dist' along that bearing
    // We treat 'currentPos' as if it's on the line, moving towards nextPt
    return calculateNewPosition(currentPos, dist, bearingDeg);
  };

  const registerStep = useCallback(() => {
    setUserPosition(prevPos => {
      let newPos: Coordinate;

      if (plannedRoute.length > 0) {
        // MAGNET MODE: Move along the planned route
        newPos = moveAlongRoute(prevPos, plannedRoute, STEP_LENGTH);
      } else {
        // FREE MODE: Move "UP" relative to the map's manual rotation
        // Since we rotate the map by `manualRotation`, "UP" on screen corresponds to `-manualRotation` bearing.
        newPos = calculateNewPosition(prevPos, STEP_LENGTH, -manualRotation);
      }
      
      setWalkedPath(prevPath => [...prevPath, newPos]);
      return newPos;
    });

    setSensorData(prev => ({ ...prev, steps: prev.steps + 1, isWalking: true }));
  }, [plannedRoute, manualRotation]);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    // Compass is now strictly visual (for the dashboard number only)
    let rawHeading = 0;
    const ev = event as any;
    if (ev.webkitCompassHeading) rawHeading = ev.webkitCompassHeading;
    else if (event.alpha !== null) rawHeading = 360 - event.alpha;
    setSensorData(prev => ({...prev, heading: rawHeading}));
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
        return { coord: { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }, displayName: data[0].display_name };
      }
    } catch (e) {}
    return null;
  };

  const updateRoute = async (start: Coordinate, end: Coordinate) => {
    const routeUrl = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    try {
      const routeRes = await fetch(routeUrl);
      const routeJson = await routeRes.json();
      if (routeJson.routes && routeJson.routes.length > 0) {
        const coords = routeJson.routes[0].geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
        setPlannedRoute(coords);
        return coords;
      }
    } catch (e) {}
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
        if (startResult) { startCoord = startResult.coord; setUserPosition(startCoord); }
      }
      const endResult = await geocodeAddress(toAddress);
      if (!endResult) { alert(TRANSLATIONS[language].geoError); setIsSearching(false); return; }
      
      setMapCenter(startCoord);
      await updateRoute(startCoord, endResult.coord);
      getDestinationInfo(endResult.displayName, language).then(setAiContext);
    } catch (e) {} finally { setIsSearching(false); }
  };

  const snapToPlannedRoute = (currentRoute: Coordinate[], newPos: Coordinate) => {
    if (!currentRoute || currentRoute.length === 0) return [newPos];
    let minIdx = 0;
    let minDst = Infinity;
    currentRoute.forEach((pt, idx) => {
        const d = getDistance(pt, newPos);
        if (d < minDst) { minDst = d; minIdx = idx; }
    });
    return currentRoute.slice(0, minIdx + 1);
  };

  const handleCorrectionSubmit = async (address: string) => {
    setIsSearching(true);
    const result = await geocodeAddress(address);
    if (result) {
      const newPos = result.coord;
      setUserPosition(newPos);
      setMapCenter(newPos);
      
      if (plannedRoute.length > 0) setWalkedPath(snapToPlannedRoute(plannedRoute, newPos));
      else setWalkedPath(prev => [...prev, newPos]);

      if (toAddress && (mode === AppMode.TRACKING || mode === AppMode.BACKTRACK)) {
          const endResult = await geocodeAddress(toAddress);
          if (endResult) await updateRoute(newPos, endResult.coord);
      }
      setPickingTarget(null); // Exit correction mode
      setCorrectionInput('');
    } else { alert(TRANSLATIONS[language].correctionError); }
    setIsSearching(false);
  };

  const handleMapClick = async (coord: Coordinate) => {
    if (pickingTarget) {
      const addr = await reverseGeocode(coord);
      if (pickingTarget === 'from') { setFromAddress(addr); setUserPosition(coord); setMapCenter(coord); setPickingTarget(null); }
      else if (pickingTarget === 'to') { setToAddress(addr); setPickingTarget(null); }
      // NOTE: For 'correction', we don't just pick immediately on click anymore, 
      // we use the crosshair + confirm button flow, so map click does nothing or just centers.
    }
  };

  // Triggers the correction mode UI (Crosshair + Bottom Panel)
  const handleStartCorrection = () => {
      setPickingTarget('correction');
  };

  const handleCancelCorrection = () => {
      setPickingTarget(null);
  };
  
  const handleConfirmCorrectionMapPick = async () => {
    const newPos = mapCenter;
    setUserPosition(newPos);
    if (plannedRoute.length > 0) setWalkedPath(snapToPlannedRoute(plannedRoute, newPos));
    else setWalkedPath(prev => [...prev, newPos]);

    if (toAddress && (mode === AppMode.TRACKING || mode === AppMode.BACKTRACK)) {
        const endResult = await geocodeAddress(toAddress);
        if (endResult) await updateRoute(newPos, endResult.coord);
    }
    setPickingTarget(null);
    setCorrectionInput('');
  };

  const handleCenterChange = (center: Coordinate) => {
    if (mode === AppMode.PLANNING || pickingTarget === 'correction') setMapCenter(center);
  };
  
  const handleImHere = async () => {
    setUserPosition(mapCenter);
    const addr = await reverseGeocode(mapCenter);
    setFromAddress(addr);
    setMapCenter(mapCenter);
    if (toAddress) {
        setIsSearching(true);
        const endResult = await geocodeAddress(toAddress);
        if (endResult) { await updateRoute(mapCenter, endResult.coord); getDestinationInfo(endResult.displayName, language).then(setAiContext); }
        setIsSearching(false);
    }
  };

  const handleToHere = async () => {
    const addr = await reverseGeocode(mapCenter);
    setToAddress(addr);
    if (fromAddress) {
        setIsSearching(true);
        const startResult = await geocodeAddress(fromAddress);
        if (startResult) { await updateRoute(startResult.coord, mapCenter); getDestinationInfo(addr, language).then(setAiContext); }
        setIsSearching(false);
    }
  };

  const handleStart = () => { setMode(AppMode.TRACKING); setWalkedPath([userPosition]); };
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
    setManualRotation(0); // Reset manual rotation
    setIsMapLocked(false);
  };

  const handleClearPath = () => setWalkedPath([userPosition]);
  const handleToggleGps = () => setGpsEnabled(prev => !prev);
  const handleToggleLanguage = () => setLanguage(prev => prev === 'RU' ? 'EN' : 'RU');
  
  const handleLockToggle = () => setIsMapLocked(prev => !prev);

  const handleLongPress = (coord: Coordinate) => {
    if (mode === AppMode.TRACKING || mode === AppMode.BACKTRACK) {
      setUserPosition(coord);
      if (plannedRoute.length > 0) setWalkedPath(snapToPlannedRoute(plannedRoute, coord));
      else setWalkedPath(prev => [...prev, coord]);
      if (toAddress) geocodeAddress(toAddress).then(end => { if (end) updateRoute(coord, end.coord); });
    }
  };
  
  const handleRotateDelta = (delta: number) => {
    setManualRotation(prev => prev + delta);
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
        plannedRoute={plannedRoute}
        walkedPath={walkedPath}
        mode={mode}
        onLongPress={handleLongPress}
        onMapClick={handleMapClick}
        onCenterChange={handleCenterChange}
        pickingTarget={pickingTarget}
        manualRotation={manualRotation}
        onRotateDelta={handleRotateDelta}
        isLocked={isMapLocked}
      />

      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-[500]" />
      
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

      {/* Dashboard handles normal mode AND correction mode UI now */}
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
          correctionInput={correctionInput}
          setCorrectionInput={setCorrectionInput}
          onPickCorrectionOnMap={handleStartCorrection}
          onConfirmCorrection={handleConfirmCorrectionMapPick}
          onCancelCorrection={handleCancelCorrection}
          onCalibrate={handleLockToggle}
          onImHere={handleImHere}
          onToHere={handleToHere}
          isMapLocked={isMapLocked} 
          onClearPath={handleClearPath}
          onRotateDelta={handleRotateDelta} 
          pickingTarget={pickingTarget}
      />

      {/* Legacy "Cancel" button for search picking only (From/To), not correction */}
      {(pickingTarget === 'from' || pickingTarget === 'to') && (
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
