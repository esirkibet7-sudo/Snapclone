import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface EsirEasterEggModalProps {
  pinModalVisible: boolean;
  onClosePinModal: () => void;
  showcaseVisible: boolean;
  onCloseShowcase: () => void;
  onCorrectPin: () => void;
}

const SECRET_PIN = 'qwerty12345@#';

export function EsirEasterEggModal({
  pinModalVisible,
  onClosePinModal,
  showcaseVisible,
  onCloseShowcase,
  onCorrectPin,
}: EsirEasterEggModalProps) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation values for Showcase
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const haloAnim = useRef(new Animated.Value(0.9)).current;
  const starFloatAnim = useRef(new Animated.Value(0)).current;

  // PIN shake animation
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleVerifyPin = () => {
    if (pinInput.trim() === SECRET_PIN) {
      setPinInput('');
      setPinError(false);
      onCorrectPin();
    } else {
      setPinError(true);
      triggerShake();
    }
  };

  useEffect(() => {
    if (showcaseVisible) {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
      starFloatAnim.setValue(0);

      // Spring entrance
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Halo breathing
      Animated.loop(
        Animated.sequence([
          Animated.timing(haloAnim, {
            toValue: 1.25,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(haloAnim, {
            toValue: 0.95,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Halo rotation
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 10000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Floating sparkle particles
      Animated.loop(
        Animated.sequence([
          Animated.timing(starFloatAnim, {
            toValue: 1,
            duration: 2500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(starFloatAnim, {
            toValue: 0,
            duration: 2500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [showcaseVisible]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const floatY = starFloatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  return (
    <>
      {/* ─── 1. PIN INPUT MODAL ────────────────────────────────────── */}
      <Modal
        visible={pinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={onClosePinModal}
      >
        <View style={styles.backdrop}>
          <Animated.View style={[styles.pinCard, { transform: [{ translateX: shakeAnim }] }]}>
            <View style={styles.pinIconWrap}>
              <MaterialIcons name="lock" size={26} color="#ff1744" />
            </View>
            <Text style={styles.pinTitle}>Authorization Required</Text>
            <Text style={styles.pinSubtitle}>Enter access key to continue</Text>

            <View style={[styles.inputContainer, pinError && styles.inputErrorBorder]}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter PIN"
                placeholderTextColor="#666"
                value={pinInput}
                onChangeText={t => {
                  setPinInput(t);
                  if (pinError) setPinError(false);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowPassword(p => !p)}
                hitSlop={12}
                style={styles.eyeBtn}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={20}
                  color="#888"
                />
              </Pressable>
            </View>

            {pinError && (
              <Text style={styles.errorText}>Access Denied: Invalid Security Key</Text>
            )}

            <View style={styles.pinActionRow}>
              <Pressable
                style={[styles.pinBtn, styles.cancelBtn]}
                onPress={() => {
                  setPinInput('');
                  setPinError(false);
                  onClosePinModal();
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.pinBtn, styles.submitBtn]}
                onPress={handleVerifyPin}
              >
                <Text style={styles.submitBtnText}>Verify</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── 2. THE MASTERPIECE ESIR SHOWCASE MODAL ───────────────── */}
      <Modal
        visible={showcaseVisible}
        transparent
        animationType="fade"
        onRequestClose={onCloseShowcase}
      >
        <View style={styles.backdrop}>
          <Animated.View
            style={[
              styles.showcaseCard,
              {
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Ambient Background Glow Circles */}
            <Animated.View
              style={[
                styles.glowCircleRed,
                { transform: [{ scale: haloAnim }] },
              ]}
            />
            <Animated.View
              style={[
                styles.glowCircleGold,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />

            {/* Rotating Starburst Ring */}
            <Animated.View
              style={[
                styles.spinningRing,
                { transform: [{ rotate: spinInterpolate }] },
              ]}
            >
              <View style={styles.ringDot1} />
              <View style={styles.ringDot2} />
              <View style={styles.ringDot3} />
            </Animated.View>

            {/* Floating Star Elements */}
            <Animated.View style={[styles.floatingStarLeft, { transform: [{ translateY: floatY }] }]}>
              <MaterialIcons name="auto-awesome" size={24} color="#ffd700" />
            </Animated.View>
            <Animated.View style={[styles.floatingStarRight, { transform: [{ translateY: floatY }] }]}>
              <MaterialIcons name="stars" size={22} color="#ff1744" />
            </Animated.View>

            {/* Central Hologram Crest */}
            <Animated.View style={[styles.crestContainer, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.crestOuterCircle}>
                <View style={styles.crestInnerCircle}>
                  <MaterialIcons name="verified" size={48} color="#ffd700" />
                </View>
              </View>
            </Animated.View>

            {/* Text Hierarchy */}
            <View style={styles.badgeLabelRow}>
              <View style={styles.badgeLine} />
              <Text style={styles.badgeLabel}>CORE ARCHITECTURE</Text>
              <View style={styles.badgeLine} />
            </View>

            <Text style={styles.poweredBySub}>POWERED BY</Text>
            <Text style={styles.esirMain}>ESIR</Text>

            <Text style={styles.titleBio}>
              Architect & Lead Software Engineer
            </Text>

            {/* Status Pills */}
            <View style={styles.pillContainer}>
              <View style={styles.pill}>
                <View style={styles.greenDot} />
                <Text style={styles.pillText}>KERNEL: ONLINE</Text>
              </View>
              <View style={styles.pill}>
                <MaterialIcons name="speed" size={13} color="#ffd700" />
                <Text style={styles.pillText}>MAX SPEED</Text>
              </View>
              <View style={styles.pill}>
                <MaterialIcons name="security" size={13} color="#00e5ff" />
                <Text style={styles.pillText}>CIPHER 256</Text>
              </View>
            </View>

            <Text style={styles.quoteText}>
              "Crafted with relentless engineering excellence."
            </Text>

            {/* Close / Dismiss Button */}
            <Pressable
              style={styles.dismissBtn}
              onPress={onCloseShowcase}
            >
              <MaterialIcons name="check-circle" size={18} color="#fff" />
              <Text style={styles.dismissBtnText}>CONTINUE</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  // ── PIN Card Styles ──
  pinCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#16161b',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2b2b36',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  pinIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2b141d',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ff174440',
  },
  pinTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pinSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d10',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262630',
    paddingHorizontal: 14,
    width: '100%',
    height: 50,
  },
  inputErrorBorder: {
    borderColor: '#ff1744',
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 6,
  },
  errorText: {
    color: '#ff3366',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  pinActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
    width: '100%',
  },
  pinBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#202026',
  },
  cancelBtnText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#ff1744',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── ESIR Showcase Styles ──
  showcaseCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#111116',
    borderRadius: 32,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#302638',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#ff1744',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 20,
  },

  // Glowing ambient backdrops
  glowCircleRed: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 23, 68, 0.14)',
  },
  glowCircleGold: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },

  // Spinning ambient ring
  spinningRing: {
    position: 'absolute',
    top: 52,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    borderStyle: 'dashed',
    justifyContent: 'space-between',
    padding: 3,
  },
  ringDot1: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffd700',
    alignSelf: 'center',
  },
  ringDot2: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff1744',
    alignSelf: 'flex-start',
  },
  ringDot3: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00e5ff',
    alignSelf: 'flex-end',
  },

  floatingStarLeft: {
    position: 'absolute',
    top: 26,
    left: 28,
  },
  floatingStarRight: {
    position: 'absolute',
    top: 30,
    right: 28,
  },

  crestContainer: {
    marginTop: 10,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestOuterCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 23, 68, 0.15)',
    borderWidth: 2,
    borderColor: '#ff174490',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestInnerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1b1420',
    borderWidth: 1.5,
    borderColor: '#ffd700aa',
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  badgeLine: {
    width: 22,
    height: 1,
    backgroundColor: '#ff174480',
  },
  badgeLabel: {
    color: '#ff5252',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },

  poweredBySub: {
    color: '#bbb',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 7,
    marginTop: 2,
  },
  esirMain: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 6,
    textShadowColor: '#ff1744',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    marginVertical: 4,
  },
  titleBio: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },

  pillContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1c1b24',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2e2a3b',
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00e676',
  },
  pillText: {
    color: '#ddd',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  quoteText: {
    color: '#777',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
  },

  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ff1744',
    width: '100%',
    height: 48,
    borderRadius: 16,
    shadowColor: '#ff1744',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  dismissBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
