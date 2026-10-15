# SnapTube APK resource integration

The supplied `Snaptube.apk` was unpacked and its directly usable application resources were imported into `assets/snaptube/apk-resources/`.

## Included

- The APK's application-level `assets/` files, excluding certificate stores (`*.bks`), baseline profile data, and the Open Measurement SDK JavaScript payload.
- Every raster resource found under `res/` (`png`, `webp`, `jpg`, `jpeg`, `gif`).
- The previously selected guide/tutorial images `sT.webp` and `QG.webp`.
- The existing `full_sites.json` site catalog.
- A generated `index.json` inventory and `src/services/snaptubeResources.ts` registry.

## Why some APK files are not copied

The APK also contains compiled Android XML resources, native libraries, DEX files, signing/certificate material, SDK runtime payloads, and build/profile metadata. Those are not application content that can be safely or meaningfully dropped into an Expo/React Native project as reusable UI/content resources. Copying private/security/runtime material would also not make the clone function better.

## Runtime use

`app/resources.tsx` imports the generated registry and renders the imported guide artwork and a raster preview. The registry statically addresses every imported raster file so Metro can bundle the resources rather than leaving them as dead files.
