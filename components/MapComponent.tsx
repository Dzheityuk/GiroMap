
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Coordinate, AppMode, MapRotationMode } from '../types';
import { TILE_LAYER_URL, TILE_ATTRIBUTION } from '../constants';

// Fix Leaflet icon issue by using CDN URLs directly
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Arrow Icon for User
const createArrowIcon = (heading: number, isHeadsUp: boolean) => L.divIcon({
  // If Heads Up, arrow is always up (0 deg), else it follows heading
  html: `<div style="transform: rotate(${isHeadsUp ? 0 : heading}deg); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22L12 18L22 22L12 2Z" fill="#FF4500" stroke="white" stroke-width="2"/>
          </svg>
         </div>`,
  className: 'bg-transparent',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface MapProps {
  center: Coordinate;
  userPosition: Coordinate;
  heading: number;
  plannedRoute: Coordinate[];
  walkedPath: Coordinate[];
  mode: AppMode;
  onLongPress: (coord: Coordinate) => void;
  onMapClick: (coord: Coordinate) => void;
  rotationMode: MapRotationMode;
  onCenterChange: (center: Coordinate) => void;
}

const MapController: React.FC<{ 
  center: Coordinate, 
  mode: AppMode, 
  userPosition: Coordinate,
}> = ({ center, mode, userPosition }) => {
  const map = useMap();

  // Force Leaflet to recalculate container size. 
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(map.getContainer());
    
    // Initial invalidation just in case
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => resizeObserver.disconnect();
  }, [map]);

  useEffect(() => {
    // In tracking mode, follow the user
    if (mode === AppMode.TRACKING || mode === AppMode.BACKTRACK) {
      map.panTo([userPosition.lat, userPosition.lng], { animate: true, duration: 0.5 });
    } else {
      // In planning mode, respect the passed center ONLY if it drastically changes 
      // (Optimization to allow panning)
      // Actually, standard practice: only pan if explicit external center change. 
      // But here we rely on the App.tsx state.
      map.panTo([center.lat, center.lng], { animate: true, duration: 0.5 });
    }
  }, [center, mode, userPosition, map]);

  return null;
};

const MapEvents: React.FC<{ 
  onLongPress: (c: Coordinate) => void, 
  onMapClick: (c: Coordinate) => void,
  onCenterChange: (c: Coordinate) => void
}> = ({ onLongPress, onMapClick, onCenterChange }) => {
  useMapEvents({
    contextmenu(e) {
      onLongPress({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    moveend(e) {
      const center = e.target.getCenter();
      onCenterChange({ lat: center.lat, lng: center.lng });
    }
  });
  return null;
};

const MapComponent: React.FC<MapProps> = ({ 
  center, 
  userPosition, 
  heading, 
  plannedRoute, 
  walkedPath, 
  mode,
  onLongPress,
  onMapClick,
  rotationMode,
  onCenterChange
}) => {
  
  const isHeadsUp = rotationMode === 'HEADS_UP';

  return (
    <div className="absolute inset-0 z-0 bg-black w-full h-full overflow-hidden">
        
        {/* The Map Container with CSS Rotation for Heads Up Mode */}
        <div 
           className="w-full h-full transition-transform duration-300 ease-out will-change-transform"
           style={{ 
             transform: isHeadsUp ? `rotate(${-heading}deg)` : 'rotate(0deg)',
             transformOrigin: 'center center' 
           }}
        >
          <MapContainer 
            center={[center.lat, center.lng]} 
            zoom={17} 
            zoomControl={false} 
            className="invert-map"
            style={{ height: '100%', width: '100%', background: '#000' }}
          >
            <TileLayer
              attribution={TILE_ATTRIBUTION}
              url={TILE_LAYER_URL}
              maxZoom={19}
            />
            
            <MapController center={center} mode={mode} userPosition={userPosition} />
            <MapEvents onLongPress={onLongPress} onMapClick={onMapClick} onCenterChange={onCenterChange} />

            {/* Planned Route - Gray Line */}
            {plannedRoute.length > 0 && (
              <Polyline 
                positions={plannedRoute.map(c => [c.lat, c.lng])} 
                pathOptions={{ color: '#666', weight: 6, dashArray: '10, 10', opacity: 0.7 }} 
              />
            )}

            {/* Walked Path - Orange Line (High Contrast) */}
            {walkedPath.length > 0 && (
              <Polyline 
                positions={walkedPath.map(c => [c.lat, c.lng])} 
                pathOptions={{ color: '#FF4500', weight: 5, opacity: 0.9 }} 
              />
            )}

            {/* User Marker */}
            <Marker 
              position={[userPosition.lat, userPosition.lng]} 
              icon={createArrowIcon(heading, isHeadsUp)} 
              zIndexOffset={1000}
            />

            {/* Destination Marker */}
            {plannedRoute.length > 0 && (
              <Marker position={[plannedRoute[plannedRoute.length - 1].lat, plannedRoute[plannedRoute.length - 1].lng]} />
            )}

          </MapContainer>
        </div>
        
        {/* Center Dot (Reticle) - Visible only in Planning Mode */}
        {mode === AppMode.PLANNING && (
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full z-[999] -translate-x-1/2 -translate-y-1/2 shadow-[0_0_4px_rgba(0,0,0,0.8)] pointer-events-none" />
        )}
    </div>
  );
};

export default MapComponent;
