import { SpeedTestResult } from './types';

interface SubmitSpeedTestParams {
  location: string;
  speedTestResults: SpeedTestResult;
  coordinates: { lat: number; lng: number } | null;
}

export const submitSpeedTestResults = async ({
  location,
  speedTestResults,
  coordinates,
}: SubmitSpeedTestParams): Promise<{ success: boolean; message: string }> => {
  if (!coordinates) {
    return { success: false, message: 'Cannot submit results without coordinates.' };
  }

  try {
    const response = await fetch('/api/speed-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location,
        download_speed: speedTestResults.download,
        upload_speed: speedTestResults.upload,
        ping: speedTestResults.ping,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit results');
    }

    return { success: true, message: 'Results submitted successfully!' };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, message: `Error: ${err.message}` };
    }
    return { success: false, message: 'An unknown error occurred during submission.' };
  }
}; 