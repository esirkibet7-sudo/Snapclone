/**
 * Kenyatube Personalization Service
 *
 * Architecture:
 *   - Pure AsyncStorage (no Supabase, no SQLite, no bloat)
 *   - Anonymous via stable device-derived key (uuid stored in storage)
 *   - All data is local-first; can be extended to sync later
 *   - Rule-based scoring engine (V1) — ML-ready modular design
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const KEYS = {
  DEVICE_ID:         'kt.device_id.v1',
  USER_PROFILE:      'kt.user_profile.v2',
} as const;

// ─── Kenya Interest Categories ────────────────────────────────────────────────
export type KenyaCategory =
  | 'kenyan_entertainment' | 'comedy' | 'kenyan_music' | 'music'
  | 'gospel' | 'football' | 'sports' | 'news' | 'politics'
  | 'technology' | 'gaming' | 'education' | 'business'
  | 'money_finance' | 'agriculture' | 'cars_auto' | 'relationships'
  | 'fashion_style' | 'beauty' | 'food_cooking' | 'fitness_health'
  | 'travel' | 'home_lifestyle' | 'family' | 'movies_tv'
  | 'podcasts' | 'dance' | 'talent' | 'arts_crafts' | 'motivation'
  | 'spirituality' | 'african_culture' | 'kenyan_culture' | 'animals'
  | 'nature_outdoors' | 'diy_life_hacks';

export const KENYA_INTERESTS: Array<{
  id: KenyaCategory;
  label: string;
  emoji: string;
  related: KenyaCategory[];
}> = [
  { id: 'kenyan_entertainment', label: 'Kenyan Entertainment', emoji: '\u{1F1F0}\u{1F1EA}', related: ['kenyan_culture', 'comedy'] },
  { id: 'comedy',               label: 'Comedy',               emoji: '\uD83D\uDE02', related: ['kenyan_entertainment', 'talent'] },
  { id: 'kenyan_music',         label: 'Kenyan Music',         emoji: '\uD83C\uDFB5', related: ['music', 'gospel', 'dance'] },
  { id: 'music',                label: 'Music',                emoji: '\uD83C\uDFA4', related: ['kenyan_music', 'gospel', 'dance'] },
  { id: 'gospel',               label: 'Gospel',               emoji: '\u271D\uFE0F', related: ['spirituality', 'kenyan_music', 'music'] },
  { id: 'football',             label: 'Football',             emoji: '\u26BD', related: ['sports', 'kenyan_culture'] },
  { id: 'sports',               label: 'Sports',               emoji: '\uD83C\uDFC6', related: ['football', 'fitness_health'] },
  { id: 'news',                 label: 'News',                 emoji: '\uD83D\uDCF0', related: ['politics', 'kenyan_culture'] },
  { id: 'politics',             label: 'Politics',             emoji: '\uD83C\uDFDB\uFE0F', related: ['news', 'kenyan_culture'] },
  { id: 'technology',           label: 'Technology',           emoji: '\uD83D\uDCBB', related: ['gaming', 'business', 'education'] },
  { id: 'gaming',               label: 'Gaming',               emoji: '\uD83C\uDFAE', related: ['technology', 'comedy'] },
  { id: 'education',            label: 'Education',            emoji: '\uD83D\uDCDA', related: ['technology', 'business', 'motivation'] },
  { id: 'business',             label: 'Business',             emoji: '\uD83D\uDCBC', related: ['money_finance', 'education', 'motivation'] },
  { id: 'money_finance',        label: 'Money & Finance',      emoji: '\uD83D\uDCB0', related: ['business', 'agriculture'] },
  { id: 'agriculture',          label: 'Agriculture',          emoji: '\uD83C\uDF31', related: ['nature_outdoors', 'money_finance', 'kenyan_culture'] },
  { id: 'cars_auto',            label: 'Cars & Auto',          emoji: '\uD83D\uDE97', related: ['technology', 'travel'] },
  { id: 'relationships',        label: 'Relationships',        emoji: '\u2764\uFE0F', related: ['family', 'comedy'] },
  { id: 'fashion_style',        label: 'Fashion & Style',      emoji: '\uD83D\uDC57', related: ['beauty', 'kenyan_culture'] },
  { id: 'beauty',               label: 'Beauty',               emoji: '\uD83D\uDC84', related: ['fashion_style'] },
  { id: 'food_cooking',         label: 'Food & Cooking',       emoji: '\uD83C\uDF5B', related: ['kenyan_culture', 'home_lifestyle', 'agriculture'] },
  { id: 'fitness_health',       label: 'Fitness & Health',     emoji: '\uD83D\uDCAA', related: ['sports', 'motivation'] },
  { id: 'travel',               label: 'Travel',               emoji: '\u2708\uFE0F', related: ['african_culture', 'nature_outdoors'] },
  { id: 'home_lifestyle',       label: 'Home & Lifestyle',     emoji: '\uD83C\uDFE0', related: ['family', 'food_cooking', 'diy_life_hacks'] },
  { id: 'family',               label: 'Family',               emoji: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67', related: ['home_lifestyle', 'relationships', 'education'] },
  { id: 'movies_tv',            label: 'Movies & TV',          emoji: '\uD83C\uDFAC', related: ['comedy', 'kenyan_entertainment'] },
  { id: 'podcasts',             label: 'Podcasts',             emoji: '\uD83C\uDF99\uFE0F', related: ['education', 'business', 'motivation'] },
  { id: 'dance',                label: 'Dance',                emoji: '\uD83D\uDC83', related: ['kenyan_music', 'music', 'talent'] },
  { id: 'talent',               label: 'Talent',               emoji: '\uD83C\uDFAD', related: ['dance', 'comedy', 'music'] },
  { id: 'arts_crafts',          label: 'Arts & Crafts',        emoji: '\uD83C\uDFA8', related: ['home_lifestyle', 'diy_life_hacks', 'kenyan_culture'] },
  { id: 'motivation',           label: 'Motivation',           emoji: '\uD83E\uDDE0', related: ['education', 'business', 'spirituality'] },
  { id: 'spirituality',         label: 'Spirituality',         emoji: '\uD83D\uDE4F', related: ['gospel', 'motivation'] },
  { id: 'african_culture',      label: 'African Culture',      emoji: '\uD83C\uDF0D', related: ['kenyan_culture', 'music', 'food_cooking'] },
  { id: 'kenyan_culture',       label: 'Kenyan Culture',       emoji: '\uD83C\uDDF0\uD83C\uDDEA', related: ['kenyan_entertainment', 'african_culture', 'kenyan_music'] },
  { id: 'animals',              label: 'Animals',              emoji: '\uD83D\uDC3E', related: ['nature_outdoors', 'kenyan_culture'] },
  { id: 'nature_outdoors',      label: 'Nature & Outdoors',    emoji: '\uD83C\uDF33', related: ['animals', 'travel', 'agriculture'] },
  { id: 'diy_life_hacks',       label: 'DIY & Life Hacks',     emoji: '\uD83D\uDEE0\uFE0F', related: ['home_lifestyle', 'arts_crafts'] },
];

// ─── Types ────────────────────────────────────────────────────────────────────
export type TopicScores   = Partial<Record<KenyaCategory, number>>;
export type CreatorScores = Record<string, number>;
export type NegativePrefs = Record<string, { score: number; reason?: string; at: number }>;

export type WatchEvent = {
  videoId:    string;
  title:      string;
  channelId:  string;
  channel:    string;
  category:   string;
  topics:     KenyaCategory[];
  watchedMs:  number;
  durationMs: number;
  completed:  boolean;
  liked:      boolean;
  saved:      boolean;
  shared:     boolean;
  at:         number;
};

export type UserProfile = {
  deviceId:          string;
  onboarded:         boolean;
  selectedInterests: KenyaCategory[];
  topicScores:       TopicScores;
  creatorScores:     CreatorScores;
  negativePrefs:     NegativePrefs;
  mutedCreators:     string[];
  rejectedTopics:    KenyaCategory[];
  languagePrefs:     Partial<Record<string, number>>;
  currentBoosts:     TopicScores;
  boostUpdatedAt:    number;
  totalWatchMs:      number;
  searchHistory:     { q: string; at: number }[];
  seenVideoIds:      string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function storageGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}

async function storageSet(key: string, value: unknown) {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function generateDeviceId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return 'kt-' + Array.from({ length: 20 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

function defaultProfile(deviceId: string): UserProfile {
  return {
    deviceId,
    onboarded: false,
    selectedInterests: [],
    topicScores: {},
    creatorScores: {},
    negativePrefs: {},
    mutedCreators: [],
    rejectedTopics: [],
    languagePrefs: {},
    currentBoosts: {},
    boostUpdatedAt: Date.now(),
    totalWatchMs: 0,
    searchHistory: [],
    seenVideoIds: [],
  };
}

// ─── Configurable weights ─────────────────────────────────────────────────────
export const WEIGHTS = {
  IMPRESSION:               0.003,
  VIDEO_OPEN:               0.015,
  WATCH_25:                 0.025,
  WATCH_50:                 0.045,
  WATCH_75:                 0.07,
  WATCH_90:                 0.10,
  WATCH_COMPLETE:           0.12,
  REPLAY:                   0.08,
  LIKE:                     0.18,
  SAVE:                     0.15,
  SHARE:                    0.10,
  FOLLOW_CREATOR:           0.20,
  CREATOR_MEANINGFUL_WATCH: 0.15,
  CREATOR_LIKE:             0.20,
  CREATOR_FOLLOW:           0.30,
  CREATOR_UNFOLLOW:        -0.25,
  NOT_INTERESTED:          -0.20,
  SKIP:                    -0.05,
  DISLIKE:                 -0.15,
  MUTE_CREATOR:            -0.50,
  SCORE_DECAY:              0.97,
  BOOST_DECAY:              0.85,
  NEGATIVE_DECAY:           0.98,
  EXPLORATION_WEIGHT:       0.05,
};

// ─── Main Personalization Service ─────────────────────────────────────────────
class PersonalizationService {
  private _profile: UserProfile | null = null;
  private _dirty = false;
  private _saveTimer: ReturnType<typeof setTimeout> | null = null;

  async getDeviceId(): Promise<string> {
    let id = await storageGet<string>(KEYS.DEVICE_ID, '');
    if (!id) {
      id = generateDeviceId();
      await storageSet(KEYS.DEVICE_ID, id);
    }
    return id;
  }

  async getProfile(): Promise<UserProfile> {
    if (this._profile) return this._profile;
    const deviceId = await this.getDeviceId();
    const saved = await storageGet<UserProfile | null>(KEYS.USER_PROFILE, null);
    this._profile = saved
      ? { ...defaultProfile(deviceId), ...saved, deviceId }
      : defaultProfile(deviceId);
    return this._profile;
  }

  private scheduleSave() {
    this._dirty = true;
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(async () => {
      this._saveTimer = null;
      if (this._dirty && this._profile) {
        this._dirty = false;
        await storageSet(KEYS.USER_PROFILE, this._profile);
      }
    }, 1500);
  }

  async saveProfile(): Promise<void> {
    if (this._profile) await storageSet(KEYS.USER_PROFILE, this._profile);
  }

  // ── Onboarding ─────────────────────────────────────────────────────────────
  async isOnboarded(): Promise<boolean> {
    return (await this.getProfile()).onboarded;
  }

  async completeOnboarding(selected: KenyaCategory[]): Promise<void> {
    const p = await this.getProfile();
    p.onboarded = true;
    p.selectedInterests = selected;
    for (const cat of selected) {
      p.topicScores[cat] = 1.0;
      const meta = KENYA_INTERESTS.find(x => x.id === cat);
      if (meta) {
        for (const rel of meta.related) {
          if (!selected.includes(rel as KenyaCategory)) {
            p.topicScores[rel as KenyaCategory] = Math.min(
              (p.topicScores[rel as KenyaCategory] ?? 0) + 0.25, 0.6
            );
          }
        }
      }
    }
    await this.saveProfile();
  }

  async skipOnboarding(): Promise<void> {
    const p = await this.getProfile();
    p.onboarded = true;
    p.selectedInterests = [];
    for (const cat of KENYA_INTERESTS) {
      p.topicScores[cat.id] = 0.3;
    }
    await this.saveProfile();
  }

  // ── Score adjustment ────────────────────────────────────────────────────────
  private async adjustTopicScore(
    topics: KenyaCategory[],
    delta: number,
    isTemporary = false
  ): Promise<void> {
    const p = await this.getProfile();
    for (const topic of topics) {
      if (isTemporary) {
        p.currentBoosts[topic] = clamp((p.currentBoosts[topic] ?? 0) + delta);
      } else {
        p.topicScores[topic] = clamp((p.topicScores[topic] ?? 0) + delta);
      }
      const meta = KENYA_INTERESTS.find(x => x.id === topic);
      if (meta) {
        for (const rel of meta.related) {
          const key = rel as KenyaCategory;
          if (isTemporary) {
            p.currentBoosts[key] = clamp((p.currentBoosts[key] ?? 0) + delta * 0.25);
          } else {
            p.topicScores[key] = clamp((p.topicScores[key] ?? 0) + delta * 0.25);
          }
        }
      }
    }
    this.scheduleSave();
  }

  private async adjustCreatorScore(channelId: string, delta: number): Promise<void> {
    const p = await this.getProfile();
    p.creatorScores[channelId] = clamp((p.creatorScores[channelId] ?? 0) + delta);
    this.scheduleSave();
  }

  // ── Watch event ─────────────────────────────────────────────────────────────
  async recordWatchEvent(event: WatchEvent): Promise<void> {
    const p = await this.getProfile();
    const ratio = event.durationMs > 0
      ? Math.min(event.watchedMs / event.durationMs, 1)
      : 0;

    let watchDelta = 0;
    if (ratio >= 0.90)       watchDelta = WEIGHTS.WATCH_90;
    else if (ratio >= 0.75)  watchDelta = WEIGHTS.WATCH_75;
    else if (ratio >= 0.50)  watchDelta = WEIGHTS.WATCH_50;
    else if (ratio >= 0.25)  watchDelta = WEIGHTS.WATCH_25;
    else                     watchDelta = WEIGHTS.VIDEO_OPEN;

    if (event.completed) watchDelta = Math.max(watchDelta, WEIGHTS.WATCH_COMPLETE);
    if (event.liked)     watchDelta += WEIGHTS.LIKE;
    if (event.saved)     watchDelta += WEIGHTS.SAVE;
    if (event.shared)    watchDelta += WEIGHTS.SHARE;

    const isMeaningful = event.watchedMs > 10_000 || ratio > 0.30;
    const finalDelta = isMeaningful ? watchDelta : watchDelta * 0.3;

    await this.adjustTopicScore(event.topics, finalDelta, false);

    if (event.channelId && isMeaningful) {
      await this.adjustCreatorScore(
        event.channelId,
        event.liked ? WEIGHTS.CREATOR_LIKE : WEIGHTS.CREATOR_MEANINGFUL_WATCH
      );
    }

    p.totalWatchMs = (p.totalWatchMs ?? 0) + event.watchedMs;
    const seen = p.seenVideoIds ?? [];
    if (!seen.includes(event.videoId)) {
      p.seenVideoIds = [event.videoId, ...seen].slice(0, 500);
    }
    this.scheduleSave();
  }

  // ── Negative feedback ───────────────────────────────────────────────────────
  async recordNegativeFeedback(
    videoId: string,
    topics: KenyaCategory[],
    channelId: string,
    reason?: string
  ): Promise<void> {
    const p = await this.getProfile();
    await this.adjustTopicScore(topics, WEIGHTS.NOT_INTERESTED, false);
    p.negativePrefs[videoId] = { score: -1, reason, at: Date.now() };
    if (!p.seenVideoIds.includes(videoId)) {
      p.seenVideoIds = [videoId, ...p.seenVideoIds].slice(0, 500);
    }
    this.scheduleSave();
  }

  async rejectTopic(topic: KenyaCategory): Promise<void> {
    const p = await this.getProfile();
    if (!p.rejectedTopics.includes(topic)) p.rejectedTopics.push(topic);
    p.topicScores[topic] = clamp((p.topicScores[topic] ?? 0) + WEIGHTS.NOT_INTERESTED);
    this.scheduleSave();
  }

  async muteCreator(channelId: string): Promise<void> {
    const p = await this.getProfile();
    if (!p.mutedCreators.includes(channelId)) p.mutedCreators.push(channelId);
    p.creatorScores[channelId] = 0;
    this.scheduleSave();
  }

  async unmuteCreator(channelId: string): Promise<void> {
    const p = await this.getProfile();
    p.mutedCreators = p.mutedCreators.filter(c => c !== channelId);
    this.scheduleSave();
  }

  // ── Search signals ──────────────────────────────────────────────────────────
  async recordSearch(query: string): Promise<void> {
    const p = await this.getProfile();
    const h = p.searchHistory ?? [];
    p.searchHistory = [{ q: query, at: Date.now() }, ...h.filter(x => x.q !== query)].slice(0, 100);
    const lq = query.toLowerCase();
    const matchedTopics: KenyaCategory[] = [];
    for (const cat of KENYA_INTERESTS) {
      if (lq.includes(cat.label.toLowerCase()) || lq.includes(cat.id.replace(/_/g, ' '))) {
        matchedTopics.push(cat.id);
      }
    }
    if (matchedTopics.length > 0) {
      await this.adjustTopicScore(matchedTopics, WEIGHTS.IMPRESSION, true);
    }
    this.scheduleSave();
  }

  async recordSearchClick(topics: KenyaCategory[]): Promise<void> {
    await this.adjustTopicScore(topics, WEIGHTS.VIDEO_OPEN, true);
  }

  async recordImpression(topics: KenyaCategory[]): Promise<void> {
    await this.adjustTopicScore(topics, WEIGHTS.IMPRESSION, false);
  }

  // ── Interest management ─────────────────────────────────────────────────────
  async addInterest(topic: KenyaCategory): Promise<void> {
    const p = await this.getProfile();
    if (!p.selectedInterests.includes(topic)) p.selectedInterests.push(topic);
    p.topicScores[topic] = Math.max(p.topicScores[topic] ?? 0, 0.6);
    await this.saveProfile();
  }

  async removeInterest(topic: KenyaCategory): Promise<void> {
    const p = await this.getProfile();
    p.selectedInterests = p.selectedInterests.filter(x => x !== topic);
    p.topicScores[topic] = Math.min(p.topicScores[topic] ?? 0, 0.3);
    await this.saveProfile();
  }

  async getMutedCreators(): Promise<string[]> {
    return (await this.getProfile()).mutedCreators ?? [];
  }

  async getRejectedTopics(): Promise<KenyaCategory[]> {
    return (await this.getProfile()).rejectedTopics ?? [];
  }

  async getEffectiveScores(): Promise<TopicScores> {
    const p = await this.getProfile();
    const hoursSince = (Date.now() - (p.boostUpdatedAt ?? Date.now())) / 3_600_000;
    const boostDecay = Math.pow(WEIGHTS.BOOST_DECAY, hoursSince);
    const result: TopicScores = {};
    for (const cat of KENYA_INTERESTS) {
      const base  = p.topicScores[cat.id] ?? 0;
      const boost = (p.currentBoosts[cat.id] ?? 0) * boostDecay * 0.4;
      result[cat.id] = clamp(base + boost);
    }
    return result;
  }

  async isVideoSeen(videoId: string): Promise<boolean> {
    return ((await this.getProfile()).seenVideoIds ?? []).includes(videoId);
  }

  async isCreatorMuted(channelId: string): Promise<boolean> {
    return ((await this.getProfile()).mutedCreators ?? []).includes(channelId);
  }

  async hasNegativeFeedback(videoId: string): Promise<boolean> {
    return !!((await this.getProfile()).negativePrefs[videoId]);
  }

  async resetRecommendations(): Promise<void> {
    const p = await this.getProfile();
    p.topicScores = {};
    p.creatorScores = {};
    p.negativePrefs = {};
    p.mutedCreators = [];
    p.rejectedTopics = [];
    p.currentBoosts = {};
    p.seenVideoIds = [];
    p.selectedInterests = [];
    p.onboarded = false;
    await this.saveProfile();
  }
}

export const personalization = new PersonalizationService();

// ─── Topic inference from video metadata ──────────────────────────────────────
export function inferTopicsFromVideo(
  title: string,
  channel: string,
  category: string
): KenyaCategory[] {
  const text = `${title} ${channel} ${category}`.toLowerCase();
  const topics: KenyaCategory[] = [];

  const matchers: Array<{ keywords: string[]; topic: KenyaCategory }> = [
    { keywords: ['football', 'soccer', 'premier league', 'harambee', 'afcon', 'fifa', 'epl', 'gor mahia', 'afc leopards'], topic: 'football' },
    { keywords: ['sport', 'athletics', 'basketball', 'rugby', 'cricket', 'marathon', 'olympics'],                           topic: 'sports' },
    { keywords: ['gospel', 'worship', 'praise', 'church', 'christian', 'hymn', 'bishop', 'pastor', 'revival'],             topic: 'gospel' },
    { keywords: ['song', 'beat', 'gengetone', 'benga', 'ohangla', 'bongo', 'afrobeat', 'nyatiti', 'skiza'],                topic: 'kenyan_music' },
    { keywords: ['music', 'audio', 'track', 'album', 'playlist', 'hit song'],                                              topic: 'music' },
    { keywords: ['comedy', 'funny', 'prank', 'laugh', 'jokes', 'sketch', 'mchongoano'],                                    topic: 'comedy' },
    { keywords: ['news', 'breaking', 'bulletin', 'headlines', 'updates', 'habari'],                                        topic: 'news' },
    { keywords: ['politics', 'parliament', 'senator', ' mp ', 'cabinet', 'election', 'vote', 'siasa'],                     topic: 'politics' },
    { keywords: ['tech', 'technology', 'coding', 'programming', 'software', 'hardware', 'phone', 'app', 'ai'],             topic: 'technology' },
    { keywords: ['gaming', 'game', 'playstation', 'xbox', 'minecraft', 'pubg', 'esports', 'gamer'],                        topic: 'gaming' },
    { keywords: ['education', 'learn', 'lesson', 'tutorial', 'school', 'university', 'study', 'exam'],                    topic: 'education' },
    { keywords: ['business', 'entrepreneur', 'startup', 'investment', 'hustle', 'biashara'],                               topic: 'business' },
    { keywords: ['money', 'finance', 'mpesa', 'bank', 'invest', 'savings', 'crypto', 'pesa', 'loan'],                     topic: 'money_finance' },
    { keywords: ['farm', 'agriculture', 'crop', 'livestock', 'harvest', 'shamba', 'mkulima', 'kilimo'],                   topic: 'agriculture' },
    { keywords: ['car', 'auto', 'vehicle', 'drive', 'motor', 'matatu', 'gari'],                                           topic: 'cars_auto' },
    { keywords: ['relationship', 'love', 'dating', 'marriage', 'couple', 'romance', 'mahusiano'],                         topic: 'relationships' },
    { keywords: ['fashion', 'style', 'outfit', 'clothing', 'dress', 'trend', 'mtindo'],                                   topic: 'fashion_style' },
    { keywords: ['beauty', 'makeup', 'skincare', 'hair', 'nail', 'salon'],                                                topic: 'beauty' },
    { keywords: ['food', 'cook', 'recipe', 'eating', 'ugali', 'nyama', 'matumbo', 'sukuma', 'chakula', 'pilau'],          topic: 'food_cooking' },
    { keywords: ['fitness', 'workout', 'gym', 'exercise', 'health', 'yoga', 'weight', 'mazoezi'],                         topic: 'fitness_health' },
    { keywords: ['travel', 'vlog', 'tour', 'vacation', 'safari', 'trip', 'destination', 'airbnb'],                        topic: 'travel' },
    { keywords: ['home', 'house', 'interior', 'decor', 'apartment', 'lifestyle', 'nyumba'],                               topic: 'home_lifestyle' },
    { keywords: ['family', 'kids', 'children', 'parenting', 'baby', 'mama', 'baba', 'familia'],                           topic: 'family' },
    { keywords: ['movie', 'film', 'series', 'netflix', 'cinema', 'tv show', 'drama'],                                     topic: 'movies_tv' },
    { keywords: ['podcast', 'interview', 'talk show', 'discussion'],                                                      topic: 'podcasts' },
    { keywords: ['dance', 'dancing', 'choreography', 'tiktok', 'moves', 'ngoma'],                                         topic: 'dance' },
    { keywords: ['talent', 'audition', 'competition', 'got talent', 'award', 'vipaji'],                                   topic: 'talent' },
    { keywords: ['art', 'craft', 'draw', 'paint', 'sculpture', 'creative', 'sanaa'],                                      topic: 'arts_crafts' },
    { keywords: ['motivation', 'inspire', 'success', 'mindset', 'goal', 'achieve', 'hamasa'],                             topic: 'motivation' },
    { keywords: ['spirit', 'prayer', 'faith', 'god', 'jesus', 'quran', 'mosque', 'temple', 'dini'],                       topic: 'spirituality' },
    { keywords: ['africa', 'african', 'continent', 'culture', 'tribe', 'traditional'],                                    topic: 'african_culture' },
    { keywords: ['kenya', 'nairobi', 'mombasa', 'kisumu', 'kenyan', 'swahili', 'luo', 'kikuyu', 'luhya', 'kamba'],        topic: 'kenyan_culture' },
    { keywords: ['animal', 'pet', 'wildlife', 'dog', 'cat', 'bird', 'elephant', 'lion', 'wanyama'],                       topic: 'animals' },
    { keywords: ['nature', 'outdoors', 'environment', 'forest', 'mountain', 'lake', 'river', 'msitu'],                    topic: 'nature_outdoors' },
    { keywords: ['diy', 'hack', 'how to', 'repair', 'fix', 'build', 'project', 'jinsi ya'],                               topic: 'diy_life_hacks' },
  ];

  for (const { keywords, topic } of matchers) {
    if (keywords.some(k => text.includes(k)) && !topics.includes(topic)) {
      topics.push(topic);
    }
  }

  if (category === 'music' && !topics.includes('music'))      topics.push('music');
  if (category === 'live'  && !topics.includes('news'))       topics.push('news');
  if (category === 'shorts' && !topics.includes('comedy'))    topics.push('comedy');

  return [...new Set(topics)].slice(0, 6);
}
