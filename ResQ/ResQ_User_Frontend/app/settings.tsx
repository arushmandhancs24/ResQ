import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { useAppStore } from '../store/appStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';

export default function SettingsScreen() {
  const { mockMode, setMockMode, apiBaseUrl, setApiBaseUrl, medicalInfo, setMedicalInfo, emergencyContacts, setEmergencyContacts, userProfile, setUserProfile } = useAppStore();

  const [medInfo, setMedInfo] = useState(medicalInfo);
  const [profile, setProfile] = useState(userProfile);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const handleSave = () => {
    setMedicalInfo(medInfo);
    setUserProfile(profile);
    Alert.alert('Profile Saved', 'Your personal and medical information has been updated securely.', [{ text: 'OK' }]);
  };

  const addManualContact = () => {
    if (newContactName.trim() && newContactPhone.trim()) {
      const newContact = {
        id: Date.now().toString(),
        name: newContactName,
        phone: newContactPhone
      };
      setEmergencyContacts([...emergencyContacts, newContact]);
      setNewContactName('');
      setNewContactPhone('');
    } else {
      Alert.alert('Missing Info', 'Please enter both name and phone number.');
    }
  };

  const importContact = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });

      if (data.length > 0) {
        try {
            const contact = await Contacts.presentContactPickerAsync();
            if (contact && contact.phoneNumbers && contact.phoneNumbers.length > 0) {
              const newContact = {
                id: contact.id || Date.now().toString(),
                name: contact.name || 'Unknown',
                phone: contact.phoneNumbers[0].number || ''
              };
              
              if (!emergencyContacts.find(c => c.id === newContact.id)) {
                setEmergencyContacts([...emergencyContacts, newContact]);
              }
            } else {
                Alert.alert('Error', 'Could not retrieve phone number from contact.');
            }
        } catch (e) {
            // // console.log("Contact picker cancelled or failed", e);
            Alert.alert('Not Supported', 'Native contact picker is not supported on this device. Please add contacts manually.');
        }
      }
    } else {
        Alert.alert('Permission Required', 'Please grant contacts permission to use this feature.');
    }
  };

  const removeContact = (id: string) => {
    setEmergencyContacts(emergencyContacts.filter(c => c.id !== id));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* PERSONAL PROFILE SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Profile</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={profile.fullName}
              onChangeText={(t) => setProfile({...profile, fullName: t})}
              placeholder="e.g. Jane Doe"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={profile.phone}
              onChangeText={(t) => setProfile({...profile, phone: t})}
              placeholder="e.g. +1 555-0199"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={profile.email}
              onChangeText={(t) => setProfile({...profile, email: t})}
              placeholder="jane@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Home Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profile.address}
              onChangeText={(t) => setProfile({...profile, address: t})}
              placeholder="Full street address..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>
        </View>

        {/* MEDICAL INFO SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Info</Text>
          
          {/* Multi-column layout for Age, Height, Weight */}
          <View style={styles.multiColumn}>
            <View style={styles.columnInput}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={medInfo.age}
                onChangeText={(t) => setMedInfo({...medInfo, age: t})}
                placeholder="Years"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.columnInput}>
              <Text style={styles.label}>Height</Text>
              <TextInput
                style={styles.input}
                value={medInfo.height}
                onChangeText={(t) => setMedInfo({...medInfo, height: t})}
                placeholder="cm/ft"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.columnInput}>
              <Text style={styles.label}>Weight</Text>
              <TextInput
                style={styles.input}
                value={medInfo.weight}
                onChangeText={(t) => setMedInfo({...medInfo, weight: t})}
                placeholder="kg/lbs"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Blood Type</Text>
            <TextInput
              style={styles.input}
              value={medInfo.bloodType}
              onChangeText={(t) => setMedInfo({...medInfo, bloodType: t})}
              placeholder="e.g. O+, AB-"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Allergies</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={medInfo.allergies}
              onChangeText={(t) => setMedInfo({...medInfo, allergies: t})}
              placeholder="Medications, food, environmental..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Chronic Conditions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={medInfo.conditions}
              onChangeText={(t) => setMedInfo({...medInfo, conditions: t})}
              placeholder="Asthma, Diabetes, Heart conditions..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>

          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>SAVE PROFILE</Text>
          </Pressable>
        </View>

        {/* EMERGENCY CONTACTS SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            <Pressable style={styles.importButton} onPress={importContact}>
              <MaterialCommunityIcons name="contacts" size={16} color={colors.secondary} />
              <Text style={styles.importButtonText}>IMPORT</Text>
            </Pressable>
          </View>

          <View style={styles.manualContactForm}>
            <TextInput
              style={[styles.input, styles.contactInput]}
              placeholder="Contact Name"
              placeholderTextColor={colors.textMuted}
              value={newContactName}
              onChangeText={setNewContactName}
            />
            <TextInput
              style={[styles.input, styles.contactInput]}
              placeholder="Phone Number"
              placeholderTextColor={colors.textMuted}
              value={newContactPhone}
              onChangeText={setNewContactPhone}
              keyboardType="phone-pad"
            />
            <Pressable style={styles.addContactBtn} onPress={addManualContact}>
              <Text style={styles.addContactBtnText}>ADD CONTACT</Text>
            </Pressable>
          </View>
          
          {emergencyContacts.length === 0 ? (
            <Text style={styles.emptyText}>No emergency contacts added yet.</Text>
          ) : (
            emergencyContacts.map(contact => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <Pressable onPress={() => removeContact(contact.id)} style={styles.removeBtn}>
                  <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* DEVELOPER SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Mock Mode</Text>
              <Text style={styles.rowDesc}>Use demo offline data</Text>
            </View>
            <Switch
              value={mockMode}
              onValueChange={setMockMode}
              trackColor={{ false: colors.border, true: colors.sos }}
            />
          </View>

          {!mockMode && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Backend API URL</Text>
              <TextInput
                style={styles.input}
                value={apiBaseUrl}
                onChangeText={setApiBaseUrl}
                placeholder="http://localhost:8000"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}
        </View>

        <View style={styles.about}>
          <MaterialCommunityIcons name="shield-check" size={32} color={colors.textMuted} />
          <Text style={styles.version}>ResQ App v1.0.0</Text>
          <Text style={styles.credits}>ResQ · BMS College of Engineering 2026</Text>
        </View>

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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: 'SpaceGrotesk',
    fontSize: 24,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.sos,
    fontFamily: 'SpaceGrotesk',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 0,
  },
  multiColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  columnInput: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: 'Inter',
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 0,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    fontFamily: 'Inter',
  },
  saveButton: {
    backgroundColor: colors.sos,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontFamily: 'JetBrainsMono',
    fontSize: 14,
    fontWeight: '700',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  importButtonText: {
    color: colors.secondary,
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    fontWeight: '700',
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: colors.textPrimary,
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
  },
  contactPhone: {
    color: colors.textSecondary,
    fontFamily: 'JetBrainsMono',
    fontSize: 13,
    marginTop: 4,
  },
  removeBtn: {
    padding: 8,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: 'Inter',
    fontStyle: 'italic',
    fontSize: 14,
  },
  manualContactForm: {
    marginBottom: 16,
    gap: 8,
  },
  contactInput: {
    padding: 12,
  },
  addContactBtn: {
    backgroundColor: colors.sos,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addContactBtnText: {
    color: '#fff',
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
  },
  rowDesc: {
    color: colors.textSecondary,
    fontFamily: 'Inter',
    fontSize: 13,
    marginTop: 4,
  },
  about: {
    alignItems: 'center',
    marginTop: 40,
    opacity: 0.5,
  },
  version: {
    color: colors.textPrimary,
    fontFamily: 'Inter',
    marginTop: 12,
    fontWeight: '600',
  },
  credits: {
    color: colors.textSecondary,
    fontFamily: 'Inter',
    marginTop: 4,
    fontSize: 12,
  }
});
