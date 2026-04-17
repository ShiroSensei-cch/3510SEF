import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const TrackingMap = ({ deliveryLocation, restaurantLocation, customerLocation }) => {
  // Default center: Hong Kong
  const defaultCenter = [22.3193, 114.1694];
  
  // Custom icons
  const deliveryIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1995/1995572.png',
    iconSize: [32, 32],
  });
  
  const restaurantIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1046/1046784.png',
    iconSize: [32, 32],
  });
  
  const customerIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/25/25694.png',
    iconSize: [32, 32],
  });
  
  return (
    <MapContainer
      center={deliveryLocation || restaurantLocation || defaultCenter}
      zoom={13}
      style={{ height: '400px', width: '100%', borderRadius: '10px', marginBottom: '20px' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {restaurantLocation && (
        <Marker position={restaurantLocation} icon={restaurantIcon}>
          <Popup>Restaurant</Popup>
        </Marker>
      )}
      
      {deliveryLocation && (
        <Marker position={deliveryLocation} icon={deliveryIcon}>
          <Popup>Delivery Person 🚗</Popup>
        </Marker>
      )}
      
      {customerLocation && (
        <Marker position={customerLocation} icon={customerIcon}>
          <Popup>Your Location</Popup>
        </Marker>
      )}
      
      {restaurantLocation && deliveryLocation && (
        <Polyline
          positions={[restaurantLocation, deliveryLocation]}
          color="blue"
          weight={3}
          opacity={0.7}
        />
      )}
    </MapContainer>
  );
};

export default TrackingMap;