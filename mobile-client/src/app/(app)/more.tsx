import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useAuth } from '@/contexts/AuthContext'
import { useServerConfig } from '@/contexts/ServerConfigContext'
import { PERMISSIONS } from '@/config/permissions'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

export default function MoreScreen() {
  const { user, selectedBranch, hasPermission, logout } = useAuth()
  const { serverUrl } = useServerConfig()
  const [signingOut, setSigningOut] = useState(false)

  async function onSignOut() {
    setSigningOut(true)
    try {
      await logout()
      router.replace('/login')
    } finally {
      setSigningOut(false)
    }
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Name', value: user?.fullName ?? '—' },
    { label: 'Username', value: user?.username ?? '—' },
    { label: 'Email', value: user?.email ?? '—' },
    { label: 'Role', value: user?.role ?? '—' },
    { label: 'Branch', value: selectedBranch?.branch_name ?? '—' },
  ]

  // Inventory + stock movements no longer have their own tab; they live here,
  // gated on the same page permission the screens enforce themselves.
  const allManageRows: {
    label: string
    hint: string
    href: '/inventory' | '/stock-movements'
    permission: string
  }[] = [
    {
      label: 'Inventory',
      hint: 'Stock on hand',
      href: '/inventory',
      permission: PERMISSIONS.inventory,
    },
    {
      label: 'Stock movements',
      hint: 'Record stock in / out',
      href: '/stock-movements',
      permission: PERMISSIONS.manageInventory,
    },
  ]
  const manageRows = allManageRows.filter((row) => hasPermission(row.permission))

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.rowValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change branch"
        accessibilityHint="Choose a different branch to work from"
        style={({ pressed }) => [styles.changeBranch, pressed && styles.pressedTint]}
        onPress={() => router.push({ pathname: '/select-branch', params: { mode: 'switch' } })}
      >
        <Feather name="shuffle" size={18} color={colors.primary} />
        <Text style={styles.changeBranchText}>Change branch</Text>
      </Pressable>

      {manageRows.length > 0 ? (
        <View style={styles.card}>
          {manageRows.map((row) => (
            <Pressable
              key={row.label}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              accessibilityHint={row.hint}
              style={({ pressed }) => [styles.linkRow, pressed && styles.pressedTint]}
              onPress={() => router.push(row.href)}
            >
              <View style={styles.linkText}>
                <Text style={styles.linkLabel}>{row.label}</Text>
                <Text style={styles.linkHint}>{row.hint}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Printer settings"
          accessibilityHint="Choose the receipt printer used for POS and sales"
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressedTint]}
          onPress={() => router.push('/printers')}
        >
          <View style={styles.linkText}>
            <Text style={styles.linkLabel}>Printer settings</Text>
            <Text style={styles.linkHint}>Choose the receipt printer</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Server"
          accessibilityHint="Change the server this app connects to"
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressedTint]}
          onPress={() => router.push('/connect-server')}
        >
          <View style={styles.linkText}>
            <Text style={styles.linkLabel}>Server</Text>
            <Text style={styles.linkHint} numberOfLines={1}>
              {serverUrl ?? 'Not configured'}
            </Text>
          </View>
          <Feather name="server" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
        onPress={onSignOut}
        disabled={signingOut}
      >
        {signingOut ? <ActivityIndicator color="#fff" /> : <Text style={styles.signOutText}>Sign out</Text>}
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: fontSize.md, color: colors.textMuted },
  rowValue: { fontSize: fontSize.md, color: colors.text, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  changeBranch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  changeBranchText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
  pressedTint: { backgroundColor: 'rgba(37, 99, 235, 0.08)' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  linkText: { flex: 1 },
  linkLabel: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  linkHint: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  signOut: {
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  signOutPressed: { opacity: 0.85 },
  signOutText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
})
