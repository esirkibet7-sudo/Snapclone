# Supplied APK reconnaissance

Source: user-provided `Snaptube.apk`.

## Observed structure
- Package: `com.snaptube.pro`
- Multiple DEX files (6)
- Native ARM libraries
- Media3/ExoPlayer-related playback classes
- Firebase components
- Multiple ad SDK families
- Download/background services

## High-value observed components
- HomePageFragment
- SearchHomeFragment / SearchTabHomeFragment
- MixedSearchResultFragment
- SearchYoutubeAllFragment
- YtbVideoDetailsFragment / YtbVideoDetailsMixFragment
- VideoPlaybackFragment / VideoPlaybackController
- DownloadService / BackgroundDownloadService
- DownloadingTaskFragment / DownloadedTaskFragment
- MultiSelectDownloadFragment
- YtbMusicFragment
- MusicBarFragment
- VideoPlayListFragment
- ShortsPlayFragment
- WhatsAppDownloadFragment
- SearchTikTokFragment
- SearchFacebookFragment
- YoutubeVideoWebViewActivity
- SettingsHomeFragment
- DownloadSettingFragment
- PlaybackSettingFragment
- NotificationSettingFragment

## Product implication
The original product is a multi-source media browser/downloader. The clone should be implemented as an original client with a provider abstraction rather than copying proprietary extraction endpoints or application internals.

## Planned provider interface
`ContentProvider.search()` → results
`ContentProvider.getDetails()` → metadata/streams
`ContentProvider.resolveStream()` → authorized media URL

This lets the UI and downloader be developed before final provider credentials are supplied.
