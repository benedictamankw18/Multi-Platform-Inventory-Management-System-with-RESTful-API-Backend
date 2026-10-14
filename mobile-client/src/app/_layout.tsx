import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/contexts/AuthContext'
import { BusinessProvider } from '@/contexts/BusinessContext'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <BusinessProvider>
        <AuthProvider>
          {/* Children are auto-discovered by Expo Router. Declaring them
              explicitly caused a warning: a group only becomes a navigator node
              when its folder has a _layout.tsx, so `(auth)` (which does not)
              is flattened to the root-stack screen `(auth)/login`. */}
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="auto" />
        </AuthProvider>
      </BusinessProvider>
    </SafeAreaProvider>
  )
}
