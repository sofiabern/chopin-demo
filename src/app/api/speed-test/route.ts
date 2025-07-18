import { NextResponse } from 'next/server';
import { Oracle, getAddress } from '@chopinframework/next';
import { 
  insertSpeedTest, 
  getSpeedTests, 
  isSqliteError, 
  SpeedTestPayload,
  haversineDistance
} from '../../../lib/database';

// ============== UTILITY FUNCTIONS ==============

const validateAndGetAddress = async () => {
  try {
    const address = await getAddress();
    if (!address) {
      throw new Error('Unauthorized: no address');
    }
    return address;
  } catch (_) {
    throw new Error('Unauthorized: could not get address');
  }
};

const validatePostInput = (body: any) => {
  const { location, download_speed, upload_speed, ping, latitude, longitude } = body;
  if (!location || typeof location !== 'string' || location.trim() === '') {
    throw new Error('Invalid location provided');
  }
  if (typeof download_speed !== 'number' || download_speed < 0) {
    throw new Error('Invalid download speed');
  }
  if (typeof upload_speed !== 'number' || upload_speed < 0) {
    throw new Error('Invalid upload speed');
  }
  if (typeof ping !== 'number' || ping < 0) {
    throw new Error('Invalid ping value');
  }
  if ((latitude !== null && typeof latitude !== 'number') || (longitude !== null && typeof longitude !== 'number')) {
    throw new Error('Invalid coordinates provided');
  }
  return { location, download_speed, upload_speed, ping, latitude, longitude };
};

const parseGetRequest = (searchParams: URLSearchParams) => {
  const location = searchParams.get('location');
  const showOnlyMyResults = searchParams.get('me') === 'true';
  const radius = searchParams.get('radius');
  const latitude = searchParams.get('latitude');
  const longitude = searchParams.get('longitude');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  
  return { location, showOnlyMyResults, radius, latitude, longitude, page, pageSize };
}


// ============== API ROUTE HANDLERS ==============

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const address = await validateAndGetAddress();
    const { location, download_speed, upload_speed, ping, latitude, longitude } = validatePostInput(body);
    
    const submission_minute = new Date().toISOString().slice(0, 16);

    const notarizedResult = (await Oracle.notarize(async () => {
      const timestamp = await Oracle.now();
      return { location, download_speed, upload_speed, ping, timestamp, address, latitude, longitude, submission_minute };
    })) as SpeedTestPayload;

    await insertSpeedTest(notarizedResult);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving speed test:', error);
    
    if (isSqliteError(error) && error.code === 'SQLITE_CONSTRAINT') {
      return NextResponse.json({ error: 'This result has already been submitted.' }, { status: 409 });
    }

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('Invalid')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Failed to save speed test results' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { location, showOnlyMyResults, radius, latitude, longitude, page, pageSize } = parseGetRequest(searchParams);

    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    if (showOnlyMyResults) {
      try {
        const address = await getAddress();
        if (address) {
          whereClauses.push('address = ?');
          params.push(address);
        } else {
          return NextResponse.json({ results: [], pagination: { page, pageSize, totalResults: 0, totalPages: 0 } });
        }
      } catch (_) {
        return NextResponse.json({ error: 'Unauthorized: could not get address' }, { status: 401 });
      }
    }

    if (location) {
      whereClauses.push('location LIKE ?');
      params.push(`%${location}%`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const allResults = await getSpeedTests(whereString, params);

    let filteredResults = allResults;
    if (radius && latitude && longitude) {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const rad = parseFloat(radius);
      filteredResults = allResults.filter(result => 
        result.latitude !== null && result.longitude !== null &&
        haversineDistance(result.latitude, result.longitude, lat, lon) <= rad
      );
    }
    
    const offset = (page - 1) * pageSize;
    const totalResults = filteredResults.length;
    const totalPages = Math.ceil(totalResults / pageSize);
    const paginatedResults = filteredResults.slice(offset, offset + pageSize);

    return NextResponse.json({ results: paginatedResults, pagination: { page, pageSize, totalResults, totalPages } });
  } catch (error) {
    console.error('Error fetching speed tests:', error);
    return NextResponse.json({ error: 'Failed to fetch speed test results' }, { status: 500 });
  }
}
