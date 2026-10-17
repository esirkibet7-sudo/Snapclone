/**
 * mediaSession.ts
 *
 * Bridges to the OS media notification / lock-screen controls using the
 * W3C Media Session API. React Native exposes navigator.mediaSession on
 * Android (Chrome/WebView bridge) and iOS via the native player.
 *
 * Controls shown: ⏮ ⏸/▶ ⏭  (previous, play/pause, next)
 */

type ActionHandler = () => void;

export interface MediaMetadata {
  title: string;
  artist?: string;
  album?: string;
  artwork?: string; // URL to thumbnail
}

class MediaSessionService {
  private supported = false;

  constructor() {
    try {
      this.supported = typeof navigator !== 'undefined' && 'mediaSession' in navigator;
    } catch {
      this.supported = false;
    }
  }

  /** Update the Now Playing card metadata (title, artist, artwork) */
  setMetadata(meta: MediaMetadata) {
    if (!this.supported) return;
    try {
      const artworkList = meta.artwork
        ? [{ src: meta.artwork, sizes: '512x512', type: 'image/jpeg' }]
        : [];
      // @ts-ignore – MediaMetadata is global in RN JSI env
      navigator.mediaSession.metadata = new MediaMetadata({
        title: meta.title,
        artist: meta.artist ?? '',
        album: meta.album ?? '',
        artwork: artworkList,
      });
    } catch {}
  }

  /** Tell the OS the playback state so the notification shows the right icon */
  setPlaybackState(playing: boolean) {
    if (!this.supported) return;
    try {
      // @ts-ignore
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    } catch {}
  }

  /** Update the scrubber position on the lock screen */
  setPositionState(positionSec: number, durationSec: number, playbackRate = 1) {
    if (!this.supported) return;
    try {
      if (durationSec > 0) {
        // @ts-ignore
        navigator.mediaSession.setPositionState({
          duration: durationSec,
          playbackRate,
          position: Math.min(positionSec, durationSec),
        });
      }
    } catch {}
  }

  /** Register handlers for ⏮ ⏸/▶ ⏭ buttons */
  setActionHandlers(handlers: {
    play?: ActionHandler;
    pause?: ActionHandler;
    previoustrack?: ActionHandler;
    nexttrack?: ActionHandler;
    seekbackward?: ActionHandler;
    seekforward?: ActionHandler;
    stop?: ActionHandler;
  }) {
    if (!this.supported) return;
    const actions = [
      'play', 'pause', 'previoustrack', 'nexttrack',
      'seekbackward', 'seekforward', 'stop',
    ] as const;

    for (const action of actions) {
      try {
        // @ts-ignore
        navigator.mediaSession.setActionHandler(
          action,
          handlers[action] ?? null
        );
      } catch {}
    }
  }

  /** Clear everything on unmount */
  clear() {
    if (!this.supported) return;
    try {
      // @ts-ignore
      navigator.mediaSession.metadata = null;
      // @ts-ignore
      navigator.mediaSession.playbackState = 'none';
    } catch {}
    this.setActionHandlers({});
  }
}

export const mediaSession = new MediaSessionService();
