import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { personalization, KENYA_INTERESTS, KenyaCategory } from '../src/services/personalization';

const { width } = Dimensions.get('window');
const CHIP_WIDTH = (width - 48) / 2;

const MIN_SELECTED = 3;
const RECOMMENDED_MAX = 8;

export default function Onboarding() {
  const [selected, setSelected] = useState<KenyaCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const btnScale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const toggle = useCallback((id: KenyaCategory) => {
    setSelected(prev => {
      const exists = prev.includes(id);
      if (exists) return prev.filter(x => x !== id);
      // animate button when hitting minimum
      if (prev.length === MIN_SELECTED - 1) {
        Animated.sequence([
          Animated.timing(btnScale, { toValue: 1.08, duration: 180, useNativeDriver: true }),
          Animated.timing(btnScale, { toValue: 1,    duration: 120, useNativeDriver: true }),
        ]).start();
      }
      return [...prev, id];
    });
  }, []);

  const isReady = selected.length >= MIN_SELECTED;

  const handleNext = async () => {
    if (!isReady || saving) return;
    setSaving(true);
    try {
      await personalization.completeOnboarding(selected);
      router.replace('/home');
    } catch {
      router.replace('/home');
    }
  };

  const handleSkip = async () => {
    await personalization.skipOnboarding();
    router.replace('/home');
  };

  const renderChip = ({ item }: { item: typeof KENYA_INTERESTS[number] }) => {
    const isSelected = selected.includes(item.id);
    return (
      <Pressable
        style={[styles.chip, isSelected && styles.chipSelected]}
        onPress={() => toggle(item.id)}
        android_ripple={{ color: 'rgba(229,57,53,0.3)', borderless: false }}
      >
        {isSelected && (
          <View style={styles.chipCheck}>
            <MaterialIcons name="check" size={10} color="#fff" />
          </View>
        )}
        <Text style={styles.chipEmoji}>{item.emoji}</Text>
        <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]} numberOfLines={1}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b0d" />

      {/* Skip button */}
      <View style={styles.topBar}>
        <Text style={styles.logoText}>Kenya<Text style={styles.logoRed}>Tube</Text></Text>
        <Pressable onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose your interests</Text>
          <Text style={styles.subtitle}>Get personalized video recommendations</Text>

          {/* Progress indicator */}
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {selected.length < MIN_SELECTED
                ? `Select at least ${MIN_SELECTED - selected.length} more`
                : selected.length <= RECOMMENDED_MAX
                ? `${selected.length} selected  ✓`
                : `${selected.length} selected`}
            </Text>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: `${Math.min((selected.length / RECOMMENDED_MAX) * 100, 100)}%` as any },
                  selected.length >= MIN_SELECTED && styles.progressFillReady,
                ]}
              />
            </View>
          </View>
        </View>

        {/* Chips grid */}
        <FlatList
          data={KENYA_INTERESTS}
          numColumns={2}
          keyExtractor={item => item.id}
          renderItem={renderChip}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.row}
        />
      </Animated.View>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
          <Pressable
            style={[styles.nextBtn, !isReady && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!isReady || saving}
          >
            {saving ? (
              <Text style={styles.nextBtnText}>Setting up...</Text>
            ) : (
              <>
                <Text style={styles.nextBtnText}>
                  {isReady ? 'Next' : `Select ${MIN_SELECTED - selected.length} more`}
                </Text>
                {isReady && <MaterialIcons name="arrow-forward" size={20} color="#fff" />}
              </>
            )}
          </Pressable>
        </Animated.View>
        <Text style={styles.tip}>
          You can always change these in Settings → Your Interests
        </Text>
      </View>
    </SafeAreaView>
  );
}

const RED = '#E53935';
const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#0b0b0d' },
  topBar:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  logoText:   { color: '#f0f0f0', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  logoRed:    { color: RED },
  skipBtn:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e1e24', borderWidth: 1, borderColor: '#2a2a32' },
  skipText:   { color: '#888', fontSize: 13, fontWeight: '600' },
  header:     { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title:      { color: '#ffffff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6 },
  subtitle:   { color: '#888', fontSize: 14, marginBottom: 16 },
  progressRow:{ gap: 8 },
  progressText:{ color: '#777', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  progressBar:{ height: 4, backgroundColor: '#1e1e24', borderRadius: 2, overflow: 'hidden' },
  progressFill:{ height: '100%', backgroundColor: '#555', borderRadius: 2 },
  progressFillReady:{ backgroundColor: RED },
  grid:       { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 4 },
  row:        { justifyContent: 'space-between', marginBottom: 10 },
  chip: {
    width: CHIP_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16161c',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#25252d',
    position: 'relative',
    overflow: 'hidden',
  },
  chipSelected:   { backgroundColor: '#2a0e0e', borderColor: RED },
  chipCheck: {
    position: 'absolute',
    top: 6, right: 6,
    width: 16, height: 16,
    borderRadius: 8,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipEmoji:       { fontSize: 20 },
  chipLabel:       { flex: 1, color: '#aaa', fontSize: 12, fontWeight: '600' },
  chipLabelSelected:{ color: '#fff', fontWeight: '700' },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: '#0b0b0d',
    borderTopWidth: 1,
    borderTopColor: '#171718',
    gap: 10,
    alignItems: 'center',
  },
  nextBtn: {
    width: '100%',
    backgroundColor: RED,
    borderRadius: 18,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  nextBtnDisabled: { backgroundColor: '#2a1a1a', shadowOpacity: 0 },
  nextBtnText:     { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  tip:             { color: '#444', fontSize: 11, textAlign: 'center' },
});
