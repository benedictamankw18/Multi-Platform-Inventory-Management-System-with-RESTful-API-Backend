import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/contexts/AuthContext'
import { BusinessProvider } from '@/contexts/BusinessContext'
import { OfflineProvider } from '@/contexts/OfflineContext'
import { ServerConfigProvider } from '@/contexts/ServerConfigContext'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* ServerConfigProvider sits above AuthProvider so the API base URL is
          resolved (from SecureStore) before any authenticated request runs. */}
      <ServerConfigProvider>
        <BusinessProvider>
          <AuthProvider>
            <OfflineProvider>
              {/* Children are auto-discovered by Expo Router. Declaring them
                  explicitly caused a warning: a group only becomes a navigator node
                  when its folder has a _layout.tsx, so `(auth)` (which does not)
                  is flattened to the root-stack screen `(auth)/login`. */}
              <Stack screenOptions={{ headerShown: false }} />
              <StatusBar style="auto" />
            </OfflineProvider>
          </AuthProvider>
        </BusinessProvider>
      </ServerConfigProvider>
    </SafeAreaProvider>
  )
}
