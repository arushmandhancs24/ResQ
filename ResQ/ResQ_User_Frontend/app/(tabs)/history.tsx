import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApi } from '../../hooks/useApi';
import { colors } from '../../constants/theme';

export default function HistoryScreen() {
  const { getDispatchHistory } = useApi();
  const [history, setHistory] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getDispatchHistory();
      setHistory(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: unknown }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typeTag}>
          <MaterialCommunityIcons name="medical-bag" size={14} color={colors.textPrimary} />
          <Text style={styles.typeText}>{item.incident_type || 'Emergency'}</Text>
        </View>
        <Text style={styles.dateText}>
          {new Date(item.dispatched_at).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.details}>
        <Text style={styles.hospitalName}>Delivered to Hospital #{item.hospital_id}</Text>
        <Text style={styles.etaText}>ETA was ~{Math.ceil(item.eta_seconds / 60)} min</Text>
      </View>
      
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>{item.status?.toUpperCase() || 'RESOLVED'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Past Requests</Text>
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.sos} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="shield-check" size={64} color={colors.border} />
          <Text style={styles.emptyTitle}>No past emergencies</Text>
          <Text style={styles.emptySub}>Stay safe.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: colors.surfaceAlt,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  typeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  details: {
    marginBottom: 12,
  },
  hospitalName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  etaText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(39, 103, 73, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: colors.statusGreen,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  }
});
