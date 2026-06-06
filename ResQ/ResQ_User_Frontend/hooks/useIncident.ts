import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store/appStore';
import api from '../services/api';
import { useLocation } from './useLocation';

export function useIncident() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const { 
    setActiveIncident, 
    setAssignedAmbulance, 
    setDestinationHospital,
    clearIncident 
  } = useAppStore();
  
  const { coords } = useLocation();
  const router = useRouter();

  const submitSOS = async (type: string, severity: number, patientContext?: unknown) => {
    if (!coords) {
      setSubmitError('Location not available');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        incident_type: type,
        severity: severity,
        ...(patientContext && { patient_context: patientContext })
      };

      // Call POST /dispatch/request directly, which creates the incident and dispatches
      const dispatchRes = await api.post('/dispatch/request', payload);
      const dispatchData = dispatchRes.data;
      const incidentId = dispatchData.incident_id;
      
      if (incidentId === undefined) {
        setSubmitError('Failed to parse incident ID');
        return;
      }

      // 3. Update store
      setActiveIncident({
        incidentId,
        dispatchLogId: dispatchData.dispatch_log_id,
        incidentType: type,
        severity,
        latitude: coords.latitude,
        longitude: coords.longitude,
        reportedAt: new Date().toISOString(),
        status: 'dispatched'
      });

      setAssignedAmbulance({
        id: dispatchData.ambulance.id,
        vehicleNumber: dispatchData.ambulance.vehicle_number,
        latitude: dispatchData.ambulance.latitude,
        longitude: dispatchData.ambulance.longitude,
        status: dispatchData.ambulance.status,
        etaSeconds: dispatchData.eta_seconds
      });

      setDestinationHospital({
        id: dispatchData.hospital.id,
        name: dispatchData.hospital.name,
        latitude: dispatchData.hospital.latitude,
        longitude: dispatchData.hospital.longitude,
        specialties: dispatchData.hospital.specialties,
        erCapacity: dispatchData.hospital.er_capacity,
        is24x7: dispatchData.hospital.is_24x7
      });

      // 4. Navigate
      router.push('/incident-details');
      
    } catch (e: unknown) {
      if (e.status === 503) {
        setSubmitError('NO_AMBULANCES');
      } else {
        setSubmitError(e.message || 'Network error — retrying...');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelIncident = async () => {
    // Note: Real world might require a DELETE or POST /incidents/{id}/cancel
    clearIncident();
    router.replace('/');
  };

  return {
    submitSOS,
    isSubmitting,
    submitError,
    cancelIncident
  };
}
