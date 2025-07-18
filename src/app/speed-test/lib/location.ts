import { useState, useEffect } from 'react';

export const useLocation = () => {
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number, lng: number } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);

  useEffect(() => {
    const getLocation = async () => {
      setIsLocationLoading(true);
      const { location, coordinates } = await fetchAndFormatLocation();
      setLocation(location);
      setCoordinates(coordinates);
      setIsLocationLoading(false);
    };

    getLocation();
  }, []);

  return { location, coordinates, isLocationLoading };
};

export const formatLocation = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    const data = await response.json();

    // Format as City, Region, Country
    const components = data.address;
    return `${components.city || components.town || components.village || 'Unknown'}, ${components.state || components.county || 'Unknown'}, ${components.country}`;
  } catch (error) {
    console.error('Error formatting location:', error);
    return 'Location not available';
  }
};

export const getIpLocation = async (): Promise<{ location: string, coordinates: { lat: number, lng: number } | null }> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    const location = `${data.city}, ${data.region}, ${data.country_name}`;
    const coordinates = data.latitude && data.longitude ? { lat: data.latitude, lng: data.longitude } : null;
    return { location, coordinates };
  } catch (error) {
    console.error('Error getting IP location:', error);
    return { location: 'Location not available', coordinates: null };
  }
};

export const fetchAndFormatLocation = async (): Promise<{ location: string, coordinates: { lat: number, lng: number } | null }> => {
  let location = 'Location not available';
  let coordinates: { lat: number, lng: number } | null = null;

  if (typeof window !== 'undefined' && navigator.geolocation) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });

      if (position) {
        coordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
        location = await formatLocation(position.coords.latitude, position.coords.longitude);
      }
    } catch (err) {
      console.error('GPS error, falling back to IP location:', err);
      const ipLocationData = await getIpLocation();
      location = ipLocationData.location;
      coordinates = ipLocationData.coordinates;
    }
  } else {
    const ipLocationData = await getIpLocation();
    location = ipLocationData.location;
    coordinates = ipLocationData.coordinates;
  }

  return { location, coordinates };
}; 