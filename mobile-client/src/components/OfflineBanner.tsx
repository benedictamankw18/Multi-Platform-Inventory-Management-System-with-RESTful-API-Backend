import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '@/theme/theme'
import { useOffline } from '@/contexts/OfflineContext'

export function OfflineBanner() {
  const { isOnline, pendingCount, failedCount, syncing, syncNow, lastSyncAt } = useOffline()
  if (isOnline && pendingCount === 0 && failedCount === 0 && !syncing && !lastSyncAt) return null

  const lastSyncText = lastSyncAt
    ? ` • Last sync ${new Date(lastSyncAt).toLocaleTimeString()}`
    : ''
  const failedText = failedCount > 0 ? ` • ${failedCount} failed` : ''

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.banner} onPress={syncNow}>
        {isOnline ? (
          syncing ? (
            <Text style={styles.text}>Syncing… ({pendingCount} pending){lastSyncText}</Text>
          ) : (
            <Text style={styles.text}>
              {pendingCount} pending{failedText} • Tap to sync{lastSyncText}
            </Text>
          )
        ) : (
          <Text style={styles.text}>
            Offline • {pendingCount} queued{failedText}{lastSyncText}
          </Text>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
  },
  banner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  text: {
    color: '#92400E',
    fontSize: 13,
    textAlign: 'center',
  },
})