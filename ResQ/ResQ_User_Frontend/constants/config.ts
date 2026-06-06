export const config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
  wsUrl: process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8000/ws/dispatch',
  nominatimUrl: process.env.EXPO_PUBLIC_NOMINATIM_URL || 'https://nominatim.openstreetmap.org',
  mockModeDefault: process.env.EXPO_PUBLIC_MOCK_MODE === 'true',
}
