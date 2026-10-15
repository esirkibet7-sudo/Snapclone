const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// APK-native assets that we preserve as binary resources for the clone.
for (const ext of ['lottie', 'st', 'txt', 'pro', 'mf', 'xml']) {
  if (!config.resolver.assetExts.includes(ext)) config.resolver.assetExts.push(ext);
}

module.exports = config;
