import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusTimeline } from '../StatusTimeline';

// The StepTracker inside the ExpandedView is basically the StatusTimeline we already built.
export const StepTracker = () => {
  return (
    <View style={styles.container}>
      <StatusTimeline />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  }
});
