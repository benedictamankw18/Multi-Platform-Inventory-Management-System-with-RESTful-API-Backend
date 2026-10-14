import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as api from '@/services/api'
import type { Product, ProductInput, ProductImage, UploadableImage } from '@/services/api'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

type FormState = {
  sku: string
  product_name: string
  barcode: string
  category_id: string
  base_uom_id: string
  cost_price: string
  retail_price: string
  wholesale_price: string
  wholesale_min_qty: string
  tax_rate: string
  discount_percentage: string
  minimum_stock: string
  description: string
  track_inventory: boolean
  expiry_required: boolean
  serial_number_required: boolean
}

function initialForm(initial?: Partial<Product> | null): FormState {
  return {
    sku: initial?.sku ?? '',
    product_name: initial?.product_name ?? '',
    barcode: initial?.barcode ?? '',
    category_id: initial?.category_id ?? '',
    base_uom_id: initial?.base_uom_id ?? '',
    cost_price: initial?.cost_price != null ? String(initial.cost_price) : '',
    retail_price: initial?.retail_price != null ? String(initial.retail_price) : '',
    wholesale_price: initial?.wholesale_price != null ? String(initial.wholesale_price) : '',
    wholesale_min_qty: initial?.wholesale_min_qty != null ? String(initial.wholesale_min_qty) : '',
    tax_rate: initial?.tax_rate != null ? String(initial.tax_rate) : '',
    discount_percentage:
      initial?.discount_percentage != null ? String(initial.discount_percentage) : '',
    minimum_stock: initial?.minimum_stock != null ? String(initial.minimum_stock) : '',
    description: initial?.description ?? '',
    track_inventory: initial?.track_inventory ?? true,
    expiry_required: initial?.expiry_required ?? false,
    serial_number_required: initial?.serial_number_required ?? false,
  }
}

function toNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  if (Number.isNaN(parsed)) return undefined
  return parsed
}

function generateBarcode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 13; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function ProductForm({
  initial,
  submitLabel,
  onSubmit,
  productId,
  onSaved,
}: {
  initial?: Partial<Product> | null
  submitLabel: string
  onSubmit: (input: ProductInput) => Promise<Product>
  productId?: string
  onSaved: (product: Product) => void
}) {
  const [form, setForm] = useState<FormState>(() => initialForm(initial))
  const [categories, setCategories] = useState<api.Category[]>([])
  const [uoms, setUoms] = useState<api.UnitOfMeasure[]>([])
  const [existingImages, setExistingImages] = useState<ProductImage[]>([])
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([])
  const [newImages, setNewImages] = useState<Array<UploadableImage & { key: string }>>([])
  const [primaryKey, setPrimaryKey] = useState<string>('')
  const [savingImages, setSavingImages] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      const [cats, units] = await Promise.all([
        api.getCategories({ includeInactive: true, limit: 1000 }).catch(() => null),
        api.getUnitsOfMeasure({ includeInactive: 'true', limit: 1000 }).catch(() => null),
      ])
      if (!active) return
      setCategories(cats?.categories ?? [])
      setUoms(units?.data ?? [])
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      if (!productId) return
      try {
        const imgs = await api.getProductImages(productId)
        if (!active) return
        setExistingImages(imgs)
        setRemovedImageIds([])
        const primary = imgs.find((i) => i.is_primary) ?? imgs[0]
        if (primary) setPrimaryKey(primary.image_id)
        else setPrimaryKey('')
      } catch {
        // ignore
      }
    })()
    return () => {
      active = false
    }
  }, [productId])

  const MAX_IMAGES = 5
  const visibleExisting = existingImages.filter((e) => !removedImageIds.includes(e.image_id))
  const totalImages = visibleExisting.length + newImages.length

  function makeNewKey() {
    return `new-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  }

  function patch(update: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...update }))
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow access to photos to add product images.')
      return
    }
    const remaining = MAX_IMAGES - totalImages
    if (remaining <= 0) return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    })
    if (result.canceled) return
    const picked = result.assets.map((a, i) => ({
      key: makeNewKey(),
      uri: a.uri,
      name: a.fileName ?? `image-${Date.now()}-${i}.jpg`,
      type: a.mimeType ?? 'image/jpeg',
    }))
    setNewImages((prev) => [...prev, ...picked])
    if (!primaryKey) {
      const first = picked[0]
      if (first) setPrimaryKey(first.key)
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow access to the camera to take product photos.')
      return
    }
    const remaining = MAX_IMAGES - totalImages
    if (remaining <= 0) return
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (result.canceled) return
    const a = result.assets[0]
    if (!a) return
    const picked = {
      key: makeNewKey(),
      uri: a.uri,
      name: a.fileName ?? `photo-${Date.now()}.jpg`,
      type: a.mimeType ?? 'image/jpeg',
    }
    setNewImages((prev) => [...prev, picked])
    if (!primaryKey) setPrimaryKey(picked.key)
  }

  function removeExisting(id: string) {
    setRemovedImageIds((prev) => [...prev, id])
    if (primaryKey === id) {
      const next = visibleExisting.find((e) => e.image_id !== id) ?? newImages[0]
      if (next) {
        setPrimaryKey((next as any).image_id ?? (next as any).key)
      } else {
        setPrimaryKey('')
      }
    }
  }

  function removeNew(key: string) {
    setNewImages((prev) => prev.filter((n) => n.key !== key))
    if (primaryKey === key) {
      const next = newImages.find((n) => n.key !== key) ?? visibleExisting[0]
      if (next) {
        setPrimaryKey((next as any).image_id ?? (next as any).key)
      } else {
        setPrimaryKey('')
      }
    }
  }

  async function syncImages(product: Product) {
    const prodId = product.product_id
    try {
      setSavingImages(true)
      for (const id of removedImageIds) {
        try {
          await api.deleteProductImage(id)
        } catch {
          // ignore
        }
      }
      let uploaded: api.ProductImage[] = []
      for (let i = 0; i < newImages.length; i += 1) {
        const img = newImages[i]
        const isPrimaryCandidate = primaryKey === img.key
        const up = await api.uploadProductImage(prodId, img, isPrimaryCandidate)
        uploaded.push(up)
      }
      const serverImages = await api.getProductImages(prodId)
      let chosenPrimaryId: string | null = null
      if (primaryKey) {
        if (primaryKey.startsWith('new-')) {
          const idx = newImages.findIndex((n) => n.key === primaryKey)
          if (idx >= 0 && uploaded[idx]) chosenPrimaryId = uploaded[idx].image_id
        } else {
          chosenPrimaryId = primaryKey
        }
      }
      if (!chosenPrimaryId && serverImages.length > 0) {
        chosenPrimaryId = serverImages.find((i) => i.is_primary)?.image_id ?? serverImages[0].image_id
      }
      if (chosenPrimaryId) {
        const currentPrimary = serverImages.find((i) => i.is_primary)?.image_id
        if (currentPrimary !== chosenPrimaryId) {
          try {
            await api.setProductImagePrimary(chosenPrimaryId)
          } catch {
            // ignore
          }
        }
      }
      setNewImages([])
      setRemovedImageIds([])
      const final = await api.getProductImages(prodId)
      setExistingImages(final)
      const p = final.find((i) => i.is_primary) ?? final[0]
      setPrimaryKey(p ? p.image_id : '')
    } catch (e) {
      throw e
    } finally {
      setSavingImages(false)
    }
  }

  async function handleSubmit() {
    setError(null)
    if (!form.sku.trim() || !form.product_name.trim() || !form.base_uom_id) {
      setError('SKU, product name and unit of measure are required.')
      return
    }
    if (!form.retail_price.trim() && !form.wholesale_price.trim()) {
      setError('A retail or wholesale price is required.')
      return
    }
    const input: ProductInput = {
      sku: form.sku.trim(),
      product_name: form.product_name.trim(),
      barcode: form.barcode.trim() || undefined,
      category_id: form.category_id || undefined,
      base_uom_id: form.base_uom_id,
      cost_price: toNumber(form.cost_price),
      retail_price: toNumber(form.retail_price),
      wholesale_price: toNumber(form.wholesale_price),
      wholesale_min_qty: toNumber(form.wholesale_min_qty),
      tax_rate: toNumber(form.tax_rate),
      discount_percentage: toNumber(form.discount_percentage),
      minimum_stock: toNumber(form.minimum_stock),
      description: form.description.trim() || undefined,
      track_inventory: form.track_inventory,
      expiry_required: form.expiry_required,
      serial_number_required: form.serial_number_required,
    }
    if (input.cost_price === undefined) delete (input as any).cost_price
    if (input.retail_price === undefined) delete (input as any).retail_price
    if (input.wholesale_price === undefined) delete (input as any).wholesale_price
    if (input.wholesale_min_qty === undefined) delete (input as any).wholesale_min_qty
    if (input.tax_rate === undefined) input.tax_rate = 0
    if (input.discount_percentage === undefined) input.discount_percentage = 0
    if (input.minimum_stock === undefined) input.minimum_stock = 0

    setSubmitting(true)
    try {
      const product = await onSubmit(input)
      await syncImages(product)
      onSaved(product)
    } catch (err: any) {
      const msg = api.isAxiosError(err)
        ? (err.response?.data?.errors?.[0]?.msg ??
            err.response?.data?.message ??
            err.response?.data?.error ??
            'Could not save the product.')
        : (err?.message ?? 'Could not save the product.')
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <BarcodeScanner
        visible={scannerOpen}
        onScanned={(d) => {
          setScannerOpen(false)
          patch({ barcode: d })
        }}
        onClose={() => setScannerOpen(false)}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.barcodeRow}>
          <View style={{ flex: 1 }}>
            <Field label="SKU *" value={form.sku} onChangeText={(v) => patch({ sku: v })} autoCapitalize="characters" />
          </View>
          <Pressable
            style={styles.iconBtn}
            onPress={() => patch({ sku: generateBarcode() })}
            accessibilityLabel="Generate SKU"
            accessibilityRole="button"
          >
            <Ionicons name="reload" size={20} color={colors.surface} />
          </Pressable>
        </View>
        <Field
          label="Product name *"
          value={form.product_name}
          onChangeText={(v) => patch({ product_name: v })}
        />
        <View style={styles.barcodeRow}>
          <View style={{ flex: 1 }}>
            <Field
              label="Barcode"
              value={form.barcode}
              onChangeText={(v) => patch({ barcode: v })}
              autoCapitalize="characters"
              placeholder="Leave blank to auto-generate"
            />
          </View>
          <Pressable
            style={styles.iconBtn}
            onPress={() => patch({ barcode: generateBarcode() })}
            accessibilityLabel="Generate barcode"
            accessibilityRole="button"
          >
            <Ionicons name="reload" size={20} color={colors.surface} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => setScannerOpen(true)}
            accessibilityLabel="Scan barcode"
            accessibilityRole="button"
          >
            <Ionicons name="camera" size={20} color={colors.surface} />
          </Pressable>
        </View>
        <Field
          label="Description"
          value={form.description}
          onChangeText={(v) => patch({ description: v })}
          multiline
        />

        <ChipSelect
          label="Category"
          value={form.category_id}
          onChange={(v) => patch({ category_id: v })}
          options={[
            { value: '', label: 'None' },
            ...categories.map((c) => ({ value: c.category_id, label: c.category_name })),
          ]}
        />

        <ChipSelect
          label="Unit of measure *"
          value={form.base_uom_id}
          onChange={(v) => patch({ base_uom_id: v })}
          options={uoms.map((u) => ({ value: u.uom_id, label: u.uom_name }))}
        />

        <View style={styles.grid}>
          <Field
            label="Cost price"
            value={form.cost_price}
            onChangeText={(v) => patch({ cost_price: v })}
            keyboardType="decimal-pad"
            half
          />
          <Field
            label="Retail price"
            value={form.retail_price}
            onChangeText={(v) => patch({ retail_price: v })}
            keyboardType="decimal-pad"
            half
          />
        </View>
        <View style={styles.grid}>
          <Field
            label="Wholesale price"
            value={form.wholesale_price}
            onChangeText={(v) => patch({ wholesale_price: v })}
            keyboardType="decimal-pad"
            half
          />
          <Field
            label="Wholesale min qty"
            value={form.wholesale_min_qty}
            onChangeText={(v) => patch({ wholesale_min_qty: v })}
            keyboardType="numeric"
            half
          />
        </View>
        <View style={styles.grid}>
          <Field
            label="Tax rate %"
            value={form.tax_rate}
            onChangeText={(v) => patch({ tax_rate: v })}
            keyboardType="decimal-pad"
            half
          />
          <Field
            label="Discount %"
            value={form.discount_percentage}
            onChangeText={(v) => patch({ discount_percentage: v })}
            keyboardType="decimal-pad"
            half
          />
        </View>
        <Field
          label="Minimum stock"
          value={form.minimum_stock}
          onChangeText={(v) => patch({ minimum_stock: v })}
          keyboardType="numeric"
        />

        <Toggle label="Track inventory" value={form.track_inventory} onChange={(v) => patch({ track_inventory: v })} />
        <Toggle
          label="Expiry date required on stock-in"
          value={form.expiry_required}
          onChange={(v) => patch({ expiry_required: v })}
        />
        <Toggle label="Serial number required" value={form.serial_number_required} onChange={(v) => patch({ serial_number_required: v })} />

        <Text style={styles.sectionLabel}>Images ({totalImages}/{MAX_IMAGES})</Text>
        <View style={styles.imageGrid}>
          {visibleExisting.map((img) => {
            const key = img.image_id
            const isPrimary = primaryKey === key
            const src = api.resolveImageUrl(img.image_url)
            return (
              <View key={key} style={styles.imageTile}>
                <Image source={{ uri: src ?? '' }} style={styles.imageThumb} />
                {isPrimary ? <Text style={styles.primaryBadge}>PRIMARY</Text> : null}
                <View style={styles.imageActions}>
                  <Pressable style={styles.imageBtn} onPress={() => setPrimaryKey(key)}>
                    <Text style={styles.imageBtnText}>{isPrimary ? 'Primary' : 'Set Primary'}</Text>
                  </Pressable>
                  <Pressable style={[styles.imageBtn, styles.danger]} onPress={() => removeExisting(key)}>
                    <Text style={[styles.imageBtnText, styles.dangerText]}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            )
          })}
          {newImages.map((img) => {
            const key = img.key
            const isPrimary = primaryKey === key
            return (
              <View key={key} style={styles.imageTile}>
                <Image source={{ uri: img.uri }} style={styles.imageThumb} />
                {isPrimary ? <Text style={styles.primaryBadge}>PRIMARY</Text> : null}
                <View style={styles.imageActions}>
                  <Pressable style={styles.imageBtn} onPress={() => setPrimaryKey(key)}>
                    <Text style={styles.imageBtnText}>{isPrimary ? 'Primary' : 'Set Primary'}</Text>
                  </Pressable>
                  <Pressable style={[styles.imageBtn, styles.danger]} onPress={() => removeNew(key)}>
                    <Text style={[styles.imageBtnText, styles.dangerText]}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            )
          })}
        </View>
        {totalImages < MAX_IMAGES ? (
          <View style={styles.imageButtons}>
            <Pressable style={styles.smallBtnWide} onPress={() => void pickFromLibrary()}>
              <Text style={styles.smallBtnText}>Add from Gallery</Text>
            </Pressable>
            <Pressable style={styles.smallBtnWide} onPress={() => void takePhoto()}>
              <Text style={styles.smallBtnText}>Take Photo</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.submit, pressed && styles.submitPressed]}
          onPress={() => void handleSubmit()}
          disabled={submitting || savingImages}
        >
          {submitting || savingImages ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.submitText}>{submitLabel}</Text>
          )}
        </Pressable>
      </ScrollView>
    </>
  )
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  placeholder,
  multiline,
  half,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'email-address' | 'phone-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  placeholder?: string
  multiline?: boolean
  half?: boolean
}) {
  return (
    <View style={[styles.field, half && styles.half]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  )
}

function ChipSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {options.length === 0 ? (
        <Text style={styles.emptyOptions}>No options available.</Text>
      ) : (
        <View style={styles.chipWrap}>
          {options.map((option) => {
            const active = value === option.value
            return (
              <Pressable
                key={option.value || 'none'}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onChange(option.value)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  field: { marginBottom: spacing.md },
  half: { flex: 1 },
  grid: { flexDirection: 'row', gap: spacing.md },
  label: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xs },
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
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  emptyOptions: { fontSize: fontSize.sm, color: colors.textMuted },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  toggleLabel: { fontSize: fontSize.md, color: colors.text, flex: 1, paddingRight: spacing.md },
  error: { color: colors.danger, fontSize: fontSize.sm, marginBottom: spacing.md },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitPressed: { opacity: 0.85 },
  submitText: { color: colors.surface, fontSize: fontSize.md, fontWeight: '700' },
  barcodeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.md },
  smallBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.md, justifyContent: 'center' },
  smallBtnText: { color: colors.surface, fontSize: fontSize.sm, fontWeight: '600' },
  smallBtnWide: { backgroundColor: colors.primary, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center', flex: 1 },
  iconBtn: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  sectionLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  imageTile: { width: '48%', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface },
  imageThumb: { width: '100%', height: 120 },
  primaryBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: colors.success, color: colors.surface, fontSize: 10, paddingHorizontal: 4, borderRadius: 4, fontWeight: '700' },
  imageActions: { padding: spacing.xs, gap: spacing.xs },
  imageBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.xs, alignItems: 'center' },
  imageBtnText: { fontSize: fontSize.sm },
  danger: { borderColor: colors.danger },
  dangerText: { color: colors.danger },
  imageButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
})
