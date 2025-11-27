
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

  // Correction Modal State (Lifted from Dashboard to handle map picking)
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionInput, setCorrectionInput] = useState('');

  // --- Refs for Sensor Loop ---
  const lastStepTime = useRef<number>(0);
  const headingRef = useRef<number>(0); // Mutable ref for immediate access in event loop

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
      // Use watchPosition instead of getCurrentPosition to catch initial fix better
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          // ONLY update user position from GPS if we are in PLANNING mode
          // Once tracking starts, we ignore GPS (Dead Reckoning)
          if (mode === AppMode.PLANNING) {
            const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            // Only update if user hasn't manually set "From" address to something specific,
            // OR if "From" is empty.
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

  // --- Core Logic: Register a Step (PDR) ---
  const registerStep = useCallback(() => {
    setUserPosition(prevPos => {
      // Calculate new position based on current heading (including calibration)
      const adjustedHeading = (headingRef.current + headingOffset) % 360;
      const newPos = calculateNewPosition(prevPos, STEP_LENGTH, adjustedHeading);
      
      // Update path
      setWalkedPath(prevPath => [...prevPath, newPos]);
      
      return newPos;
    });

    setSensorData(prev => ({
      ...prev,
      steps: prev.steps + 1,
      isWalking: true
    }));
  }, [headingOffset]);

  // --- Sensor Handlers ---
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    // Alpha is the compass heading (0-360)
    // iOS webkitCompassHeading is better if available
    let rawHeading = 0;
    
    // TypeScript check for iOS property
    const ev = event as any;
    if (ev.webkitCompassHeading) {
      rawHeading = ev.webkitCompassHeading;
    } else if (event.alpha !== null) {
      rawHeading = 360 - event.alpha; // Web standard is counter-clockwise
    }

    headingRef.current = rawHeading;
    
    // Apply calibration for display
    const displayedHeading = (rawHeading + headingOffset + 360) % 360;
    setSensorData(prev => ({ ...prev, heading: displayedHeading }));
  }, [headingOffset]);

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    if (mode !== AppMode.TRACKING && mode !== AppMode.BACKTRACK) return;
    
    const acc = event.accelerationIncludingGravity;
    if (!acc || !acc.x || !acc.y || !acc.z) return;

    // Simple Step Detection: Check total magnitude variance
    const magnitude = Math.sqrt(acc.x*acc.x + acc.y*acc.y + acc.z*acc.z);
    const delta = Math.abs(magnitude - 9.8);

    if (delta > MOTION_THRESHOLD) {
      const now = Date.now();
      if (now - lastStepTime.current > 500) { // Min 500ms between steps
        lastStepTime.current = now;
        registerStep();
      }
    }
  }, [mode, registerStep]);

  // --- Manage Event Listeners ---
  useEffect(() => {
    if (!permissionsGranted) return;

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [permissionsGranted, handleOrientation, handleMotion]);

  // --- Permissions ---
  const requestPermissions = async () => {
    // iOS 13+ requires explicit permission for DeviceOrientation
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setPermissionsGranted(true);
        }
      } catch (e) {
        console.error(e);
        // If simulated environment or desktop, just grant to allow testing
        setPermissionsGranted(true);
      }
    } else {
      // Non-iOS or older devices
      setPermissionsGranted(true);
    }
  };

  // Helper: Geocode Address
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

  // --- Logic: Search & Routing ---
  const handleRouteRequest = async () => {
    setIsSearching(true);
    
    // Clear previous
    setPlannedRoute([]);
    setAiContext('');

    try {
      let startCoord = userPosition;
      
      // 1. Resolve Start Point (Point A)
      if (fromAddress.trim()) {
        const startResult = await geocodeAddress(fromAddress);
        if (startResult) {
          startCoord = startResult.coord;
          // TELEPORT USER TO POINT A
          setUserPosition(startCoord);
        }
      }

      // 2. Resolve End Point (Point B)
      const endResult = await geocodeAddress(toAddress);
      if (!endResult) {
        alert(TRANSLATIONS[language].geoError);
        setIsSearching(false);
        return;
      }
      const endCoord = endResult.coord;

      // Center map on Start Point (Point A)
      setMapCenter(startCoord);

      // 3. Fetch Route via OpenStreetMap.de Foot Routing
      const routeUrl = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${startCoord.lng},${startCoord.lat};${endCoord.lng},${endCoord.lat}?overview=full&geometries=geojson`;
      
      const routeRes = await fetch(routeUrl);
      const routeJson = await routeRes.json();

      if (routeJson.routes && routeJson.routes.length > 0) {
        // Convert GeoJSON [lng, lat] to {lat, lng}
        const coords = routeJson.routes[0].geometry.coordinates.map((c: number[]) => ({
          lat: c[1],
          lng: c[0]
        }));
        setPlannedRoute(coords);
      }

      // 4. Get AI Context for Destination
      const context = await getDestinationInfo(endResult.displayName);
      setAiContext(context);

    } catch (e) {
      console.error("Routing failed", e);
    } finally {
      setIsSearching(false);
    }
  };

  // --- Logic: Manual Correction ---
  const handleCorrectionSubmit = async (address: string) => {
    setIsSearching(true);
    const result = await geocodeAddress(address);
    if (result) {
      // Teleport user to corrected location
      setUserPosition(result.coord);
      // Snap Logic: Replace the last point instead of appending a new segment
      setWalkedPath(prev => {
        const newPath = [...prev];
        if (newPath.length > 0) {
          newPath[newPath.length - 1] = result.coord;
        } else {
          newPath.push(result.coord);
        }
        return newPath;
      });
      setMapCenter(result.coord); // Re-center map
      setShowCorrectionModal(false);
      setCorrectionInput('');
    } else {
      alert(TRANSLATIONS[language].correctionError);
    }
    setIsSearching(false);
  };

  // --- Map Click Handling ---
  const handleMapClick = async (coord: Coordinate) => {
    if (pickingTarget) {
      // Reverse Geocode
      const addr = await reverseGeocode(coord);
      
      if (pickingTarget === 'from') {
        setFromAddress(addr);
        setUserPosition(coord); // Immediately move visual marker for Start
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
    setShowCorrectionModal(false); // Close modal to see map
    setPickingTarget('correction'); // Enter map picking mode
  };
  
  // Track center for "I'm Here" functionality
  const handleCenterChange = (center: Coordinate) => {
    // Only update if not in tracking mode (performance)
    if (mode === AppMode.PLANNING) {
      setMapCenter(center);
    }
  };
  
  const handleImHere = async () => {
    setUserPosition(mapCenter);
    // Reverse geocode this center to fill "From"
    const addr = await reverseGeocode(mapCenter);
    setFromAddress(addr);
  };

  // --- Logic: App State ---
  const handleStart = () => {
    setMode(AppMode.TRACKING);
    // Start breadcrumbs with current position (Point A)
    setWalkedPath([userPosition]);
  };

  const handleStop = () => {
    // Just finish
    setMode(AppMode.BACKTRACK);
  };
  
  const handleReturn = () => {
     setMode(AppMode.TRACKING); // Go back to tracking, but path is reversed? 
     // Requirement: "Return along route".
     // Simplest way: Make the walked path the new "Planned Route" (reversed), clear walked path, and start new tracking.
     
     const pathBack = [...walkedPath].reverse();
     setPlannedRoute(pathBack);
     setWalkedPath([userPosition]); // Start new tracking
     setMode(AppMode.TRACKING); 
     // Optionally set Target Address to "START POINT"
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

  const handleToggleGps = () => {
    setGpsEnabled(prev => !prev);
  };

  const handleToggleLanguage = () => {
    setLanguage(prev => prev === 'RU' ? 'EN' : 'RU');
  };

  const handleToggleRotation = () => {
    setRotationMode(prev => prev === 'NORTH_UP' ? 'HEADS_UP' : 'NORTH_UP');
  };

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
  
  // --- Calibration Logic ---
  const handleCalibrate = () => {
    // Requirement: "at press of button, arrow points straight (direction person looks)"
    // If user is looking straight, and phone sensor says X degrees.
    // We want the APP to show 0 degrees (Up/North on map or Straight in heads up).
    // So displayedHeading = (raw + offset) % 360  =>  0 = raw + offset  => offset = -raw.
    
    const currentRaw = headingRef.current;
    const newOffset = -currentRaw;
    setHeadingOffset(newOffset);
  };

  // Calculate Distance Walked
  const totalDistance = sensorData.steps * STEP_LENGTH;

  return (
    // iOS FIX: Use h-full with fixed body to ensure full coverage
    <div className="relative w-full h-full overflow-hidden bg-black font-mono">
      
      {/* Splash Screen */}
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
        rotationMode={rotationMode}
        onToggleRotation={handleToggleRotation}
      />
    </div>
  );
};

export default App;
