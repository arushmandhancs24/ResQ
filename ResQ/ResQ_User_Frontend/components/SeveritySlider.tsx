import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, severity as severityConfig } from '../constants/theme';

interface Props {
  severity: number;
  onChange: (val: number) => void;
  onConfirm: () => void;
}

export const SeveritySlider = ({ severity, onChange, onConfirm }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How severe is it?</Text>
      
      <View style={styles.levelsContainer}>
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
              onPress={() => onChange(level)}
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

      <Pressable style={styles.confirmButton} onPress={onConfirm}>
        <Text style={styles.confirmText}>Next</Text>
      </Pressable>
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
    marginBottom: 24,
  },
  levelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
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
    fontSize: 20,
    fontWeight: '800',
  },
  levelLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  levelTextSelected: {
    color: '#FFF',
  },
  confirmButton: {
    backgroundColor: colors.sos,
    padding: 16,
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  }
});
