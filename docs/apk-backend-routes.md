# SnapTube APK backend reconstruction

Source: supplied SnapTube APK (7.58.1-era package).

Observed production service families in the APK:

- `https://api.thejeu.com/v2/video/search`
- `https://api.thejeu.com/v2/video`
- `https://api.thejeu.com/v2/video/bookmark/detail`
- `https://api.snaptube.app/video/simple/list`
- `https://api.thejeu.com/list/search/home`
- `https://api.thejeu.com/list/youtube/home`
- `https://api.thejeu.com/list/youtube/feed/trending`
- `https://api.thejeu.com/list/feed/video/similar`
- `https://api.thejeu.com/list/video/sync`
- YouTube channel, playlist, history, watch-later, subscription and comment route families
- `https://api.thejeu.com/union-fe/playable/`

The clone uses these as a provider boundary and does not copy APK credentials, device IDs, or private authentication material.

`assets/snaptube/full_sites.json` is copied from the APK's `assets/full_sites.json` and contains the APK's 48 configured site entries.

Runtime note: this sandbox has no DNS/network access to the production services, so live API responses cannot be verified here. The app is intentionally configured to fail with a provider error rather than silently displaying demo media.
