import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { updateService } from '../src/services/updates';

export default function RootLayout() {
  useEffect(() => {
    updateService.checkSilentOnLaunch();
  }, []);

  return <>
    <StatusBar style="light" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0b0b0d' }, animation: 'fade' }} />
  </>;
}
