import React, { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';

// Map container style
const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '400px'
};

// Default center (Manila, Philippines)
const defaultCenter = {
  lat: 14.5995,
  lng: 120.9842
};

// Map options
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: true,
  mapTypeControl: true,
};

const PropertyMap = forwardRef(({ property, properties = [], height = "400px" }, ref) => {
  const [activeMarker, setActiveMarker] = useState(null);
  
  // Load the Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "AIzaSyB2GZaombfNIfsZgBfkhQ98xQ5rh1Fl_g0", // Your API key
    libraries: ["places"]
  });
  
  // Define map ref to avoid unnecessary re-renders
  const mapRef = useRef();
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);
  
  // Expose functions to parent component using useImperativeHandle
  useImperativeHandle(ref, () => ({
    // Function to focus map on a specific location
    focusLocation: (lat, lng, zoom = 15) => {
      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(zoom);
      }
    },
    // Function to focus on a property by id
    focusProperty: (propertyId) => {
      const property = properties.find(p => p.id === propertyId);
      if (property && property.coordinates && mapRef.current) {
        mapRef.current.panTo({ 
          lat: property.coordinates.lat, 
          lng: property.coordinates.lng 
        });
        mapRef.current.setZoom(15);
        setActiveMarker(property);
      }
    },
    // Function to focus on a location by name (for search)
    focusByLocationName: (locationName) => {
      if (!locationName || !mapRef.current) return;
      
      const matchingProperties = properties.filter(p => 
        p.location && p.location.toLowerCase().includes(locationName.toLowerCase())
      );
      
      if (matchingProperties.length > 0) {
        const firstMatch = matchingProperties[0];
        if (firstMatch.coordinates) {
          mapRef.current.panTo({ 
            lat: firstMatch.coordinates.lat, 
            lng: firstMatch.coordinates.lng 
          });
          mapRef.current.setZoom(13); // Slightly zoomed out to show area
        }
      }
    }
  }));
  
  // Center map - use property location if available, otherwise use all properties
  const center = property ? 
    { lat: property.coordinates?.lat || defaultCenter.lat, lng: property.coordinates?.lng || defaultCenter.lng } :
    defaultCenter;
  
  // Handle marker click
  const handleMarkerClick = (marker) => {
    setActiveMarker(marker);
  };
  
  // Render loading state
  if (loadError) return <div className="p-4 text-center">Error loading maps</div>;
  if (!isLoaded) return <div className="p-4 text-center">Loading maps...</div>;
  
  return (
    <div style={{ height, width: '100%' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={property ? 15 : 11}
        options={mapOptions}
        onLoad={onMapLoad}
      >
        {/* Render a single property marker */}
        {property && property.coordinates && (
          <Marker
            position={{ lat: property.coordinates.lat, lng: property.coordinates.lng }}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
              scaledSize: new window.google.maps.Size(40, 40),
            }}
            onClick={() => handleMarkerClick(property)}
          />
        )}
        
        {/* Render markers for multiple properties */}
        {!property && properties.map((prop) => (
          prop.coordinates && (
            <Marker
              key={prop.id}
              position={{ lat: prop.coordinates.lat, lng: prop.coordinates.lng }}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: new window.google.maps.Size(30, 30),
              }}
              onClick={() => handleMarkerClick(prop)}
            />
          )
        ))}
        
        {/* Info window for clicked marker */}
        {activeMarker && (
          <InfoWindow
            position={{ lat: activeMarker.coordinates.lat, lng: activeMarker.coordinates.lng }}
            onCloseClick={() => setActiveMarker(null)}
          >
            <div className="p-2 max-w-xs">
              <h3 className="font-bold text-sm">{activeMarker.title}</h3>
              <p className="text-xs text-gray-600">{activeMarker.location}</p>
              <p className="text-xs font-semibold mt-1">₱{activeMarker.price.toLocaleString()}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
});

export default PropertyMap;