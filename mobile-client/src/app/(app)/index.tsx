import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSIONS } from '@/config/permissions'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

export default function DashboardScreen() {
  const { user, selectedBranch, hasPermission } = useAuth()

  // Only surface modules the signed-in role can actually open, so the home
  // screen reflects the user's permissions rather than a fixed menu.
  const modules = [
    { label: 'POS', value: 'Ring up a sale', permission: PERMISSIONS.createSale },
    { label: 'Sales', value: 'Sales history', permission: PERMISSIONS.sales },
    { label: 'Products', value: 'Browse the catalog', permission: PERMISSIONS.productsPage },
    { label: 'Inventory', value: 'Stock on hand', permission: PERMISSIONS.inventory },
    { label: 'Stock', value: 'Record stock in / out', permission: PERMISSIONS.manageInventory },
  ].filter((module) => hasPermission(module.permission))

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hello, {user?.fullName ?? 'there'}</Text>
      <Text style={styles.subtitle}>{user?.role}</Text>

      <View style={styles.branchCard}>
        <Text style={styles.branchLabel}>Active branch</Text>
        <Text style={styles.branchName}>{selectedBranch?.branch_name ?? 'Not selected'}</Text>
        <Text style={styles.branchMeta}>
          {[selectedBranch?.city, selectedBranch?.country].filter(Boolean).join(', ') || 'No location'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change branch"
          accessibilityHint="Choose a different branch to work from"
          style={({ pressed }) => [styles.changeBranch, pressed && styles.changeBranchPressed]}
          onPress={() => router.push({ pathname: '/select-branch', params: { mode: 'switch' } })}
        >
          <Text style={styles.changeBranchText}>Change branch</Text>
        </Pressable>
      </View>

      {modules.map((module) => {
        const route =
          module.label === 'POS'
            ? '/pos'
            : module.label === 'Sales'
              ? '/sales'
              : module.label === 'Products'
                ? '/products'
                : module.label === 'Inventory'
                  ? '/inventory'
                  : module.label === 'Stock'
                    ? '/stock-movements'
                    : null
        const content = (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{module.label}</Text>
            <Text style={styles.cardValue}>{module.value}</Text>
          </View>
        )
        return route ? (
          <Pressable
            key={module.label}
            onPress={() => router.push(route)}
            accessibilityRole="button"
          >
            {content}
          </Pressable>
        ) : (
          <View key={module.label}>{content}</View>
        )
      })}

      {modules.length === 0 ? (
        <Text style={styles.empty}>No feature modules are enabled for your role yet.</Text>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  greeting: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.xs },
  branchCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  branchLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  branchName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginTop: spacing.xs },
  branchMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  changeBranch: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  changeBranchPressed: { backgroundColor: 'rgba(37, 99, 235, 0.08)' },
  changeBranchText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  cardValue: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  empty: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.lg },
})
