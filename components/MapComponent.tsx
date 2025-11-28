
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Coordinate, AppMode, PickingMode } from '../types';
import { TILE_LAYER_URL, TILE_ATTRIBUTION } from '../constants';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Arrow always points UP (0 deg) because the MAP rotates underneath it.
const createArrowIcon = () => L.divIcon({
  html: `<div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
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
  plannedRoute: Coordinate[];
  walkedPath: Coordinate[];
  mode: AppMode;
  onLongPress: (coord: Coordinate) => void;
  onMapClick: (coord: Coordinate) => void;
  onCenterChange: (center: Coordinate) => void;
  pickingTarget: PickingMode;
  manualRotation: number;
  onRotateDelta: (delta: number) => void;
  isLocked: boolean;
}

const MapController: React.FC<{ 
  center: Coordinate, 
  mode: AppMode, 
  userPosition: Coordinate,
  pickingTarget: PickingMode
}> = ({ center, mode, userPosition, pickingTarget }) => {
  const map = useMap();

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(map.getContainer());
    setTimeout(() => { map.invalidateSize(); }, 100);
    return () => resizeObserver.disconnect();
  }, [map]);

  useEffect(() => {
    if (pickingTarget) return;

    if (mode === AppMode.TRACKING || mode === AppMode.BACKTRACK) {
      map.panTo([userPosition.lat, userPosition.lng], { animate: true, duration: 0.5 });
    } else {
      map.panTo([center.lat, center.lng], { animate: true, duration: 0.5 });
    }
  }, [center, mode, userPosition, map, pickingTarget]);

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
  plannedRoute, 
  walkedPath, 
  mode,
  onLongPress,
  onMapClick,
  onCenterChange,
  pickingTarget,
  manualRotation,
  onRotateDelta,
  isLocked
}) => {
  
  const showReticle = mode === AppMode.PLANNING || pickingTarget === 'correction';
  
  // -- Gesture Handling --
  const touchStartAngle = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLocked) return; // Disable rotation if locked
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const angle = Math.atan2(touch2.pageY - touch1.pageY, touch2.pageX - touch1.pageX) * 180 / Math.PI;
      touchStartAngle.current = angle;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isLocked) return;
    if (e.touches.length === 2 && touchStartAngle.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentAngle = Math.atan2(touch2.pageY - touch1.pageY, touch2.pageX - touch1.pageX) * 180 / Math.PI;
      
      const delta = currentAngle - touchStartAngle.current;
      onRotateDelta(delta);
      
      touchStartAngle.current = currentAngle;
    }
  };

  const handleTouchEnd = () => {
    touchStartAngle.current = null;
  };

  return (
    <div 
      className="absolute inset-0 z-0 bg-black w-full h-full overflow-hidden flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
        
        {/* Map Container */}
        <div 
           className="w-full h-full transition-transform duration-300 ease-out will-change-transform flex-shrink-0"
           style={{ 
             width: '150vmax', 
             height: '150vmax', 
             transform: `rotate(${manualRotation}deg)`, // Only manual rotation
             transformOrigin: 'center center' 
           }}
        >
          <MapContainer 
            center={[center.lat, center.lng]} 
            zoom={17} 
            zoomControl={false} 
            dragging={!isLocked} // Disable panning if locked
            className="invert-map"
            style={{ height: '100%', width: '100%', background: '#000' }}
          >
            <TileLayer
              attribution={TILE_ATTRIBUTION}
              url={TILE_LAYER_URL}
              maxZoom={19}
            />
            
            <MapController center={center} mode={mode} userPosition={userPosition} pickingTarget={pickingTarget} />
            <MapEvents onLongPress={onLongPress} onMapClick={onMapClick} onCenterChange={onCenterChange} />

            {plannedRoute.length > 0 && (
              <Polyline 
                positions={plannedRoute.map(c => [c.lat, c.lng])} 
                pathOptions={{ color: '#666', weight: 6, dashArray: '10, 10', opacity: 0.7 }} 
              />
            )}

            {walkedPath.length > 0 && (
              <Polyline 
                positions={walkedPath.map(c => [c.lat, c.lng])} 
                pathOptions={{ color: '#FF4500', weight: 5, opacity: 0.9 }} 
              />
            )}

            <Marker 
              position={[userPosition.lat, userPosition.lng]} 
              icon={createArrowIcon()} // Fixed UP arrow
              zIndexOffset={1000}
            />

            {plannedRoute.length > 0 && (
              <Marker position={[plannedRoute[plannedRoute.length - 1].lat, plannedRoute[plannedRoute.length - 1].lng]} />
            )}

          </MapContainer>
        </div>
        
        {showReticle && (
          <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white rounded-full z-[999] -translate-x-1/2 -translate-y-1/2 shadow-[0_0_4px_rgba(255,255,255,0.8)] pointer-events-none" />
        )}
    </div>
  );
};

export default MapComponent;
