import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

/**
 * Service for handling Over-The-Air (OTA) EAS updates.
 * Updates are automatically active on release builds (standalone APK / AAB).
 * In development / Expo Go, Updates.isEnabled is false and calls are safely bypassed.
 */
export const updateService = {
  isEnabled: Updates.isEnabled,

  /**
   * Check for an available update and download it.
   * If manual = true, displays alerts to the user about update status.
   */
  async checkAndApplyUpdate(manual = false): Promise<boolean> {
    if (__DEV__ || !Updates.isEnabled) {
      if (manual) {
        Alert.alert(
          'App Updates',
          'Automatic updates are active in installed app builds. You are currently running in development mode.'
        );
      }
      return false;
    }

    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        if (manual) {
          Alert.alert('Update Found', 'Downloading the latest version...');
        }
        await Updates.fetchUpdateAsync();
        Alert.alert(
          'Update Ready',
          'A new update has been downloaded. Restart the app to apply the changes now?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Restart Now',
              onPress: async () => {
                await Updates.reloadAsync();
              },
            },
          ]
        );
        return true;
      } else {
        if (manual) {
          Alert.alert('Up to Date', 'You are running the latest version of KenyaTube.');
        }
        return false;
      }
    } catch (err: any) {
      if (manual) {
        Alert.alert('Update Check Failed', err.message || 'Could not reach update server.');
      }
      return false;
    }
  },

  /**
   * Background silent check on startup.
   */
  async checkSilentOnLaunch(): Promise<void> {
    if (__DEV__ || !Updates.isEnabled) return;
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        // Ready for next restart
      }
    } catch {}
  },
};
