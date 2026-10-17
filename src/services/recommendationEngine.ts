/**
 * Kenyatube Recommendation Engine (V1 - Rule-Based)
 * 
 * Scores every candidate video using configurable weighted components.
 * Designed to be replaced component-by-component with ML models later.
 *
 * final_score =
 *   interest_score (30%)
 *   + watch_similarity_score (20%)
 *   + creator_affinity_score (15%)
 *   + search_relevance_score (10%)
 *   + freshness_score (10%)
 *   + popularity_score (10%)
 *   + exploration_score (5%)
 *   - penalties (seen, negative, muted, repetition)
 */

import { Video } from '../types/video';
import { personalization, TopicScores, KenyaCategory, inferTopicsFromVideo } from './personalization';

// ─── Scoring weights (easily configurable) ────────────────────────────────────
const SCORE_WEIGHTS = {
  INTEREST:      0.30,
  WATCH_SIM:     0.20,
  CREATOR:       0.15,
  SEARCH:        0.10,
  FRESHNESS:     0.10,
  POPULARITY:    0.10,
  EXPLORATION:   0.05,
};

const PENALTIES = {
  ALREADY_SEEN:        0.40,   // reduce score if already watched
  NEGATIVE_FEEDBACK:   0.90,   // almost completely filter out
  MUTED_CREATOR:       0.95,   // filter out muted creators
  RECENTLY_SHOWN:      0.30,   // penalise showing same video twice in one session
};

// Diversity: cap per creator in top N results
const MAX_PER_CREATOR = 3;

// ─── Scoring utilities ────────────────────────────────────────────────────────
function normalise(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function parseViewCount(views: string): number {
  if (!views || views === '—') return 0;
  const n = parseFloat(views);
  if (views.toUpperCase().includes('B')) return n * 1e9;
  if (views.toUpperCase().includes('M')) return n * 1e6;
  if (views.toUpperCase().includes('K')) return n * 1e3;
  return n;
}

function parseDurationMs(duration: string): number {
  if (!duration || duration === '—') return 0;
  const parts = duration.split(':').map(Number);
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  return 0;
}

function freshnessScore(published: string): number {
  if (!published) return 0.5;
  const text = published.toLowerCase();
  if (text.includes('just') || text.includes('second') || text.includes('minute')) return 1.0;
  if (text.includes('hour')) {
    const h = parseInt(text) || 1;
    return Math.max(0, 1 - h / 24);
  }
  if (text.includes('day')) {
    const d = parseInt(text) || 1;
    return Math.max(0, 1 - d / 14);
  }
  if (text.includes('week')) {
    const w = parseInt(text) || 1;
    return Math.max(0, 1 - w / 4);
  }
  if (text.includes('month')) return 0.2;
  if (text.includes('year')) return 0.05;
  return 0.3;
}

// ─── Main scorer ──────────────────────────────────────────────────────────────
export interface ScoredVideo extends Video {
  _score: number;
  _topics: KenyaCategory[];
}

export class RecommendationEngine {
  private _sessionShown: Set<string> = new Set();

  /** Score and rank a list of candidate videos for a user. */
  async rankVideos(candidates: Video[]): Promise<ScoredVideo[]> {
    const profile = await personalization.getProfile();
    const effectiveScores = await personalization.getEffectiveScores();

    const results: ScoredVideo[] = [];
    const creatorCounts: Record<string, number> = {};
    let explorationIndex = 0;

    for (const video of candidates) {
      const topics = inferTopicsFromVideo(video.title, video.channel, video.category);
      const channelId = video.channelId ?? video.channel;

      // ── Penalties first (fast filter) ──────────────────────────────────────
      const hasNeg     = !!profile.negativePrefs[video.id];
      const isMuted    = profile.mutedCreators.includes(channelId);
      const isSeen     = profile.seenVideoIds.includes(video.id);
      const isSessionSeen = this._sessionShown.has(video.id);

      if (isMuted)   { continue; } // completely filter muted creators
      if (hasNeg)    { continue; } // filter "not interested"

      // ── Component scores (0–1 each) ────────────────────────────────────────

      // 1. Interest score — how well does this video match user preferences
      let interestSum = 0;
      let interestCount = 0;
      for (const topic of topics) {
        const score = effectiveScores[topic] ?? 0;
        interestSum += score;
        interestCount++;
      }
      const interestScore = interestCount > 0 ? interestSum / interestCount : 0.2;

      // Penalise rejected topics
      const isRejected = topics.some(t => profile.rejectedTopics.includes(t));
      const adjustedInterest = isRejected ? interestScore * 0.3 : interestScore;

      // 2. Creator affinity
      const creatorRaw = profile.creatorScores[channelId] ?? 0;
      // Apply diversity cap — don't let one creator dominate
      const creatorCount = creatorCounts[channelId] ?? 0;
      const diversityPenalty = creatorCount >= MAX_PER_CREATOR ? 0.3 : 1.0;
      const creatorScore = Math.min(creatorRaw, 0.9) * diversityPenalty;

      // 3. Freshness
      const fresh = freshnessScore(video.published);

      // 4. Popularity
      const viewCount = parseViewCount(video.views);
      // Normalise to log scale (0–1) — popular but not overwhelming
      const popularityScore = viewCount > 0
        ? Math.min(1, Math.log10(viewCount + 1) / 8)
        : 0.1;

      // 5. Exploration score — occasionally surface new topics
      explorationIndex++;
      const isExploration = explorationIndex % 20 === 0; // every 20th video
      const explorationBoost = isExploration ? 0.8 : 0;

      // 6. Watch similarity (simple: share topics with recent high-score topics)
      const topTopics = Object.entries(effectiveScores as Record<string, number>)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([k]) => k as KenyaCategory);
      const watchSimScore = topics.some(t => topTopics.includes(t)) ? 0.7 : 0.2;

      // 7. Search relevance — did user recently search for this topic?
      const recentSearches = (profile.searchHistory ?? []).slice(0, 10).map(s => s.q.toLowerCase());
      const searchRelScore = topics.some(t => {
        const label = t.replace(/_/g, ' ');
        return recentSearches.some(q => q.includes(label) || label.includes(q));
      }) ? 0.9 : 0.1;

      // ── Compose final score ────────────────────────────────────────────────
      let finalScore =
        adjustedInterest   * SCORE_WEIGHTS.INTEREST +
        watchSimScore      * SCORE_WEIGHTS.WATCH_SIM +
        creatorScore       * SCORE_WEIGHTS.CREATOR +
        searchRelScore     * SCORE_WEIGHTS.SEARCH +
        fresh              * SCORE_WEIGHTS.FRESHNESS +
        popularityScore    * SCORE_WEIGHTS.POPULARITY +
        explorationBoost   * SCORE_WEIGHTS.EXPLORATION;

      // Apply penalties
      if (isSeen)       finalScore *= (1 - PENALTIES.ALREADY_SEEN);
      if (isSessionSeen) finalScore *= (1 - PENALTIES.RECENTLY_SHOWN);

      // Add slight noise to prevent identical scores / boring ordering
      finalScore += (Math.random() - 0.5) * 0.02;
      finalScore = Math.max(0, Math.min(1, finalScore));

      results.push({ ...video, _score: finalScore, _topics: topics });
      creatorCounts[channelId] = creatorCount + 1;
    }

    // Sort descending
    results.sort((a, b) => b._score - a._score);

    // Mark shown in session
    for (const v of results) this._sessionShown.add(v.id);

    return results;
  }

  /** Build "For You" keywords for the provider based on user interests */
  async getForYouKeywords(): Promise<string[]> {
    const scores = await personalization.getEffectiveScores();
    const sorted = Object.entries(scores as Record<string, number>)
      .filter(([, v]) => v > 0.3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([k]) => k.replace(/_/g, ' '));

    if (sorted.length === 0) {
      return ['trending kenya', 'popular videos kenya', 'viral kenya 2025'];
    }

    // Mix interests with Kenyan context
    const keywords: string[] = [];
    for (const interest of sorted.slice(0, 4)) {
      keywords.push(`${interest} kenya`);
      keywords.push(interest);
    }
    keywords.push('kenya trending', 'viral kenya');
    return keywords;
  }

  clearSession() {
    this._sessionShown.clear();
  }
}

export const recommendationEngine = new RecommendationEngine();
