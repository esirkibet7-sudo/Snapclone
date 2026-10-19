
## APK integration status

The provider now defaults to the production service hosts/routes observed in the supplied SnapTube APK. Demo/mock content has been removed from the runtime path. The APK's 48-site catalog is included at `assets/snaptube/full_sites.json`.

Live provider verification is still environment-dependent: this sandbox cannot resolve external production DNS, so no claim is made that live API responses were tested here.

## Full APK resource integration

This snapshot now imports the directly usable resources from the supplied `Snaptube.apk` rather than only two selected images. The project contains the APK application assets plus all raster artwork under `assets/snaptube/apk-resources/` and a generated registry at `src/services/snaptubeResources.ts`.

The `APK resources` screen exposes the imported artwork and resource counts. `metro.config.js` also registers the APK's custom resource extensions used by the imported pack.

Security/runtime-only APK material such as certificate stores, compiled DEX/native libraries, baseline profiles, and SDK measurement payloads is intentionally not embedded as app content. The clone uses the reusable application resources, not private authentication material.

## YouTube quality extraction

YouTube may return only a pre-merged 360p stream unless yt-dlp can obtain a current PO token. The backend supports the bgutil PO-token provider and requests the `mweb` client when `YOUTUBE_POT_PROVIDER_URL` is configured. Without that provider, it uses the best-effort `visionos` client and reports only resolutions actually returned by yt-dlp.

For local Windows development, install the plugin and run the provider server in a separate terminal. The provider setup uses Node.js 22 or newer:

```bash
python -m pip install --upgrade bgutil-ytdlp-pot-provider
git clone https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git
cd bgutil-ytdlp-pot-provider/server
npm ci
npx tsc
node build/main.js --host 127.0.0.1 --port 4416
```

In another terminal, from the app project directory, start the backend with:

```bash
export YOUTUBE_POT_PROVIDER_URL=http://127.0.0.1:4416
npm run server
```

In PowerShell, set `$env:YOUTUBE_POT_PROVIDER_URL="http://127.0.0.1:4416"` before `npm run server`. For Docker or hosted deployments, the plugin is included in the image; set `YOUTUBE_POT_PROVIDER_URL` to a provider address reachable from the backend container. The provider service must be running; setting the variable alone does not generate tokens. Check the backend's `[formats]` log after opening a video: higher quality choices appear only when extraction actually returns them.
