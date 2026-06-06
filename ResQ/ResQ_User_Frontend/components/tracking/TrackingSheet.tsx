import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ArrivalBanner } from './ArrivalBanner';
import { CompactTrackingView } from './CompactTrackingView';
import { ExpandedTrackingView } from './ExpandedTrackingView';
import { colors } from '../../constants/theme';
import { useAmbulanceTracking } from '../../hooks/useAmbulanceTracking';

export const TrackingSheet = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['35%', '75%'], []);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { isArrived } = useAmbulanceTracking();

  const handleSheetChanges = useCallback((index: number) => {
    setIsExpanded(index === 1);
  }, []);

  useEffect(() => {
    if (isArrived && bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(1);
    }
  }, [isArrived]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.indicator}
      enablePanDownToClose={false}
    >
      <View style={styles.contentContainer}>
        <ArrivalBanner visible={isArrived} />
        
        <BottomSheetScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!isExpanded ? (
            <CompactTrackingView />
          ) : (
            <ExpandedTrackingView />
          )}
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  indicator: {
    backgroundColor: colors.textMuted,
    width: 40,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 24,
  }
});
