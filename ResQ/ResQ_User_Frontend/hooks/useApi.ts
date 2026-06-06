import api from '../services/api';

export function useApi() {
  const getFleetStatus = async () => {
    const res = await api.get('/fleet/status');
    return res.data;
  };

  const getDispatchHistory = async () => {
    const res = await api.get('/dispatch/history');
    return res.data;
  };

  const getHospitalRecommendation = async (lat: number, lon: number, type: string) => {
    const res = await api.get(`/hospital/recommend?lat=${lat}&lon=${lon}&incident_type=${type}`);
    return res.data;
  };

  return {
    getFleetStatus,
    getDispatchHistory,
    getHospitalRecommendation
  };
}
