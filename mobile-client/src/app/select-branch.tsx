import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import type { BranchInfo } from '@/services/api'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

export default function SelectBranchScreen() {
  const {
    isAuthenticated,
    isLoading,
    needsBranchSelection,
    branches,
    branchesLoading,
    fetchBranches,
    selectBranch,
  } = useAuth()
  const [selectingId, setSelectingId] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  // Reached either as a mandatory first step (no branch yet) or from a
  // "Change branch" button, which passes mode=switch so the redirect guard
  // below does not bounce the user back to the dashboard.
  const { mode } = useLocalSearchParams<{ mode?: string }>()
  const isSwitch = mode === 'switch'

  useEffect(() => {
    if (isAuthenticated) void fetchBranches()
  }, [isAuthenticated, fetchBranches])

  async function onSelect(branch: BranchInfo) {
    setSelectingId(branch.branch_id)
    setLocalError(null)
    try {
      await selectBranch(branch.branch_id)
      router.replace('/')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Unable to select branch.')
    } finally {
      setSelectingId(null)
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!isAuthenticated) return <Redirect href="/login" />
  if (!needsBranchSelection && !isSwitch) return <Redirect href="/" />

  return (
    <View style={styles.container}>
      {isSwitch ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          accessibilityHint="Keep the current branch"
          style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      ) : null}
      <Text style={styles.title}>Select a branch</Text>
      <Text style={styles.subtitle}>Choose the branch you are working from.</Text>

      {branchesLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : branches.length === 0 ? (
        <Text style={styles.empty}>
          No branches are assigned to your account. Ask an administrator to assign one.
        </Text>
      ) : (
        <FlatList
          data={branches}
          keyExtractor={(item) => item.branch_id}
          contentContainerStyle={{ paddingVertical: spacing.md }}
          renderItem={({ item }) => {
            const busy = selectingId === item.branch_id
            return (
              <Pressable
                style={({ pressed }) => [styles.row, (pressed || busy) && styles.rowPressed]}
                onPress={() => onSelect(item)}
                disabled={selectingId !== null}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.branch_name}</Text>
                  <Text style={styles.rowSubtitle}>
                    {[item.city, item.country].filter(Boolean).join(', ') || 'No location'}
                  </Text>
                </View>
                {busy ? <ActivityIndicator color={colors.primary} /> : null}
              </Pressable>
            )
          }}
        />
      )}

      {localError ? <Text style={styles.error}>{localError}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  cancel: { alignSelf: 'flex-start', paddingVertical: spacing.xs, marginTop: spacing.sm },
  cancelPressed: { opacity: 0.6 },
  cancelText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.xl },
  subtitle: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.xs },
  empty: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowPressed: { borderColor: colors.primary },
  rowTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  rowSubtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.sm },
})
