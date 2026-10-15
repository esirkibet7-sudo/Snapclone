
## APK integration status

The provider now defaults to the production service hosts/routes observed in the supplied SnapTube APK. Demo/mock content has been removed from the runtime path. The APK's 48-site catalog is included at `assets/snaptube/full_sites.json`.

Live provider verification is still environment-dependent: this sandbox cannot resolve external production DNS, so no claim is made that live API responses were tested here.

## Full APK resource integration

This snapshot now imports the directly usable resources from the supplied `Snaptube.apk` rather than only two selected images. The project contains the APK application assets plus all raster artwork under `assets/snaptube/apk-resources/` and a generated registry at `src/services/snaptubeResources.ts`.

The `APK resources` screen exposes the imported artwork and resource counts. `metro.config.js` also registers the APK's custom resource extensions used by the imported pack.

Security/runtime-only APK material such as certificate stores, compiled DEX/native libraries, baseline profiles, and SDK measurement payloads is intentionally not embedded as app content. The clone uses the reusable application resources, not private authentication material.
