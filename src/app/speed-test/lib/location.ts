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

export const fetchAndFormatLocation = async (): Promise<{ location: string, coordinates: { lat: number, lng: number } | null, isGeolocationAvailable: boolean }> => {
  let location = 'Location not available';
  let coordinates: { lat: number, lng: number } | null = null;
  let isGeolocationAvailable = false;

  if (typeof window !== 'undefined' && navigator.geolocation) {
    isGeolocationAvailable = true;
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
      // Fallback to IP location if Geolocation fails
      const ipLocationData = await getIpLocation();
      location = ipLocationData.location;
      coordinates = ipLocationData.coordinates;
    }
  } else {
    // Geolocation is not available, use IP location as the primary method
    const ipLocationData = await getIpLocation();
    location = ipLocationData.location;
    coordinates = ipLocationData.coordinates;
  }

  return { location, coordinates, isGeolocationAvailable };
}; 