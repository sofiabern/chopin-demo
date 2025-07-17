import { NextResponse } from 'next/server';
import { Oracle } from '@chopinframework/next';
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
      timestamp DATETIME NOT NULL
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
}

// POST endpoint for registering new speed test results
export async function POST(request: Request) {
  try {
    const db = await initDB();
    const { location, download_speed, upload_speed, ping } = await request.json();

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

    const notarizedResult = (await Oracle.notarize(async () => {
      // This block runs inside the Chopin Oracle
      // It receives the client-side data and prepares it for notarization
      const timestamp = await Oracle.now();
      return { location, download_speed, upload_speed, ping, timestamp };
    })) as SpeedTestResult;

    // The notarized data is the direct result of the notarize function
    const { 
      location: notarizedLocation, 
      download_speed: notarizedDownload, 
      upload_speed: notarizedUpload, 
      ping: notarizedPing,
      timestamp: notarizedTimestamp
    } = notarizedResult;

    await db.run(
      'INSERT INTO speed_tests (location, download_speed, upload_speed, ping, timestamp) VALUES (?, ?, ?, ?, ?)',
      [notarizedLocation.trim(), notarizedDownload, notarizedUpload, notarizedPing, new Date(notarizedTimestamp * 1000)]
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

// GET endpoint for retrieving speed test results by location
export async function GET(request: Request) {
  try {
    const db = await initDB();
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');

    if (!location) {
      return NextResponse.json(
        { error: 'Location parameter is required' },
        { status: 400 }
      );
    }

    const results = await db.all(
      'SELECT * FROM speed_tests WHERE location = ? ORDER BY timestamp DESC LIMIT 10',
      [location]
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error fetching speed tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch speed test results' },
      { status: 500 }
    );
  }
}
