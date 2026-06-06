import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface Props {
  onPress: () => void;
  visible: boolean;
}

export const RecenterButton = ({ onPress, visible }: Props) => {
  if (!visible) return null;

  return (
    <Pressable style={styles.button} onPress={onPress}>
      <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#FFF" />
      <Text style={styles.text}>Following</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(28, 32, 48, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  text: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  }
});
