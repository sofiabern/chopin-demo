import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db: Database | null = null;

// The SpeedTestResult from the client/oracle
export interface SpeedTestPayload {
  location: string;
  download_speed: number;
  upload_speed: number;
  ping: number;
  timestamp: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  submission_minute: string;
}

// The result structure when retrieved from the DB
export interface SpeedTestResult extends SpeedTestPayload {
  id: number;
}

export const isSqliteError = (error: unknown): error is { code: string } => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

// Initialize SQLite database using a singleton pattern
export const initDB = async () => {
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
      submission_minute TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      UNIQUE(address, submission_minute, download_speed, upload_speed, ping)
    )
  `);

  return db;
};

export const insertSpeedTest = async (result: SpeedTestPayload) => {
  const db = await initDB();
  const { 
    location, 
    download_speed, 
    upload_speed, 
    ping, 
    timestamp, 
    submission_minute, 
    address, 
    latitude, 
    longitude 
  } = result;

  await db.run(
    'INSERT INTO speed_tests (location, download_speed, upload_speed, ping, timestamp, submission_minute, address, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [location.trim(), download_speed, upload_speed, ping, new Date(timestamp * 1000), submission_minute, address, latitude, longitude]
  );
};


export const getSpeedTests = async (whereClause: string, params: (string | number)[]): Promise<SpeedTestResult[]> => {
    const db = await initDB();
    const results = await db.all<SpeedTestResult[]>(
        `SELECT * FROM speed_tests ${whereClause} ORDER BY timestamp DESC`,
        params
    );
    return results;
}

export const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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