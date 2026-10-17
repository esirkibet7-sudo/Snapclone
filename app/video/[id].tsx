import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio, Video as ExpoVideo, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { contentProvider } from '../../src/services/provider';
import { downloadManager } from '../../src/services/downloadManager';
import { library } from '../../src/services/library';
import { mediaSession } from '../../src/services/mediaSession';
import { Video, VideoFormat, VideoFormatOption } from '../../src/types/video';

// ─── Constants ────────────────────────────────────────────────────────────────
const SEEK_SECONDS = 10;
const AUTO_NEXT_DELAY = 3000;
const CONTROLS_HIDE_DELAY = 3000; // ms after last tap before controls auto-hide

const VIDEO_QUALITIES: { id: VideoFormat; label: string; tag: string }[] = [
  { id: 'video_144',  label: '144p',      tag: 'Low' },
  { id: 'video_240',  label: '240p',      tag: 'Low' },
  { id: 'video_360',  label: '360p',      tag: 'SD'  },
  { id: 'video_480',  label: '480p',      tag: 'SD'  },
  { id: 'video_720',  label: '720p HD',   tag: 'HD'  },
  { id: 'video_1080', label: '1080p FHD', tag: 'FHD' },
  { id: 'video_1440', label: '1440p 2K',  tag: '2K'  },
  { id: 'video_2160', label: '2160p 4K',  tag: '4K'  },
];

const DOWNLOAD_FORMATS: VideoFormatOption[] = [
  { id: 'video_144',  label: '144p',         size: 'Smallest', kind: 'video' },
  { id: 'video_240',  label: '240p',         size: 'Low',      kind: 'video' },
  { id: 'video_360',  label: '360p',         size: 'Small',    kind: 'video' },
  { id: 'video_480',  label: '480p',         size: 'Medium',   kind: 'video' },
  { id: 'video_720',  label: '720p HD',      size: 'High',     kind: 'video' },
  { id: 'video_1080', label: '1080p HD',     size: 'Full HD',  kind: 'video' },
  { id: 'video_1440', label: '1440p',        size: '2K',       kind: 'video' },
  { id: 'video_2160', label: '2160p',        size: '4K',       kind: 'video' },
  { id: 'audio_128',  label: 'MP3 128 kbps', size: 'Audio',    kind: 'audio' },
  { id: 'audio_192',  label: 'MP3 192 kbps', size: 'Audio',    kind: 'audio' },
  { id: 'audio_320',  label: 'MP3 320 kbps', size: 'Audio',    kind: 'audio' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────
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
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.75] });
  return <Animated.View style={[style, { opacity }]} />;
}

function VideoSkeleton() {
  return (
    <View style={styles.root}>
      <ShimmerBox style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#1a1a1e' }} />
      <Pressable style={styles.back} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={25} color="#fff" />
      </Pressable>
      <View style={{ padding: 16, gap: 14 }}>
        <ShimmerBox style={{ height: 16, borderRadius: 8, backgroundColor: '#1e1e22', width: '92%' }} />
        <ShimmerBox style={{ height: 16, borderRadius: 8, backgroundColor: '#1e1e22', width: '65%' }} />
        <ShimmerBox style={{ height: 11, borderRadius: 6, backgroundColor: '#191919', width: '50%', marginTop: 4 }} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          {[1, 2, 3].map(i => (
            <ShimmerBox key={i} style={{ flex: 1, height: 58, borderRadius: 14, backgroundColor: '#17171b' }} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Seek ripple ──────────────────────────────────────────────────────────────
function SeekRipple({ side, visible }: { side: 'left' | 'right'; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    if (visible) {
      opacity.setValue(1); scale.setValue(0.7);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 650, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1.25, useNativeDriver: true, tension: 70 }),
      ]).start();
    }
  }, [visible]);
  if (!visible) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.seekRipple,
        side === 'left' ? styles.seekRippleLeft : styles.seekRippleRight,
        { opacity, transform: [{ scale }] },
      ]}
    >
      <MaterialIcons name={side === 'left' ? 'replay-10' : 'forward-10'} size={38} color="#fff" />
      <Text style={styles.seekLabel}>{side === 'left' ? '-10s' : '+10s'}</Text>
    </Animated.View>
  );
}

// ─── Seekbar ──────────────────────────────────────────────────────────────────
function Seekbar({
  position,
  duration,
  onSeek,
}: {
  position: number;
  duration: number;
  onSeek: (ms: number) => void;
}) {
  const trackWidth = useRef(0);
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;
  const [dragging, setDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const dragProgressRef = useRef(0);

  const pan = useRef(
    PanResponder.create({
      // Only claim the responder on movement, not on mere touch-down
      // This prevents accidental seeks when tapping to show/hide controls
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        setDragging(true);
        const x = Math.max(0, e.nativeEvent.locationX);
        const ratio = Math.max(0, Math.min(1, x / (trackWidth.current || 1)));
        dragProgressRef.current = ratio;
        setDragProgress(ratio);
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        const x = Math.max(0, e.nativeEvent.locationX);
        const ratio = Math.max(0, Math.min(1, x / (trackWidth.current || 1)));
        dragProgressRef.current = ratio;
        setDragProgress(ratio);
      },
      onPanResponderRelease: () => {
        setDragging(false);
        onSeek(dragProgressRef.current * duration);
      },
      onPanResponderTerminate: () => {
        setDragging(false);
      },
    })
  ).current;

  const displayProgress = dragging ? dragProgress : progress;

  return (
    <View style={styles.seekbarWrapper}>
      <Text style={styles.timeText}>{fmtTime(position)}</Text>

      <View
        style={styles.seekbarTrack}
        onLayout={(e: LayoutChangeEvent) => {
          trackWidth.current = e.nativeEvent.layout.width;
        }}
        {...pan.panHandlers}
      >
        {/* Background track */}
        <View style={styles.seekbarBg} />
        {/* Buffered track */}
        <View style={[styles.seekbarBuffered, { width: `${Math.min(displayProgress * 100 + 6, 100)}%` }]} />
        {/* Filled track */}
        <View style={[styles.seekbarFilled, { width: `${displayProgress * 100}%` }]} />
        {/* Thumb circle */}
        <View
          style={[
            styles.seekbarThumb,
            { left: `${displayProgress * 100}%` },
            dragging && styles.seekbarThumbDragging,
          ]}
        />
      </View>

      <Text style={styles.timeText}>{fmtTime(duration)}</Text>
    </View>
  );
}

// ─── Custom Controls overlay ──────────────────────────────────────────────────
function PlayerControls({
  visible,
  isPlaying,
  isBuffering,
  position,
  duration,
  activeQuality,
  activeQualityLabel,
  onPlayPause,
  onSeek,
  onQualityPress,
  onBack,
  title,
  isFullscreen,
  onToggleFullscreen,
  resizeMode,
  onToggleResizeMode,
}: {
  visible: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  activeQuality: VideoFormat;
  activeQualityLabel: string;
  onPlayPause: () => void;
  onSeek: (ms: number) => void;
  onQualityPress: () => void;
  onBack: () => void;
  title: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  resizeMode: ResizeMode;
  onToggleResizeMode: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Animated.View style={[styles.controlsOverlay, { opacity }]} pointerEvents={visible ? 'box-none' : 'none'}>
      {/* Top bar */}
      <View style={styles.controlsTop}>
        <Pressable style={styles.controlBackBtn} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.controlTitle} numberOfLines={1}>{title}</Text>
        <Pressable style={styles.qualityBadge} onPress={onToggleResizeMode}>
          <MaterialIcons name={resizeMode === ResizeMode.COVER ? 'fit-screen' : 'crop-free'} size={13} color="#fff" />
          <Text style={styles.qualityBadgeText}>{resizeMode === ResizeMode.COVER ? 'Fill' : 'Fit'}</Text>
        </Pressable>
        <Pressable style={styles.qualityBadge} onPress={onQualityPress}>
          <MaterialIcons name="hd" size={13} color="#fff" />
          <Text style={styles.qualityBadgeText}>{activeQualityLabel}</Text>
          <MaterialIcons name="keyboard-arrow-up" size={14} color="#fff" />
        </Pressable>
      </View>

      {/* Centre play/pause */}
      <Pressable style={styles.playPauseBtn} onPress={onPlayPause}>
        {isBuffering ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={52} color="#fff" />
        )}
      </Pressable>

      {/* Bottom seekbar + Fullscreen expand button */}
      <View style={[styles.controlsBottom, isFullscreen && styles.controlsBottomFullscreen]}>
        <View style={styles.bottomControlsRow}>
          <View style={{ flex: 1 }}>
            <Seekbar position={position} duration={duration} onSeek={onSeek} />
          </View>
          <Pressable
            style={styles.fullscreenBtn}
            onPress={onToggleFullscreen}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons
              name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
              size={24}
              color="#fff"
            />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Description card (auto-scrolling + manually scrollable) ──────────────────
function DescriptionCard({ text }: { text: string }) {
  const scrollRef = useRef<ScrollView>(null);
  const contentHeight = useRef(0);
  const containerHeight = useRef(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const currentScrollY = useRef(0);

  const startAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    autoScrollTimer.current = setInterval(() => {
      if (isUserScrolling) return;
      const maxScroll = Math.max(0, contentHeight.current - containerHeight.current);
      if (maxScroll <= 0) return;
      currentScrollY.current = Math.min(currentScrollY.current + 1, maxScroll);
      scrollRef.current?.scrollTo({ y: currentScrollY.current, animated: false });
      // Reset to top when we reach the bottom
      if (currentScrollY.current >= maxScroll) {
        setTimeout(() => {
          currentScrollY.current = 0;
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }, 2000);
      }
    }, 40); // ~25 fps smooth scroll
  }, [isUserScrolling]);

  useEffect(() => {
    const timer = setTimeout(() => startAutoScroll(), 1500);
    return () => {
      clearTimeout(timer);
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, [startAutoScroll]);

  return (
    <View style={styles.descCard}>
      <View style={styles.descCardHeader}>
        <Text style={styles.descCardLabel}>Description</Text>
        <MaterialIcons name="auto-awesome" size={16} color="#E53935" />
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.descScroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          setIsUserScrolling(true);
          if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
        }}
        onScrollEndDrag={() => {
          // Resume auto-scroll 3s after user stops
          setTimeout(() => {
            setIsUserScrolling(false);
            startAutoScroll();
          }, 3000);
        }}
        onScroll={(e) => {
          currentScrollY.current = e.nativeEvent.contentOffset.y;
        }}
        onLayout={(e) => {
          containerHeight.current = e.nativeEvent.layout.height;
        }}
        onContentSizeChange={(_w, h) => {
          contentHeight.current = h;
        }}
      >
        <Text style={styles.descText}>{text || 'No description available.'}</Text>
      </ScrollView>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function VideoDetails() {
  const params = useLocalSearchParams<{
    id: string;
    title?: string;
    channel?: string;
    thumbnail?: string;
    duration?: string;
    views?: string;
    published?: string;
    category?: string;
    isLive?: string;
  }>();

  const id = params.id;
  const videoRef = useRef<ExpoVideo>(null);

  // ── Video state ───────────────────────────────────────────────────────────
  const [video, setVideo] = useState<Video | null>(() => {
    if (params.id && params.title) {
      return {
        id: params.id,
        title: params.title,
        channel: params.channel || 'Channel',
        thumbnail: params.thumbnail || '',
        duration: params.duration || '',
        views: params.views || '',
        published: params.published || '',
        category: (params.category as any) || 'video',
        isLive: params.isLive === '1',
      };
    }
    return null;
  });

  const [stream, setStream]               = useState<string | null>(null);
  const [loading, setLoading]             = useState(!params.title);
  const [formatOpen, setFormatOpen]       = useState(false);
  const [qualityOpen, setQualityOpen]     = useState(false);
  const [saved, setSaved]                 = useState(false);
  const [activeQuality, setActiveQuality] = useState<VideoFormat>('video_720');
  const [qualityLoading, setQualityLoading] = useState(false);
  const [isFullscreen, setIsFullscreen]   = useState(false);
  const [resizeMode, setResizeMode]       = useState<ResizeMode>(ResizeMode.CONTAIN);

  // ── Playback state ────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying]       = useState(false);
  const [isBuffering, setIsBuffering]   = useState(false);
  const [positionMs, setPositionMs]     = useState(0);
  const [durationMs, setDurationMs]     = useState(0);
  const positionRef                      = useRef(0);
  const isPlayingRef                     = useRef(false);

  // ── Controls visibility ───────────────────────────────────────────────────
  const [controlsVisible, setControlsVisible] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_DELAY);
  }, []);

  const toggleControls = useCallback(() => {
    if (controlsVisible) {
      setControlsVisible(false);
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    } else {
      showControls();
    }
  }, [controlsVisible, showControls]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    showControls();
  }, [showControls]);

  const toggleResizeMode = useCallback(() => {
    setResizeMode(prev => prev === ResizeMode.CONTAIN ? ResizeMode.COVER : ResizeMode.CONTAIN);
    showControls();
  }, [showControls]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFullscreen) {
        setIsFullscreen(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [isFullscreen]);

  // ── Double-tap seek ───────────────────────────────────────────────────────
  const [leftRipple, setLeftRipple]   = useState(false);
  const [rightRipple, setRightRipple] = useState(false);
  const leftTapTime  = useRef(0);
  const rightTapTime = useRef(0);

  // ── Auto-next ─────────────────────────────────────────────────────────────
  const [relatedVideos, setRelatedVideos]     = useState<Video[]>([]);
  const [showAutoNext, setShowAutoNext]       = useState(false);
  const [autoNextCountdown, setAutoNextCountdown] = useState(3);
  const autoNextTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Background audio + media session setup ────────────────────────────────
  useEffect(() => {
    // Keep audio playing when screen is off or app is in background
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: 1,
      shouldDuckAndroid: false,
      interruptionModeAndroid: 1,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});

    // Register OS media notification button handlers (⏮ ⏸/▶ ⏭)
    mediaSession.setActionHandlers({
      play:  () => videoRef.current?.playAsync().catch(() => {}),
      pause: () => videoRef.current?.pauseAsync().catch(() => {}),
      previoustrack: () => {
        // Restart if near start, else go to related[1]
        if (positionRef.current > 5000) {
          videoRef.current?.setStatusAsync({ positionMillis: 0, shouldPlay: true }).catch(() => {});
        }
      },
      nexttrack: () => goToNextVideo(),
      seekbackward: () => {
        const newPos = Math.max(0, positionRef.current - SEEK_SECONDS * 1000);
        videoRef.current?.setStatusAsync({ positionMillis: newPos, shouldPlay: isPlayingRef.current }).catch(() => {});
      },
      seekforward: () => {
        const newPos = positionRef.current + SEEK_SECONDS * 1000;
        videoRef.current?.setStatusAsync({ positionMillis: newPos, shouldPlay: isPlayingRef.current }).catch(() => {});
      },
    });

    return () => {
      mediaSession.clear();
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
      if (autoNextTimer.current) clearTimeout(autoNextTimer.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, []);


  // ── Fetch video details + stream (cascade: 720 → 480 → 360) ─────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!video) setLoading(true);
      try {
        const v = await contentProvider.getDetails(id);
        if (!cancelled && v) {
          setVideo(prev => ({ ...(prev ?? {}), ...v }));
          // Update media session artwork as soon as we have video details
          mediaSession.setMetadata({
            title: v.title,
            artist: v.channel,
            artwork: v.thumbnail,
          });
          await library.addHistory(v);
          setSaved(await library.isSaved(v.id));
        }
      } catch {}
      // Try qualities in descending order for best available stream
      const qualityOrder: VideoFormat[] = ['video_720', 'video_480', 'video_360'];
      for (const fmt of qualityOrder) {
        try {
          const url = await contentProvider.resolveStream(id, fmt);
          if (!cancelled && url) {
            setStream(url);
            setActiveQuality(fmt);
            break; // got a stream, stop trying lower qualities
          }
        } catch {}
      }
      if (!cancelled) setLoading(false);
      try {
        const related = await contentProvider.similar(id);
        if (!cancelled) setRelatedVideos(related.slice(0, 10));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [id]);


  // ── Playback status callback ──────────────────────────────────────────────
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if ((status as any).isBuffering) setIsBuffering(true);
      return;
    }
    positionRef.current = status.positionMillis ?? 0;
    isPlayingRef.current = status.isPlaying ?? false;
    setPositionMs(status.positionMillis ?? 0);
    setDurationMs(status.durationMillis ?? 0);
    setIsPlaying(status.isPlaying ?? false);
    setIsBuffering(status.isBuffering ?? false);

    // Keep the OS media notification in sync
    mediaSession.setPlaybackState(status.isPlaying ?? false);
    const posSec = (status.positionMillis ?? 0) / 1000;
    const durSec = (status.durationMillis ?? 0) / 1000;
    mediaSession.setPositionState(posSec, durSec);

    if (status.didJustFinish && !showAutoNext) {
      triggerAutoNext();
    }
  }, [showAutoNext]);


  // ── Auto-next ─────────────────────────────────────────────────────────────
  const triggerAutoNext = useCallback(() => {
    if (relatedVideos.length === 0) return;
    setShowAutoNext(true);
    setAutoNextCountdown(3);
    countdownInterval.current = setInterval(() => {
      setAutoNextCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownInterval.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    autoNextTimer.current = setTimeout(() => goToNextVideo(), AUTO_NEXT_DELAY);
  }, [relatedVideos]);

  const cancelAutoNext = () => {
    setShowAutoNext(false);
    if (autoNextTimer.current) clearTimeout(autoNextTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
  };

  const goToNextVideo = useCallback(() => {
    setShowAutoNext(false);
    const next = relatedVideos[0];
    if (!next) return;
    // Update the OS media notification for the incoming track
    mediaSession.setMetadata({ title: next.title, artist: next.channel, artwork: next.thumbnail });
    router.replace({
      pathname: '/video/[id]',
      params: {
        id: next.id, title: next.title, channel: next.channel,
        thumbnail: next.thumbnail, duration: next.duration,
        views: next.views, published: next.published,
        category: next.category, isLive: next.isLive ? '1' : '0',
      },
    });
  }, [relatedVideos]);

  // ── Quality switch (resumes position) ─────────────────────────────────────
  const switchQuality = async (fmt: VideoFormat) => {
    setQualityOpen(false);
    if (fmt === activeQuality) return;
    const savedPos = positionRef.current;
    setQualityLoading(true);
    try {
      const url = await contentProvider.resolveStream(id, fmt);
      if (url) {
        setStream(url);
        setActiveQuality(fmt);
        positionRef.current = savedPos; // restored in onLoad
      }
    } catch {}
    setQualityLoading(false);
  };

  const onVideoLoad = useCallback(async () => {
    if (positionRef.current > 0 && videoRef.current) {
      try {
        await videoRef.current.setStatusAsync({ positionMillis: positionRef.current, shouldPlay: true });
      } catch {}
    }
  }, []);

  // ── Play/Pause toggle ─────────────────────────────────────────────────────
  const togglePlayPause = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (isPlayingRef.current) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    } catch {}
    showControls();
  }, [showControls]);

  // ── Seek ──────────────────────────────────────────────────────────────────
  const handleSeek = useCallback(async (ms: number) => {
    if (!videoRef.current) return;
    try {
      await videoRef.current.setStatusAsync({ positionMillis: ms, shouldPlay: isPlayingRef.current });
    } catch {}
    showControls();
  }, [showControls]);

  // ── Double-tap ────────────────────────────────────────────────────────────
  const handleLeftTap = useCallback(async () => {
    const now = Date.now();
    if (now - leftTapTime.current < 300) {
      setLeftRipple(false);
      setTimeout(() => setLeftRipple(true), 10);
      const newPos = Math.max(0, positionRef.current - SEEK_SECONDS * 1000);
      if (videoRef.current) {
        try { await videoRef.current.setStatusAsync({ positionMillis: newPos, shouldPlay: isPlayingRef.current }); } catch {}
      }
    } else {
      toggleControls();
    }
    leftTapTime.current = now;
  }, [toggleControls]);

  const handleRightTap = useCallback(async () => {
    const now = Date.now();
    if (now - rightTapTime.current < 300) {
      setRightRipple(false);
      setTimeout(() => setRightRipple(true), 10);
      const newPos = positionRef.current + SEEK_SECONDS * 1000;
      if (videoRef.current) {
        try { await videoRef.current.setStatusAsync({ positionMillis: newPos, shouldPlay: isPlayingRef.current }); } catch {}
      }
    } else {
      toggleControls();
    }
    rightTapTime.current = now;
  }, [toggleControls]);

  // ── Download ──────────────────────────────────────────────────────────────
  const chooseDownload = async (format: VideoFormat) => {
    if (!video) return;
    try {
      const url = await contentProvider.resolveStream(video.id, format);
      await downloadManager.enqueue({
        id: `${video.id}-${format}`,
        title: `${video.title} (${format.replace('video_', '').replace('audio_', '')}${format.startsWith('audio_') ? ' kbps' : 'p'})`,
        url: url ?? undefined,
        type: format.startsWith('audio_') ? 'audio' : 'video',
        format,
      });
      setFormatOpen(false);
      router.push('/downloads');
    } catch {}
  };

  const availableVideoQualities = video?.formats && video.formats.length > 0
    ? VIDEO_QUALITIES.filter(q => video.formats!.some(f => f.id === q.id))
    : VIDEO_QUALITIES;

  const availableDownloadFormats = video?.formats && video.formats.length > 0
    ? video.formats : DOWNLOAD_FORMATS;

  const activeQualityLabel = VIDEO_QUALITIES.find(q => q.id === activeQuality)?.tag ?? 'SD';

  if (loading && !video) return <VideoSkeleton />;
  if (!video) return (
    <View style={styles.center}>
      <Text style={styles.error}>Video not found or unavailable.</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar hidden={isFullscreen} />

      {/* ══ Player ══ */}
      <View style={[styles.player, video.category === 'shorts' && styles.shortPlayer, isFullscreen && styles.fullScreenPlayer]}>

        {/* Live badge */}
        {video.isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}

        {/* Quality-switching loading overlay */}
        {qualityLoading && (
          <View style={[StyleSheet.absoluteFill, styles.qualityLoadingOverlay]}>
            <Image source={{ uri: video.thumbnail }} style={StyleSheet.absoluteFillObject} blurRadius={5} />
            <ActivityIndicator size="large" color="#E53935" />
            <Text style={styles.qualityLoadingText}>
              Switching to {VIDEO_QUALITIES.find(q => q.id === activeQuality)?.label}…
            </Text>
          </View>
        )}

        {/* Actual video — no native controls */}
        {stream ? (
          <ExpoVideo
            ref={videoRef}
            source={{ uri: stream }}
            style={StyleSheet.absoluteFill}
            resizeMode={resizeMode}
            shouldPlay
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            onLoad={onVideoLoad}
          />
        ) : !qualityLoading ? (
          <Image
            source={{ uri: video.thumbnail }}
            style={StyleSheet.absoluteFillObject}
            resizeMode={resizeMode === ResizeMode.COVER ? 'cover' : 'contain'}
          />
        ) : null}

        {/* Tap zones — left/right for double-tap seek; single tap shows controls */}
        <View style={styles.tapZones} pointerEvents="box-none">
          <TouchableWithoutFeedback onPress={handleLeftTap}>
            <View style={styles.tapZoneHalf} />
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback onPress={handleRightTap}>
            <View style={styles.tapZoneHalf} />
          </TouchableWithoutFeedback>
        </View>

        {/* Seek ripples */}
        <SeekRipple side="left"  visible={leftRipple}  />
        <SeekRipple side="right" visible={rightRipple} />

        {/* Custom controls overlay (fades in/out) */}
        <PlayerControls
          visible={controlsVisible && !showAutoNext}
          isPlaying={isPlaying}
          isBuffering={isBuffering}
          position={positionMs}
          duration={durationMs}
          activeQuality={activeQuality}
          activeQualityLabel={activeQualityLabel}
          onPlayPause={togglePlayPause}
          onSeek={handleSeek}
          onQualityPress={() => { setQualityOpen(true); showControls(); }}
          onBack={() => {
            if (isFullscreen) {
              setIsFullscreen(false);
            } else {
              router.back();
            }
          }}
          title={video.title}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          resizeMode={resizeMode}
          onToggleResizeMode={toggleResizeMode}
        />

        {/* Auto-next overlay */}
        {showAutoNext && relatedVideos.length > 0 && (
          <View style={styles.autoNextOverlay}>
            <View style={styles.autoNextCard}>
              <Image source={{ uri: relatedVideos[0].thumbnail }} style={styles.autoNextThumb} />
              <View style={styles.autoNextInfo}>
                <Text style={styles.autoNextLabel}>Up Next</Text>
                <Text style={styles.autoNextTitle} numberOfLines={2}>{relatedVideos[0].title}</Text>
                <Text style={styles.autoNextChannel}>{relatedVideos[0].channel}</Text>
              </View>
            </View>
            <View style={styles.autoNextActions}>
              <Pressable style={styles.autoNextBtn} onPress={goToNextVideo}>
                <MaterialIcons name="skip-next" size={18} color="#fff" />
                <Text style={styles.autoNextBtnText}>Play Now ({autoNextCountdown}s)</Text>
              </Pressable>
              <Pressable style={styles.autoNextCancelBtn} onPress={cancelAutoNext}>
                <Text style={styles.autoNextCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* ══ Details body (hidden in fullscreen) ══ */}
      {!isFullscreen && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{video.title}</Text>
            <Pressable onPress={() => setFormatOpen(true)} style={styles.downloadButton}>
              <MaterialIcons name="download" size={22} color="#fff" />
            </Pressable>
          </View>
          <Text style={styles.meta}>{video.channel} • {video.views} views • {video.published}</Text>

          {/* Action buttons */}
          <View style={styles.actions}>
            <Action icon="download"       label="Download" onPress={() => setFormatOpen(true)} />
            <Action
              icon={saved ? 'bookmark' : 'bookmark-border'}
              label={saved ? 'Saved' : 'Save'}
              onPress={async () => setSaved(await library.toggleSaved(video))}
            />
            <Action
              icon="share"
              label="Share"
              onPress={() => Share.share({ message: `${video.title}\n${video.sourceUrl ?? ''}` })}
            />
            <Action icon="hd" label="Quality" onPress={() => setQualityOpen(true)} />
          </View>

          {/* Collapsible description card */}
          <DescriptionCard text={video.description || ''} />

          {/* Up Next list */}
          {relatedVideos.length > 0 && (
            <>
              <Text style={[styles.section, { marginTop: 20 }]}>Up Next</Text>
              {relatedVideos.slice(0, 5).map((v) => (
                <Pressable
                  key={v.id}
                  style={styles.relatedCard}
                  onPress={() =>
                    router.replace({
                      pathname: '/video/[id]',
                      params: {
                        id: v.id, title: v.title, channel: v.channel,
                        thumbnail: v.thumbnail, duration: v.duration,
                        views: v.views, published: v.published,
                        category: v.category, isLive: v.isLive ? '1' : '0',
                      },
                    })
                  }
                >
                  <Image source={{ uri: v.thumbnail }} style={styles.relatedThumb} />
                  <View style={styles.relatedInfo}>
                    <Text style={styles.relatedTitle} numberOfLines={2}>{v.title}</Text>
                    <Text style={styles.relatedMeta}>{v.channel} • {v.views} views</Text>
                  </View>
                </Pressable>
              ))}
            </>
          )}
        </View>
      </ScrollView>
      )}

      {/* ── Quality picker modal ── */}
      <Modal transparent visible={qualityOpen} animationType="slide" onRequestClose={() => setQualityOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Video Quality</Text>
              <Pressable onPress={() => setQualityOpen(false)}>
                <MaterialIcons name="close" size={24} color="#aaa" />
              </Pressable>
            </View>
            <Text style={styles.sheetSubtitle}>Switches instantly · resumes from current position</Text>
            {availableVideoQualities.map(q => {
              const isActive = q.id === activeQuality;
              return (
                <Pressable
                  key={q.id}
                  style={[styles.qualityRow, isActive && styles.qualityRowActive]}
                  onPress={() => switchQuality(q.id)}
                >
                  <View style={styles.qualityRowLeft}>
                    <MaterialIcons name="hd" size={20} color={isActive ? '#E53935' : '#888'} />
                    <Text style={[styles.qualityLabel, isActive && styles.qualityLabelActive]}>{q.label}</Text>
                    <View style={[styles.qualityTag, isActive && styles.qualityTagActive]}>
                      <Text style={[styles.qualityTagText, isActive && styles.qualityTagTextActive]}>{q.tag}</Text>
                    </View>
                  </View>
                  {isActive && <MaterialIcons name="check-circle" size={20} color="#E53935" />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* ── Download format modal ── */}
      <Modal transparent visible={formatOpen} animationType="slide" onRequestClose={() => setFormatOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Choose download format</Text>
              <Pressable onPress={() => setFormatOpen(false)}>
                <MaterialIcons name="close" size={24} color="#aaa" />
              </Pressable>
            </View>
            <ScrollView>
              {availableDownloadFormats.map(f => (
                <Pressable key={f.id} style={styles.format} onPress={() => chooseDownload(f.id)}>
                  <View>
                    <Text style={styles.formatLabel}>{f.label}</Text>
                    <Text style={styles.formatSize}>{f.size}</Text>
                  </View>
                  <MaterialIcons name={f.kind === 'audio' ? 'audiotrack' : 'video-file'} size={24} color="#ff1744" />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Action button ────────────────────────────────────────────────────────────
function Action({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.action} onPress={onPress}>
      <MaterialIcons name={icon} size={22} color="#fff" />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#0b0b0d' },
  center: { flex: 1, backgroundColor: '#0b0b0d', alignItems: 'center', justifyContent: 'center' },
  error:  { color: '#fff' },

  player:      { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', overflow: 'hidden' },
  shortPlayer: { aspectRatio: 9 / 16 },
  fullScreenPlayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 999,
    backgroundColor: '#000',
    aspectRatio: undefined,
  },

  liveBadge: {
    position: 'absolute', zIndex: 3, left: 14, bottom: 60,
    backgroundColor: '#ff1744', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  liveDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontWeight: '900', fontSize: 11 },

  qualityLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  qualityLoadingText: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 6 },

  // Tap zones
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 5,
  },
  tapZoneHalf: { flex: 1 },

  // Seek ripple
  seekRipple: {
    position: 'absolute', zIndex: 6,
    top: '35%',
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  seekRippleLeft:  { left: '8%' },
  seekRippleRight: { right: '8%' },
  seekLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // ── Custom Controls overlay ──
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 7,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'space-between',
  },
  controlsTop: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingTop: 10, gap: 8,
  },
  controlBackBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  controlTitle: {
    flex: 1, color: '#fff', fontSize: 13, fontWeight: '700',
  },
  qualityBadge: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 9, paddingVertical: 5,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  qualityBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  playPauseBtn: {
    alignSelf: 'center',
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },

  controlsBottom: {
    paddingHorizontal: 12, paddingBottom: 12,
  },
  controlsBottomFullscreen: {
    paddingHorizontal: 16, paddingBottom: 28,
  },
  bottomControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullscreenBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Seekbar ──
  seekbarWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  seekbarTrack: {
    flex: 1,
    height: 44, // large touch target
    justifyContent: 'center',
    position: 'relative',
  },
  seekbarBg: {
    position: 'absolute', left: 0, right: 0, height: 5,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3,
  },
  seekbarBuffered: {
    position: 'absolute', left: 0, height: 5,
    backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 3,
  },
  seekbarFilled: {
    position: 'absolute', left: 0, height: 5,
    backgroundColor: '#E53935', borderRadius: 3,
  },
  seekbarThumb: {
    position: 'absolute',
    marginLeft: -10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#E53935',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#E53935', shadowOpacity: 0.9,
    shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    top: '50%', marginTop: -10,
  },
  seekbarThumbDragging: {
    width: 26, height: 26, borderRadius: 13, marginLeft: -13, marginTop: -13,
    shadowRadius: 10, elevation: 12,
  },
  timeText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', minWidth: 36 },

  // Auto-next overlay
  autoNextOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center', padding: 16, gap: 16,
  },
  autoNextCard: {
    flexDirection: 'row', gap: 12, width: '100%',
    backgroundColor: '#1a1a1e', borderRadius: 14, padding: 10, alignItems: 'center',
  },
  autoNextThumb:   { width: 80, height: 50, borderRadius: 8, backgroundColor: '#111' },
  autoNextInfo:    { flex: 1, gap: 3 },
  autoNextLabel:   { color: '#E53935', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  autoNextTitle:   { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  autoNextChannel: { color: '#888', fontSize: 11 },
  autoNextActions: { flexDirection: 'row', gap: 10, width: '100%' },
  autoNextBtn: {
    flex: 1, backgroundColor: '#E53935', borderRadius: 10,
    paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  autoNextBtnText:    { color: '#fff', fontWeight: '800', fontSize: 13 },
  autoNextCancelBtn:  { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: '#2a2a2e', justifyContent: 'center' },
  autoNextCancelText: { color: '#aaa', fontWeight: '700', fontSize: 13 },

  // Details
  body:     { padding: 16 },
  titleRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  title:    { color: '#fff', fontSize: 20, fontWeight: '800', flex: 1, lineHeight: 27 },
  downloadButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#ff1744', alignItems: 'center', justifyContent: 'center',
  },
  meta: { color: '#8f8f95', fontSize: 12, marginTop: 8 },
  actions: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginVertical: 18, paddingVertical: 13,
    backgroundColor: '#151518', borderRadius: 15,
  },
  action:     { alignItems: 'center', gap: 5 },
  actionText: { color: '#aaa', fontSize: 11 },
  section:    { color: '#fff', fontWeight: '800', fontSize: 15, marginBottom: 8 },

  // Description card
  descCard: {
    backgroundColor: '#131317',
    borderRadius: 14, padding: 14, marginBottom: 18,
    borderWidth: 1, borderColor: '#202026',
  },
  descCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  descCardLabel:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  descPreview:    { color: '#666', fontSize: 13, lineHeight: 19 },
  descScroll:     { maxHeight: 140 },
  descText:       { color: '#999', fontSize: 13, lineHeight: 22 },

  // Related
  relatedCard: {
    flexDirection: 'row', gap: 12, marginBottom: 12,
    backgroundColor: '#111115', borderRadius: 12, padding: 10, alignItems: 'center',
  },
  relatedThumb:  { width: 96, height: 56, borderRadius: 8, backgroundColor: '#1a1a1e' },
  relatedInfo:   { flex: 1, gap: 4 },
  relatedTitle:  { color: '#ddd', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  relatedMeta:   { color: '#666', fontSize: 11 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.65)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '82%', backgroundColor: '#17171b',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 18, paddingBottom: 30,
  },
  sheetHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle:    { color: '#fff', fontSize: 18, fontWeight: '800' },
  sheetSubtitle: { color: '#555', fontSize: 12, marginBottom: 12 },

  qualityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 14,
    backgroundColor: '#202025', borderRadius: 13, marginTop: 8,
  },
  qualityRowActive:     { backgroundColor: '#1c1218', borderWidth: 1, borderColor: 'rgba(229,57,53,0.45)' },
  qualityRowLeft:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qualityLabel:         { color: '#ccc', fontWeight: '700', fontSize: 15 },
  qualityLabelActive:   { color: '#fff' },
  qualityTag:           { paddingHorizontal: 7, paddingVertical: 2, backgroundColor: '#333', borderRadius: 5 },
  qualityTagActive:     { backgroundColor: '#E53935' },
  qualityTagText:       { color: '#aaa', fontSize: 10, fontWeight: '700' },
  qualityTagTextActive: { color: '#fff' },

  format: {
    backgroundColor: '#202025', marginTop: 9, borderRadius: 14,
    padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  formatLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },
  formatSize:  { color: '#777', marginTop: 3, fontSize: 11 },

  // Legacy back button (unused now — controls overlay has back btn)
  back: {
    position: 'absolute', top: 42, left: 14,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,.6)',
    alignItems: 'center', justifyContent: 'center',
  },
});
