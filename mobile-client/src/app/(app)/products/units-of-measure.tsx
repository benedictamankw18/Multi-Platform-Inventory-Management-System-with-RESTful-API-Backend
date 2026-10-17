import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as api from '@/services/api'
import type { UnitOfMeasure } from '@/services/api'
import { isQueuedOffline } from '@/services/offline'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSIONS } from '@/config/permissions'
import { PermissionGate } from '@/components/PermissionGate'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

function toMessage(err: unknown, fallback: string): string {
  return api.isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback
}

function formatFactor(value: number | null): string {
  return value == null ? '1' : String(value)
}

export default function UnitsOfMeasureRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.categories}>
      <UnitsOfMeasureScreen />
    </PermissionGate>
  )
}

function UnitsOfMeasureScreen() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission(PERMISSIONS.manageCategories)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)

  const [units, setUnits] = useState<UnitOfMeasure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [factor, setFactor] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(handle)
  }, [search])

  const load = useCallback(async () => {
    // The API keeps inactive units visible by default (pickers need to resolve
    // them), so "active only" must be requested explicitly.
    const params: Record<string, unknown> = { limit: 200 }
    if (debouncedSearch) params.q = debouncedSearch
    if (activeOnly) params.isActive = 'true'
    const res = await api.getUnitsOfMeasure(params)
    return res.data ?? []
  }, [debouncedSearch, activeOnly])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const list = await load()
        if (!active) return
        setUnits(list)
        setError(null)
      } catch {
        if (!active) return
        setUnits([])
        setError('Failed to load units of measure.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [load])

  async function refresh() {
    try {
      setUnits(await load())
      setError(null)
    } catch {
      setError('Failed to refresh units of measure.')
    }
  }

  function openCreate() {
    setFormOpen(true)
    setEditingId(null)
    setName('')
    setSymbol('')
    setFactor('')
    setDescription('')
    setError(null)
    setFeedback(null)
  }

  function openEdit(unit: UnitOfMeasure) {
    setFormOpen(true)
    setEditingId(unit.uom_id)
    setName(unit.uom_name)
    setSymbol(unit.symbol ?? '')
    setFactor(formatFactor(unit.conversion_factor))
    setDescription(unit.description ?? '')
    setError(null)
    setFeedback(null)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
  }

  async function save() {
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    const parsedFactor = Number(factor.trim())
    const body: {
      name: string
      symbol?: string | null
      description?: string | null
      conversion_factor?: number
    } = {
      name: name.trim(),
      symbol: symbol.trim() || null,
      description: description.trim() || null,
    }
    if (factor.trim() && !Number.isNaN(parsedFactor) && parsedFactor > 0) {
      body.conversion_factor = parsedFactor
    }
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await api.updateUnitOfMeasure(editingId, body)
        setFeedback('Unit updated.')
      } else {
        await api.createUnitOfMeasure(body)
        setFeedback('Unit created.')
      }
      closeForm()
      await refresh()
    } catch (err) {
      if (isQueuedOffline(err)) {
        setFeedback(
          editingId
            ? 'Unit updated offline — it will sync when you reconnect.'
            : 'Unit created offline — it will sync when you reconnect.',
        )
        closeForm()
        await refresh()
        return
      }
      setError(toMessage(err, 'Could not save the unit of measure.'))
    } finally {
      setSaving(false)
    }
  }

  function confirmToggle(unit: UnitOfMeasure) {
    Alert.alert(
      unit.is_active ? 'Deactivate unit' : 'Reactivate unit',
      unit.is_active
        ? 'The unit stays visible to existing records but is marked inactive.'
        : 'The unit will be available again for new records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: unit.is_active ? 'Deactivate' : 'Reactivate',
          onPress: () => void toggleActive(unit),
        },
      ],
    )
  }

  async function toggleActive(unit: UnitOfMeasure) {
    setError(null)
    setFeedback(null)
    try {
      if (unit.is_active) await api.deactivateUnitOfMeasure(unit.uom_id)
      else await api.activateUnitOfMeasure(unit.uom_id)
      setFeedback(unit.is_active ? 'Unit deactivated.' : 'Unit reactivated.')
      await refresh()
    } catch (err) {
      if (isQueuedOffline(err)) {
        setFeedback('Unit change saved offline — it will sync when you reconnect.')
        await refresh()
        return
      }
      setError(toMessage(err, 'Could not update the unit of measure.'))
    }
  }

  function confirmDelete(unit: UnitOfMeasure) {
    Alert.alert('Delete unit', `Permanently delete "${unit.uom_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void doDelete(unit.uom_id),
      },
    ])
  }

  async function doDelete(id: string) {
    setError(null)
    setFeedback(null)
    try {
      await api.deleteUnitOfMeasure(id)
      setFeedback('Unit deleted.')
      await refresh()
    } catch (err) {
      setError(toMessage(err, 'Could not delete the unit of measure.'))
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Search units"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          returnKeyType="search"
        />
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.chip, activeOnly && styles.chipActive]}
            onPress={() => setActiveOnly((v) => !v)}
          >
            <Text style={[styles.chipText, activeOnly && styles.chipTextActive]}>Active only</Text>
          </Pressable>
          {canManage ? (
            <Pressable style={[styles.chip, styles.newChip]} onPress={openCreate}>
              <Text style={styles.newChipText}>+ New unit</Text>
            </Pressable>
          ) : null}
        </View>
        {feedback ? <Text style={styles.success}>{feedback}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {formOpen ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId ? 'Edit unit' : 'New unit'}</Text>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Kilogram"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.label, styles.spaced]}>Symbol</Text>
          <TextInput
            style={styles.input}
            value={symbol}
            onChangeText={setSymbol}
            placeholder="e.g. kg"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.label, styles.spaced]}>Conversion factor</Text>
          <TextInput
            style={styles.input}
            value={factor}
            onChangeText={setFactor}
            placeholder="1"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.label, styles.spaced]}>Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <View style={styles.formActions}>
            <Pressable style={[styles.formButton, styles.cancelButton]} onPress={closeForm} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.formButton, styles.saveButton]}
              onPress={() => void save()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.saveText}>{editingId ? 'Save' : 'Create'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={units}
          keyExtractor={(item) => item.uom_id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>No units of measure found.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>
                  {item.uom_name}
                  {item.symbol ? ` (${item.symbol})` : ''}
                </Text>
                {item.is_active ? null : (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveText}>Inactive</Text>
                  </View>
                )}
              </View>
              <Text style={styles.meta}>
                Conversion factor: {formatFactor(item.conversion_factor)}
              </Text>
              {item.description ? <Text style={styles.meta}>{item.description}</Text> : null}
              {canManage ? (
                <View style={styles.cardActions}>
                  <Pressable style={styles.link} onPress={() => openEdit(item)}>
                    <Text style={styles.linkText}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.link} onPress={() => confirmToggle(item)}>
                    <Text style={[styles.linkText, item.is_active ? styles.danger : styles.success]}>
                      {item.is_active ? 'Deactivate' : 'Reactivate'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.link} onPress={() => confirmDelete(item)}>
                    <Text style={[styles.linkText, styles.danger]}>Delete</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.text,
  },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text },
  chipTextActive: { color: colors.surface, fontWeight: '600' },
  newChip: { borderColor: colors.primary },
  newChipText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  formTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  label: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xs },
  spaced: { marginTop: spacing.md },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  formButton: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  cancelButton: { borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  saveButton: { backgroundColor: colors.primary },
  saveText: { color: colors.surface, fontSize: fontSize.md, fontWeight: '700' },
  success: { color: colors.success, fontSize: fontSize.sm },
  error: { color: colors.danger, fontSize: fontSize.sm },
  loader: { marginTop: spacing.xl },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, flex: 1 },
  inactiveBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.textMuted,
    marginLeft: spacing.sm,
  },
  inactiveText: { fontSize: 11, color: colors.surface, fontWeight: '700' },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  cardActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  link: { paddingVertical: spacing.xs },
  linkText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  danger: { color: colors.danger },
})
