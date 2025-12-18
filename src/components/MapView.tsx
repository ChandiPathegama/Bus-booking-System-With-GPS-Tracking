import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
const busIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgN1Y3QTIgMiAwIDAgMSA1IDVIMTlBMiAyIDAgMCAxIDIxIDdWN00zIDdWMTdBMiAyIDAgMCAwIDUgMTlIMTlBMiAyIDAgMCAwIDIxIDE3VjdNMyA3SDIxTTggMTFIMTZNOCAxNUgxNk01IDE5VjIxTTE5IDE5VjIxIiBzdHJva2U9IiNGRkNCMDUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

interface MapViewProps {
  busId: string;
  busName?: string;
  center?: [number, number];
}

const MapView: React.FC<MapViewProps> = ({ busId, busName, center = [28.6139, 77.2090] }) => {
  const [busLocation, setBusLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock GPS data - replace with real API call
    const mockLocation: [number, number] = [
      center[0] + (Math.random() - 0.5) * 0.1,
      center[1] + (Math.random() - 0.5) * 0.1
    ];
    
    setBusLocation(mockLocation);
    setLoading(false);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setBusLocation(prev => {
        if (!prev) return null;
        return [
          prev[0] + (Math.random() - 0.5) * 0.001,
          prev[1] + (Math.random() - 0.5) * 0.001
        ];
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [busId, center]);

  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={busLocation || center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {busLocation && (
          <Marker position={busLocation} icon={busIcon}>
            <Popup>
              <div className="text-center">
                <h3 className="font-semibold">{busName || 'Bus'}</h3>
                <p className="text-sm text-gray-600">Live Location</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;