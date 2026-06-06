import axios, { AxiosError } from 'axios';
import { useAppStore } from '../store/appStore';
import { mockDispatchResponse, mockIncidentReport, mockFleetStatus, mockDispatchHistory } from './mock';

const api = axios.create({
  timeout: 8000,
});

// Request interceptor to set baseURL dynamically from store
api.interceptors.request.use((config) => {
  const { apiBaseUrl, mockMode } = useAppStore.getState();
  config.baseURL = apiBaseUrl;
  
  if (mockMode) {
    config.adapter = async (mockConfig) => {
      // // console.log(`[MOCK MODE] Intercepted ${mockConfig.method?.toUpperCase()} ${mockConfig.url}`);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      let mockData = null;
      if (mockConfig.url?.includes('/incidents/report')) {
        mockData = mockIncidentReport;
      } else if (mockConfig.url?.includes('/dispatch/request')) {
        mockData = mockDispatchResponse;
      } else if (mockConfig.url?.includes('/fleet/status')) {
        mockData = mockFleetStatus;
      } else if (mockConfig.url?.includes('/dispatch/history')) {
        mockData = mockDispatchHistory;
      } else if (mockConfig.url?.includes('/hospital/recommend')) {
        mockData = mockDispatchResponse.hospital;
      }

      if (mockData) {
        return {
          data: mockData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: mockConfig,
          request: {}
        } as unknown;
      }
      
      // Fallback if mock data not found for a route but mock mode is on
      return {
          data: {},
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config: mockConfig,
          request: {}
      } as unknown;
    };
  }
  
  return config;
});

// Retry logic and Error normalization interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as unknown;
    
    // Normalize error
    const normalizedError = {
      code: error.code || 'UNKNOWN',
      message: error.message || 'An unknown error occurred',
      isNetworkError: !error.response,
      status: error.response?.status
    };
    
    // If we don't have config or we've already retried 3 times, reject
    if (!config || !normalizedError.isNetworkError) {
      return Promise.reject(normalizedError);
    }
    
    config.__retryCount = config.__retryCount || 0;
    if (config.__retryCount >= 3) {
      return Promise.reject(normalizedError);
    }
    
    config.__retryCount += 1;
    // // console.log(`[API] Retrying request... (${config.__retryCount}/3)`);
    
    // Create new promise to handle exponential backoff
    const backoff = new Promise((resolve) => {
      setTimeout(() => {
        resolve(null);
      }, config.__retryCount * 2000);
    });
    
    await backoff;
    return api(config);
  }
);

export default api;
