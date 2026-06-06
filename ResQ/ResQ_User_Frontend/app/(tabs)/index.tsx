import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { useLocation } from '../../hooks/useLocation';
import { useIncident } from '../../hooks/useIncident';
import { useAppStore } from '../../store/appStore';
import { SOSButton } from '../../components/SOSButton';
import { IncidentTypeSelector } from '../../components/IncidentTypeSelector';
import { SeveritySlider } from '../../components/SeveritySlider';
import { Toast } from '../../components/Toast';

export default function HomeScreen() {
  const router = useRouter();
  const { address } = useLocation();
  const { submitSOS, isSubmitting, submitError } = useIncident();
  const { activeIncident } = useAppStore();
  
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<string>('general');
  const [severity, setSeverity] = useState<number>(3);

  const handleSOSPress = () => {
    if (activeIncident) {
      router.push('/incident-details');
      return;
    }
    
    // Natively prompt the phone dialer instead of using an internal app Alert
    Linking.openURL('tel:108');
  };

  const handleSOSLongPress = () => {
    if (activeIncident) {
      router.push('/incident-details');
      return;
    }
    submitSOS('general', 5);
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setStep(2);
  };

  const handleSeverityConfirm = async () => {
    bottomSheetModalRef.current?.dismiss();
    await submitSOS(selectedType, severity);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Toast message={submitError || ''} visible={!!submitError} onHide={() => {}} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 100, height: 32, justifyContent: 'center', zIndex: 10 }}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={{ position: 'absolute', height: 180, width: 200, resizeMode: 'contain', left: -45, top: -55 }} 
          />
        </View>
        <View style={styles.locationPill}>
          <MaterialCommunityIcons name="map-marker" size={16} color={colors.textPrimary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {address || 'Locating...'}
          </Text>
          {!address && <ActivityIndicator size="small" color={colors.sos} style={{ marginLeft: 4 }} />}
        </View>
        <Pressable onPress={() => router.push('/settings')} style={styles.settingsBtn}>
          <MaterialCommunityIcons name="cog" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Active Incident Banner */}
      {activeIncident && (
        <Pressable style={styles.activeBanner} onPress={() => router.push('/incident-details')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeBannerTitle}>🚨 Emergency in Progress</Text>
            <Text style={styles.activeBannerSub}>Tap to view details & track ambulance</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
        </Pressable>
      )}

      {/* Main SOS Area */}
      <View style={styles.mainContent}>
        
        <Pressable 
          style={[styles.otherBtn, { backgroundColor: colors.sos, marginBottom: 20 }]} 
          onPress={() => router.push('/dispatch-other')}
        >
          <MaterialCommunityIcons name="account-alert" size={24} color="#FFF" />
          <Text style={[styles.otherBtnText, { color: '#FFF', fontSize: 16 }]}>CALL FOR SOMEONE ELSE</Text>
        </Pressable>

        <SOSButton 
          onPress={handleSOSPress} 
          onLongPress={handleSOSLongPress} 
          isSubmitting={isSubmitting}
        />
        <Text style={styles.instructionText}>
          Tap to call 108{'\n'}Long press for App SOS
        </Text>
      </View>

      {/* Quick Info Cards */}
      <View style={styles.cardsRow}>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🏥</Text>
          <Text style={styles.infoTitle}>Nearest</Text>
          <Text style={styles.infoSub}>Hospital</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🚑</Text>
          <Text style={styles.infoTitle}>~12</Text>
          <Text style={styles.infoSub}>Nearby</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>⏱</Text>
          <Text style={styles.infoTitle}>~8 min</Text>
          <Text style={styles.infoSub}>Avg Response</Text>
        </View>
      </View>

      {/* Bottom Sheet for SOS Flow */}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={['50%', '70%']}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        {step === 1 ? (
          <IncidentTypeSelector onSelect={handleTypeSelect} />
        ) : (
          <SeveritySlider 
            severity={severity} 
            onChange={setSeverity} 
            onConfirm={handleSeverityConfirm} 
          />
        )}
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logo: {
    color: colors.sos,
    fontSize: 24,
    fontWeight: '800',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '50%',
  },
  locationText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  settingsBtn: {
    padding: 4,
  },
  activeBanner: {
    backgroundColor: colors.sos,
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeBannerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  activeBannerSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 22,
    fontSize: 14,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: colors.surfaceAlt,
    padding: 12,
    width: '31%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  infoTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  infoSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  otherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.secondary,
    backgroundColor: 'transparent',
    gap: 8,
  },
  otherBtnText: {
    color: colors.secondary,
    fontFamily: 'JetBrainsMono',
    fontSize: 14,
    fontWeight: '700',
  }
});
