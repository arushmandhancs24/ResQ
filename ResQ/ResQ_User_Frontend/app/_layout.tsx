import { Stack } from 'expo-router';
import { useAppStore } from '../store/appStore';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_700Bold, SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk';
import { JetBrainsMono_500Medium, JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono';
import '../global.css';
import '../global.css';
import { useSiren } from '../hooks/useSiren';

const SirenController = () => {
  useSiren();
  return null;
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    SpaceGrotesk: SpaceGrotesk_700Bold,
    JetBrainsMono: JetBrainsMono_500Medium,
  });

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const store = useAppStore.getState();
        if (store.apiBaseUrl.includes('localhost')) {
          store.setApiBaseUrl('http://172.20.10.2:8000');
          store.setWsUrl('ws://172.20.10.2:8000/ws/dispatch');
        }

        const onboarded = await AsyncStorage.getItem('onboarded');
        if (onboarded === 'true') {
          setInitialRoute('(tabs)');
        } else {
          setInitialRoute('onboarding');
        }
      } catch (e) {
        setInitialRoute('onboarding');
      } finally {
        setIsReady(true);
      }
    };
    checkOnboarding();
  }, []);

  if (!isReady || !initialRoute || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0C11', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#C53030', fontSize: 24, fontWeight: 'bold' }}>ResQ</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0A0C11' },
            animation: 'slide_from_bottom',
          }}
        >
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="incident-details" />
          <Stack.Screen 
            name="settings" 
            options={{ 
              presentation: 'modal', 
              animation: 'slide_from_bottom' 
            }} 
          />
        </Stack>
        <SirenController />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
