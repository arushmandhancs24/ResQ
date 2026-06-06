import { useEffect, useState, useRef } from 'react';
import { Audio } from 'expo-av';
import { useAppStore } from '../store/appStore';

export function useSiren() {
  const { activeIncident } = useAppStore();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const playingRef = useRef(false);

  useEffect(() => {
    // Force audio to play loudly even in silent mode
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  useEffect(() => {
    let currentSound: Audio.Sound | null = null;
    
    // We consider it active if the SOS is pending or dispatched/en route
    const isActive = activeIncident && ['pending', 'dispatched', 'en_route'].includes(activeIncident.status);

    const playSiren = async () => {
      if (playingRef.current) return;
      
      try {
        // High quality siren URL
        const { sound: newSound } = await Audio.Sound.createAsync(
          require('../assets/siren.wav'),
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        currentSound = newSound;
        setSound(newSound);
        playingRef.current = true;
      } catch (error) {
        console.warn('Failed to load siren sound', error);
      }
    };

    const stopSiren = async () => {
      if (currentSound && playingRef.current) {
        try {
          await currentSound.stopAsync();
          await currentSound.unloadAsync();
        } catch (e) { console.error(e); }
        playingRef.current = false;
        currentSound = null;
      }
    };

    if (isActive) {
      playSiren();
    } else {
      stopSiren();
    }

    return () => {
      stopSiren();
    };
  }, [activeIncident?.status]);

  return null;
}
