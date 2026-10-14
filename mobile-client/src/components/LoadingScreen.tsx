import { useState } from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native'
import { useBusiness } from '@/contexts/BusinessContext'
import { colors, fontSize, spacing } from '@/theme/theme'

/** Shown before Business Settings branding is available. */
const APP_NAME = 'Inventory Manager'

/**
 * Full-screen splash shown while auth/session state resolves. Mirrors the web
 * client's `SplashScreen`: the Business Settings logo and name when available,
 * otherwise the default app name.
 */
export function LoadingScreen() {
  const { name, logo } = useBusiness()
  // Remember which URL failed so a later, valid logo still renders.
  const [failedLogo, setFailedLogo] = useState<string | null>(null)

  return (
    <View style={styles.container}>
      {logo && logo !== failedLogo ? (
        <Image
          source={{ uri: logo }}
          style={styles.logo}
          resizeMode="contain"
          onError={() => setFailedLogo(logo)}
        />
      ) : null}
      <Text style={styles.name}>{name || APP_NAME}</Text>
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  logo: { width: 112, height: 112, marginBottom: spacing.md },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  spinner: { marginTop: spacing.lg },
})
