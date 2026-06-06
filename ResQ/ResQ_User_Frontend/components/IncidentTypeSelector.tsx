import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

const INCIDENT_TYPES = [
  { id: 'cardiac', icon: 'heart-pulse', label: 'Cardiac' },
  { id: 'trauma', icon: 'car-brake-alert', label: 'Trauma' },
  { id: 'burns', icon: 'fire', label: 'Burns' },
  { id: 'neuro', icon: 'brain', label: 'Neurological' },
  { id: 'maternity', icon: 'baby-carriage', label: 'Obstetric' },
  { id: 'general', icon: 'medical-bag', label: 'General' },
] as const;

interface Props {
  onSelect: (type: string) => void;
}

export const IncidentTypeSelector = ({ onSelect }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>What is the emergency?</Text>
      <View style={styles.grid}>
        {INCIDENT_TYPES.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed
            ]}
            onPress={() => onSelect(item.id)}
          >
            <MaterialCommunityIcons name={item.icon as unknown} size={32} color={colors.sos} />
            <Text style={styles.label}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: colors.surfaceAlt,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  cardPressed: {
    borderColor: colors.sos,
    backgroundColor: 'rgba(197, 48, 48, 0.1)',
  },
  label: {
    color: colors.textPrimary,
    marginTop: 8,
    fontWeight: '600',
  }
});
