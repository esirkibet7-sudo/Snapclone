import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { personalization, KENYA_INTERESTS, KenyaCategory, TopicScores } from '../src/services/personalization';

export default function MyInterests() {
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof personalization.getProfile>> | null>(null);
  const [scores, setScores] = useState<TopicScores>({});
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const p = await personalization.getProfile();
      const s = await personalization.getEffectiveScores();
      setProfile(p);
      setScores(s);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { reload(); }, []));

  const toggleInterest = async (id: KenyaCategory) => {
    if (!profile) return;
    if (profile.selectedInterests.includes(id)) {
      await personalization.removeInterest(id);
    } else {
      await personalization.addInterest(id);
    }
    await reload();
  };

  const unmuteCreator = async (id: string) => {
    await personalization.unmuteCreator(id);
    await reload();
  };

  const handleReset = () => {
    Alert.alert(
      'Reset recommendations',
      'This will clear all your interests, watch signals, and preferences. You will be taken back to the interest selection screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await personalization.resetRecommendations();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const sortedTopics = KENYA_INTERESTS
    .map(cat => ({ ...cat, score: scores[cat.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const mutedCreators = profile?.mutedCreators ?? [];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={25} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Your Interests</Text>
        <View style={{ width: 25 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Topic score bar chart */}
        <Text style={styles.sectionTitle}>Your Interest Profile</Text>
        <Text style={styles.sectionSub}>Updated automatically as you watch. Scores reflect what you actually enjoy.</Text>

        {sortedTopics.slice(0, 15).map(cat => (
          <View key={cat.id} style={styles.scoreRow}>
            <Text style={styles.scoreEmoji}>{cat.emoji}</Text>
            <Text style={styles.scoreLabel} numberOfLines={1}>{cat.label}</Text>
            <View style={styles.scoreBarBg}>
              <View style={[styles.scoreBarFill, { width: `${Math.round(cat.score * 100)}%` as any }]} />
            </View>
            <Text style={styles.scoreNum}>{Math.round(cat.score * 100)}</Text>
          </View>
        ))}

        {/* Interest chips */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Selected Interests</Text>
        <Text style={styles.sectionSub}>Tap to add or remove interests from your profile.</Text>
        <View style={styles.chipGrid}>
          {KENYA_INTERESTS.map(cat => {
            const isSelected = profile?.selectedInterests.includes(cat.id);
            return (
              <Pressable
                key={cat.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleInterest(cat.id)}
              >
                <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]} numberOfLines={1}>
                  {cat.label}
                </Text>
                {isSelected && <MaterialIcons name="check" size={12} color="#E53935" />}
              </Pressable>
            );
          })}
        </View>

        {/* Muted creators */}
        {mutedCreators.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Muted Creators</Text>
            <Text style={styles.sectionSub}>You won't see their videos in your feed.</Text>
            {mutedCreators.map(id => (
              <View key={id} style={styles.creatorRow}>
                <MaterialIcons name="person-off" size={20} color="#777" />
                <Text style={styles.creatorId} numberOfLines={1}>{id}</Text>
                <Pressable onPress={() => unmuteCreator(id)} style={styles.unmuteBtn}>
                  <Text style={styles.unmuteBtnText}>Unmute</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}

        {/* Reset */}
        <View style={styles.dangerZone}>
          <Pressable style={styles.resetBtn} onPress={handleReset}>
            <MaterialIcons name="refresh" size={18} color="#E53935" />
            <Text style={styles.resetBtnText}>Reset my recommendations</Text>
          </Pressable>
          <Text style={styles.resetHint}>
            Clears all interests, watch signals, and preferences. Cannot be undone.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0b0d' },
  header: { height: 70, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#fff', fontSize: 19, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 60 },
  sectionTitle: { color: '#E53935', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  sectionSub: { color: '#555', fontSize: 11, marginBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  scoreEmoji: { fontSize: 16, width: 22 },
  scoreLabel: { color: '#ccc', fontSize: 11, width: 110 },
  scoreBarBg: { flex: 1, height: 6, backgroundColor: '#1e1e24', borderRadius: 3, overflow: 'hidden' },
  scoreBarFill: { height: '100%', backgroundColor: '#E53935', borderRadius: 3 },
  scoreNum: { color: '#555', fontSize: 10, width: 26, textAlign: 'right' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#16161c', borderWidth: 1, borderColor: '#25252d' },
  chipSelected: { backgroundColor: '#2a0e0e', borderColor: '#E53935' },
  chipEmoji: { fontSize: 14 },
  chipLabel: { color: '#aaa', fontSize: 12 },
  chipLabelSelected: { color: '#fff', fontWeight: '700' },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#151518', borderRadius: 12, padding: 12, marginBottom: 8 },
  creatorId: { flex: 1, color: '#ccc', fontSize: 12 },
  unmuteBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#1e1e24' },
  unmuteBtnText: { color: '#E53935', fontSize: 12, fontWeight: '700' },
  dangerZone: { marginTop: 32, gap: 10 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a0a0a', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#3a1515' },
  resetBtnText: { color: '#E53935', fontSize: 14, fontWeight: '700' },
  resetHint: { color: '#444', fontSize: 11, lineHeight: 16 },
});
