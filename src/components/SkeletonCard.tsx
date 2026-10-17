import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

function ShimmerBox({ style }: { style: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  return <Animated.View style={[style, { opacity }]} />;
}

export function SkeletonCard() {
  return (
    <View style={s.card}>
      <ShimmerBox style={s.thumb} />
      <View style={s.meta}>
        <ShimmerBox style={s.title1} />
        <ShimmerBox style={s.title2} />
        <ShimmerBox style={s.sub} />
        <ShimmerBox style={s.sub2} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', marginBottom: 18, gap: 11, alignItems: 'flex-start' },
  thumb: { width: 142, height: 84, borderRadius: 10, backgroundColor: '#252529' },
  meta: { flex: 1, gap: 8, paddingTop: 2 },
  title1: { height: 13, borderRadius: 6, backgroundColor: '#252529', width: '90%' },
  title2: { height: 13, borderRadius: 6, backgroundColor: '#252529', width: '65%' },
  sub: { height: 10, borderRadius: 5, backgroundColor: '#1f1f23', width: '55%', marginTop: 4 },
  sub2: { height: 10, borderRadius: 5, backgroundColor: '#1f1f23', width: '35%' },
});
