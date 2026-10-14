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
import type { Category } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSIONS } from '@/config/permissions'
import { PermissionGate } from '@/components/PermissionGate'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

function toMessage(err: unknown, fallback: string): string {
  return api.isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback
}

export default function CategoriesRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.categories}>
      <CategoriesScreen />
    </PermissionGate>
  )
}

function CategoriesScreen() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission(PERMISSIONS.manageCategories)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(handle)
  }, [search])

  const load = useCallback(async () => {
    const params: Record<string, unknown> = { includeInactive: showInactive, limit: 200 }
    if (debouncedSearch) params.q = debouncedSearch
    return api.getCategories(params)
  }, [debouncedSearch, showInactive])

  // Full (unfiltered) list powers the parent-category picker.
  const loadAll = useCallback(async () => {
    const res = await api.getCategories({ includeInactive: true, limit: 1000 })
    return res.categories ?? []
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const [res, all] = await Promise.all([load(), loadAll()])
        if (!active) return
        setCategories(res.categories ?? [])
        setAllCategories(all)
        setError(null)
      } catch {
        if (!active) return
        setCategories([])
        setError('Failed to load categories.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [load, loadAll])

  async function refresh() {
    try {
      const [res, all] = await Promise.all([load(), loadAll()])
      setCategories(res.categories ?? [])
      setAllCategories(all)
      setError(null)
    } catch {
      setError('Failed to refresh categories.')
    }
  }

  function openCreate() {
    setFormOpen(true)
    setEditingId(null)
    setName('')
    setDescription('')
    setParentId('')
    setError(null)
    setFeedback(null)
  }

  function openEdit(category: Category) {
    setFormOpen(true)
    setEditingId(category.category_id)
    setName(category.category_name)
    setDescription(category.description ?? '')
    setParentId(category.parent_category_id ?? '')
    setError(null)
    setFeedback(null)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
  }

  async function save() {
    if (!name.trim()) {
      setError('Category name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = {
        category_name: name.trim(),
        description: description.trim() || undefined,
        parent_id: parentId || undefined,
      }
      if (editingId) {
        await api.updateCategory(editingId, body)
        setFeedback('Category updated.')
      } else {
        await api.createCategory(body)
        setFeedback('Category created.')
      }
      closeForm()
      await refresh()
    } catch (err) {
      setError(toMessage(err, 'Could not save the category.'))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(category: Category) {
    setError(null)
    setFeedback(null)
    try {
      if (category.is_active) await api.deactivateCategory(category.category_id)
      else await api.activateCategory(category.category_id)
      setFeedback(category.is_active ? 'Category deactivated.' : 'Category reactivated.')
      await refresh()
    } catch (err) {
      setError(toMessage(err, 'Could not update the category.'))
    }
  }

  function confirmToggle(category: Category) {
    Alert.alert(
      category.is_active ? 'Deactivate category' : 'Reactivate category',
      category.is_active
        ? 'Products in this category keep their assignment, but the category is hidden from pickers.'
        : 'The category will be available again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: category.is_active ? 'Deactivate' : 'Reactivate',
          onPress: () => void toggleActive(category),
        },
      ],
    )
  }

  const parentOptions = allCategories.filter((c) => c.category_id !== editingId)

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Search categories"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          returnKeyType="search"
        />
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.chip, showInactive && styles.chipActive]}
            onPress={() => setShowInactive((v) => !v)}
          >
            <Text style={[styles.chipText, showInactive && styles.chipTextActive]}>
              Show inactive
            </Text>
          </Pressable>
          {canManage ? (
            <Pressable style={[styles.chip, styles.newChip]} onPress={openCreate}>
              <Text style={styles.newChipText}>+ New category</Text>
            </Pressable>
          ) : null}
        </View>
        {feedback ? <Text style={styles.success}>{feedback}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {formOpen ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId ? 'Edit category' : 'New category'}</Text>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Category name"
            placeholderTextColor={colors.textMuted}
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
          <Text style={[styles.label, styles.spaced]}>Parent category</Text>
          <View style={styles.chipWrap}>
            <Pressable
              style={[styles.chip, parentId === '' && styles.chipActive]}
              onPress={() => setParentId('')}
            >
              <Text style={[styles.chipText, parentId === '' && styles.chipTextActive]}>None</Text>
            </Pressable>
            {parentOptions.map((option) => {
              const active = parentId === option.category_id
              return (
                <Pressable
                  key={option.category_id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setParentId(option.category_id)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option.category_name}
                  </Text>
                </Pressable>
              )
            })}
          </View>
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
          data={categories}
          keyExtractor={(item) => item.category_id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>No categories found.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{item.category_name}</Text>
                {item.is_active ? null : (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveText}>Inactive</Text>
                  </View>
                )}
              </View>
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
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
