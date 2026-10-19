export type VideoCategory = 'video' | 'music' | 'shorts' | 'live';
export type SearchFilter = 'all' | VideoCategory;
export type VideoFormat = 'video_144' | 'video_240' | 'video_360' | 'video_480' | 'video_720' | 'video_1080' | 'video_1440' | 'video_2160' | 'audio_128' | 'audio_192' | 'audio_320';

export type VideoFormatOption = {
  id: VideoFormat;
  label: string;
  size?: string;
  kind: 'video' | 'audio';
  playable?: boolean;
};

export type Video = {
  id: string;
  title: string;
  channel: string;
  channelId?: string;
  thumbnail: string;
  duration: string;
  views: string;
  published: string;
  category: VideoCategory;
  description?: string;
  sourceUrl?: string;
  isLive?: boolean;
  formats?: VideoFormatOption[];
};

export type ProviderLinkResult = {
  kind: 'video' | 'audio' | 'playlist' | 'profile' | 'unknown';
  title?: string;
  video?: Video;
  provider?: string;
  downloadable?: boolean;
};
