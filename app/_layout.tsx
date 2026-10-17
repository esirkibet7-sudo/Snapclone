import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { updateService } from '../src/services/updates';
import { personalization } from '../src/services/personalization';

export default function RootLayout() {
  useEffect(() => {
    updateService.checkSilentOnLaunch();
    // Check if user needs onboarding
    personalization.isOnboarded().then(done => {
      if (!done) router.replace('/onboarding');
    });
  }, []);

  return <>
    <StatusBar style="light" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0b0b0d' }, animation: 'fade' }} />
  </>;
}
