import { NextResponse } from 'next/server';
import { Oracle, getAddress } from '@chopinframework/next';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db: Database | null = null;

// Initialize SQLite database using a singleton pattern
const initDB = async () => {
  if (db) return db;

  db = await open({
    filename: '/tmp/speed-tests.db',
    driver: sqlite3.Database
  });

  // Create table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS speed_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location TEXT NOT NULL,
      download_speed REAL NOT NULL,
      upload_speed REAL NOT NULL,
      ping REAL NOT NULL,
      timestamp DATETIME NOT NULL,
      address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL
    )
  `);

  return db;
};

interface SpeedTestResult {
  location: string;
  download_speed: number;
  upload_speed: number;
  ping: number;
  timestamp: number;
  address: string;
  latitude: number;
  longitude: number;
}

// POST endpoint for registering new speed test results
export async function POST(request: Request) {
  try {
    const db = await initDB();
    const { location, download_speed, upload_speed, ping, latitude, longitude } = await request.json();
    let address;
    try {
      address = await getAddress();
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized: could not get address' }, { status: 401 });
    }
    if (!address) {
      return NextResponse.json({ error: 'Unauthorized: no address' }, { status: 401 });
    }

    // Input validation
    if (!location || typeof location !== 'string' || location.trim() === '') {
      return NextResponse.json({ error: 'Invalid location provided' }, { status: 400 });
    }
    if (typeof download_speed !== 'number' || download_speed < 0) {
      return NextResponse.json({ error: 'Invalid download speed' }, { status: 400 });
    }
    if (typeof upload_speed !== 'number' || upload_speed < 0) {
      return NextResponse.json({ error: 'Invalid upload speed' }, { status: 400 });
    }
    if (typeof ping !== 'number' || ping < 0) {
      return NextResponse.json({ error: 'Invalid ping value' }, { status: 400 });
    }
    if ((latitude !== null && typeof latitude !== 'number') || (longitude !== null && typeof longitude !== 'number')) {
      return NextResponse.json({ error: 'Invalid coordinates provided' }, { status: 400 });
    }

    const notarizedResult = (await Oracle.notarize(async () => {
      // This block runs inside the Chopin Oracle
      // It receives the client-side data and prepares it for notarization
      const timestamp = await Oracle.now();
      return { location, download_speed, upload_speed, ping, timestamp, address, latitude, longitude };
    })) as SpeedTestResult;

    // The notarized data is the direct result of the notarize function
    const { 
      location: notarizedLocation, 
      download_speed: notarizedDownload, 
      upload_speed: notarizedUpload, 
      ping: notarizedPing,
      timestamp: notarizedTimestamp,
      address: notarizedAddress,
      latitude: notarizedLatitude,
      longitude: notarizedLongitude
    } = notarizedResult;

    await db.run(
      'INSERT INTO speed_tests (location, download_speed, upload_speed, ping, timestamp, address, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [notarizedLocation.trim(), notarizedDownload, notarizedUpload, notarizedPing, new Date(notarizedTimestamp * 1000), notarizedAddress, notarizedLatitude, notarizedLongitude]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving speed test:', error);
    return NextResponse.json(
      { error: 'Failed to save speed test results' },
      { status: 500 }
    );
  }
}

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// GET endpoint for retrieving speed test results
export async function GET(request: Request) {
  try {
    const db = await initDB();
    const { searchParams } = new URL(request.url);

    // Get filter parameters
    const location = searchParams.get('location');
    const showOnlyMyResults = searchParams.get('me') === 'true';
    const radius = searchParams.get('radius');
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');

    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const offset = (page - 1) * pageSize;

    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    // Handle 'me' filter
    if (showOnlyMyResults) {
      let address;
      try {
        address = await getAddress();
      } catch (e) {
        return NextResponse.json({ error: 'Unauthorized: could not get address' }, { status: 401 });
      }

      if (address) {
        whereClauses.push('address = ?');
        params.push(address);
      } else {
        // If 'me' is requested but user is not logged in, return no results
        return NextResponse.json({ results: [], pagination: { page, pageSize, totalResults: 0, totalPages: 0 } });
      }
    }

    // Handle location filter
    if (location) {
      whereClauses.push('location LIKE ?');
      params.push(`%${location}%`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get all results that match the text-based filters
    const allResults = await db.all(
      `SELECT * FROM speed_tests ${whereString} ORDER BY timestamp DESC`,
      params
    );

    let filteredResults = allResults;

    // Apply radius filter in-memory if requested
    if (radius && latitude && longitude) {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const rad = parseFloat(radius);
      filteredResults = allResults.filter(result => 
        haversineDistance(result.latitude, result.longitude, lat, lon) <= rad
      );
    }

    // Apply pagination
    const totalResults = filteredResults.length;
    const totalPages = Math.ceil(totalResults / pageSize);
    const paginatedResults = filteredResults.slice(offset, offset + pageSize);

    return NextResponse.json({ results: paginatedResults, pagination: { page, pageSize, totalResults, totalPages } });
  } catch (error) {
    console.error('Error fetching speed tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch speed test results' },
      { status: 500 }
    );
  }
}
