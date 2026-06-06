import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';

interface WSMessage {
  type: 'dispatch' | 'status_update' | 'eta_update';
  ambulance_id: number;
  incident_id?: number;
  status?: string;
  eta_seconds?: number;
  latitude?: number;
  longitude?: number;
}

export function useWebSocket() {
  const { wsUrl, activeIncident, updateAmbulanceStatus, updateEta, updateAmbulanceLocation, mockMode } = useAppStore();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1000);

  const connect = () => {
    if (mockMode || !activeIncident) {
      // In mock mode, the mock simulation engine handles updates locally
      return;
    }

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        backoffRef.current = 1000;
        // // console.log('[WS] Connected to dispatch socket');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          
          // Filter out messages not relevant to our active incident
          if (msg.incident_id && msg.incident_id !== activeIncident.incidentId) {
            return;
          }
          
          setLastMessage(msg);

          if (msg.type === 'status_update' && msg.status) {
            updateAmbulanceStatus(msg.status);
          } else if (msg.type === 'eta_update' && msg.eta_seconds !== undefined) {
            updateEta(msg.eta_seconds);
          }
          if (msg.latitude !== undefined && msg.longitude !== undefined) {
            updateAmbulanceLocation(msg.latitude, msg.longitude);
          }
        } catch (e) {
          console.warn('[WS] Error parsing message', e);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        scheduleReconnect();
      };

      wsRef.current.onerror = (e) => {
        console.warn('[WS] Error', e);
        wsRef.current?.close();
      };
    } catch (e) {
      console.warn('[WS] Connection failed', e);
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    
    // // console.log(`[WS] Reconnecting in ${backoffRef.current}ms`);
    reconnectTimeoutRef.current = setTimeout(() => {
      backoffRef.current = Math.min(backoffRef.current * 2, 16000);
      connect();
    }, backoffRef.current);
  };

  const send = (msg: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  useEffect(() => {
    if (activeIncident) {
      connect();
    } else {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [activeIncident?.incidentId, wsUrl, mockMode]);

  return {
    isConnected,
    lastMessage,
    send
  };
}
