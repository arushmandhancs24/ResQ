import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, severity as severityConfig } from '../constants/theme';
import { useIncident } from '../hooks/useIncident';

const INCIDENT_TYPES = [
  { id: 'cardiac', icon: 'heart-pulse', label: 'Cardiac' },
  { id: 'trauma', icon: 'car-brake-alert', label: 'Trauma' },
  { id: 'burns', icon: 'fire', label: 'Burns' },
  { id: 'neuro', icon: 'brain', label: 'Neurological' },
  { id: 'maternity', icon: 'baby-carriage', label: 'Obstetric' },
  { id: 'general', icon: 'medical-bag', label: 'General' },
];

export default function DispatchOtherScreen() {
  const router = useRouter();
  const { submitSOS, isSubmitting } = useIncident();

  const [patientName, setPatientName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [isBreathing, setIsBreathing] = useState(true);
  
  const [selectedType, setSelectedType] = useState<string>('general');
  const [severity, setSeverity] = useState<number>(3);

  const handleDispatch = async () => {
    const patientContext = {
      name: patientName || 'Unknown',
      relationship: relationship || 'Bystander/Stranger',
      age: age || 'Unknown',
      gender: gender || 'Unknown',
      isBreathing,
    };
    
    await submitSOS(selectedType, severity, patientContext);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Call for Someone Else</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* PATIENT DETAILS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Patient Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Patient Name</Text>
            <TextInput
              style={styles.input}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="e.g. John Doe (Leave blank if unknown)"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Relationship to Patient</Text>
            <TextInput
              style={styles.input}
              value={relationship}
              onChangeText={setRelationship}
              placeholder="e.g. Family, Friend, Bystander"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="Approx. age"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Gender</Text>
              <TextInput
                style={styles.input}
                value={gender}
                onChangeText={setGender}
                placeholder="M / F / Other"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Is the patient conscious & breathing?</Text>
            <Switch
              value={isBreathing}
              onValueChange={setIsBreathing}
              trackColor={{ false: colors.sos, true: colors.secondary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* INCIDENT TYPE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Type of Emergency</Text>
          <View style={styles.grid}>
            {INCIDENT_TYPES.map((item) => {
              const isSelected = selectedType === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.typeCard,
                    isSelected && styles.typeCardSelected
                  ]}
                  onPress={() => setSelectedType(item.id)}
                >
                  <MaterialCommunityIcons 
                    name={item.icon as unknown} 
                    size={28} 
                    color={isSelected ? colors.sos : colors.textPrimary} 
                  />
                  <Text style={[styles.typeLabel, isSelected && { color: colors.sos }]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* SEVERITY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Severity (1-5)</Text>
          <View style={styles.severityContainer}>
            {[1, 2, 3, 4, 5].map((level) => {
              const config = severityConfig[level as keyof typeof severityConfig];
              const isSelected = severity === level;
              return (
                <Pressable
                  key={level}
                  style={[
                    styles.levelButton,
                    isSelected && { backgroundColor: config.color, borderColor: config.color }
                  ]}
                  onPress={() => setSeverity(level)}
                >
                  <Text style={[
                    styles.levelText,
                    isSelected && styles.levelTextSelected
                  ]}>{level}</Text>
                  <Text style={[
                    styles.levelLabel,
                    isSelected && styles.levelTextSelected
                  ]}>{config.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable 
          style={[styles.dispatchButton, isSubmitting && { opacity: 0.7 }]} 
          onPress={handleDispatch}
          disabled={isSubmitting}
        >
          <MaterialCommunityIcons name="ambulance" size={24} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.dispatchButtonText}>
            {isSubmitting ? 'DISPATCHING...' : 'DISPATCH AMBULANCE'}
          </Text>
        </Pressable>

      </ScrollView>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontFamily: 'SpaceGrotesk',
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: colors.sos,
    fontFamily: 'SpaceGrotesk',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: 'Inter',
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    color: colors.textPrimary,
    fontFamily: 'JetBrainsMono',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  toggleLabel: {
    color: colors.textPrimary,
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  typeCard: {
    width: '48%',
    backgroundColor: colors.surfaceAlt,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeCardSelected: {
    borderColor: colors.sos,
    backgroundColor: 'rgba(197, 48, 48, 0.1)',
  },
  typeLabel: {
    color: colors.textPrimary,
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelButton: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  levelText: {
    color: colors.textPrimary,
    fontFamily: 'SpaceGrotesk',
    fontSize: 20,
    fontWeight: '800',
  },
  levelLabel: {
    color: colors.textSecondary,
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    marginTop: 4,
  },
  levelTextSelected: {
    color: '#FFF',
  },
  dispatchButton: {
    backgroundColor: colors.sos,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  dispatchButtonText: {
    color: '#fff',
    fontFamily: 'SpaceGrotesk',
    fontSize: 18,
    fontWeight: '700',
  }
});
