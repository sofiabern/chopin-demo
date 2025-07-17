export const SPEED_TEST_CONFIG = {
  width: '100%',
  height: '600px',
  theme: 'light',
  language: 'en',
  server: process.env.NEXT_PUBLIC_SPEEDTEST_SERVER_URL || 'http://localhost:8080' // Using self-hosted server
}; 