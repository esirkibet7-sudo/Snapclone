# Implementation status

## Complete in the workbench
1. Clean-room navigation shell
2. Home/feed and category filtering
3. Search and result filtering
4. Video detail/player surface
5. Download-format selection
6. Persistent queue state
7. Downloads management UI
8. Settings
9. Provider abstraction
10. Native Android download-service boundary

## Pending external input
The only intentionally blocked piece is source-specific integration: the user's permitted content/search/stream API. No proprietary SnapTube endpoint or extractor is embedded.

## Integration sequence after API is supplied
1. Map API responses to `Video`.
2. Implement pagination and refresh.
3. Implement real stream/format resolution.
4. Replace demo URL with provider URL.
5. Implement resumable/background native downloads.
6. Persist downloaded file metadata.
7. Add Media3 background audio/media session.
8. Add history/favorites/playlists.
9. Add social-source adapters where the permitted source supports them.
10. Add analytics/ads only after the core media path is stable.
