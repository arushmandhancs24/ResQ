import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { useAppStore } from '../store/appStore';

export const HospitalCard = () => {
  const { destinationHospital } = useAppStore();

  if (!destinationHospital) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="hospital-building" size={24} color={colors.mapHospital} />
        <Text style={styles.name}>{destinationHospital.name}</Text>
      </View>
      <View style={styles.details}>
        {destinationHospital.specialties.length > 0 && (
          <View style={styles.tag}>
            <MaterialCommunityIcons name="check-circle" size={14} color={colors.statusGreen} />
            <Text style={styles.tagText}>{destinationHospital.specialties[0]} unit available</Text>
          </View>
        )}
        <Text style={styles.infoText}>ER Beds: {destinationHospital.erCapacity}</Text>
        {destinationHospital.is24x7 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>24/7</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceAlt,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 103, 73, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    color: colors.statusGreen,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  badge: {
    backgroundColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  }
});
