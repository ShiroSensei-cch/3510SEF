const axios = require('axios');

/**
 * Geocode an address to latitude and longitude coordinates
 * Uses OpenStreetMap Nominatim API (free, no API key)
 * @param {string} address - Full address string (e.g., "18 Temple Street, Yau Ma Tei, Hong Kong")
 * @returns {Promise<{lat: number, lng: number} | null>} - Coordinates or null if not found
 */
async function geocodeAddress(address) {
  if (!address || typeof address !== 'string') {
    console.error('Invalid address provided to geocodeAddress');
    return null;
  }

  try {
    // Nominatim requires a User-Agent header (identify your app)
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 0
      },
      headers: {
        'User-Agent': 'FoodOrderingApp/1.0 (your-email@example.com)' // Replace with your email
      },
      timeout: 5000 // 5 second timeout
    });

    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      return {
        lat: parseFloat(lat),
        lng: parseFloat(lon)
      };
    }
    
    console.warn(`No geocoding result for address: ${address}`);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
}

/**
 * Reverse geocode: convert coordinates to address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string | null>} - Address string or null
 */
async function reverseGeocode(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    console.error('Invalid coordinates for reverseGeocode');
    return null;
  }

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: lat,
        lon: lng,
        format: 'json'
      },
      headers: {
        'User-Agent': 'FoodOrderingApp/1.0 (your-email@example.com)'
      },
      timeout: 5000
    });

    if (response.data && response.data.display_name) {
      return response.data.display_name;
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    return null;
  }
}

/**
 * Batch geocode multiple addresses (respects rate limits)
 * @param {string[]} addresses - Array of address strings
 * @returns {Promise<Array<{address: string, coordinates: {lat: number, lng: number} | null}>>}
 */
async function batchGeocode(addresses) {
  const results = [];
  for (const address of addresses) {
    const coords = await geocodeAddress(address);
    results.push({ address, coordinates: coords });
    // Nominatim allows 1 request per second for free tier
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return results;
}

module.exports = {
  geocodeAddress,
  reverseGeocode,
  batchGeocode
};