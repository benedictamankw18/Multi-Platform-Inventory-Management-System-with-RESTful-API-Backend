import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import ConfirmModal from '../components/ConfirmModal'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import JsBarcode from 'jsbarcode'
import {
  searchProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  reactivateProduct,
  getCategories,
  getUnitsOfMeasure,
  getSuppliers,
  uploadProductImage,
  getProductImages,
  deleteProductImage,
  setProductImagePrimary,
  getInventory,
  resolveImageUrl,
  viewProduct,
  viewProductImages,
  type Product,
  type ProductImage,
  type Category,
  type UnitOfMeasure,
} from '../services/api'
import { printReceipt } from '../services/printService'

type ModalMode = 'create' | 'edit' | 'view' | 'import' | null

type Supplier = { supplier_id: string; supplier_name: string }

function generateBarcode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 13; i += 1) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

const emptyForm = {
  sku: '', product_name: '', description: '', barcode: '', brand: '', model: '', manufacturer: '',
  category_id: '', base_uom_id: '', supplier_id: '',
  cost_price: '', retail_price: '', wholesale_price: '', wholesale_uom_id: '', wholesale_conversion_factor: '', wholesale_min_qty: '',
  tax_rate: '', discount_percentage: '', minimum_stock: '', maximum_stock: '',
  weight: '', length: '', width: '', height: '',
  serial_number_required: false, expiry_required: false, track_inventory: true,
  branch_id: '', quantity_on_hand: '', reorder_level: '', reorder_quantity: '',
  reserved_quantity: '', damaged_quantity: '', expired_quantity: '', available_quantity: '',
}

export default function ProductsPage() {
  const { toast } = useToast()
  const { selectedBranch, hasPermission } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [showLabels, setShowLabels] = useState(false)
  const [labelSelection, setLabelSelection] = useState<Record<string, boolean>>({})
  const [labelCopies, setLabelCopies] = useState(1)
  const [labelSize, setLabelSize] = useState<'40x25' | '58x40'>('40x25')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [uoms, setUoms] = useState<UnitOfMeasure[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [modal, setModal] = useState<ModalMode>(null)
  const [editing, setEditing] = useState<Product | null>(null)
  const [viewing, setViewing] = useState<Product | null>(null)
  const [viewImages, setViewImages] = useState<ProductImage[]>([])
  const [confirmTarget, setConfirmTarget] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [newImages, setNewImages] = useState<{ file: File; preview: string }[]>([])
  const [existingImages, setExistingImages] = useState<ProductImage[]>([])
  const [primaryIdx, setPrimaryIdx] = useState(0)
  const [prevPrimaryId, setPrevPrimaryId] = useState<string | null>(null)
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([])
  const [importFileName, setImportFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)
  const [importFailures, setImportFailures] = useState<{ row: number; sku: string; reason: string }[]>([])
  const [importDone, setImportDone] = useState(0)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const [showImportMenu, setShowImportMenu] = useState(false)
  const importMenuRef = useRef<HTMLDivElement>(null)

  const limit = 25

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { page, limit, includeInactive: true }
      if (search) body.q = search
      if (selectedBranch) body.branchId = selectedBranch.branch_id
      const res = await searchProducts(body)
      setProducts(res.products ?? [])
      setTotal(res.total ?? 0)
    } catch {
      setProducts([])
      setTotal(0)
    }
    setLoading(false)
  }, [page, search, selectedBranch])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false)
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) setShowImportMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (lightboxIndex === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowLeft') setLightboxIndex((prev) => prev !== null && prev > 0 ? prev - 1 : prev)
      if (e.key === 'ArrowRight') setLightboxIndex((prev) => prev !== null && prev < viewImages.length - 1 ? prev + 1 : prev)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, viewImages.length])

  useEffect(() => {
    getCategories().then((d) => setCategories(Array.isArray(d) ? d : d?.categories ?? [])).catch(() => {})
    getUnitsOfMeasure().then((d) => setUoms(Array.isArray(d) ? d : d?.data ?? d?.uoms ?? [])).catch(() => {})
    getSuppliers().then((d) => setSuppliers(Array.isArray(d) ? d : d?.data ?? d?.suppliers ?? [])).catch(() => {})
  }, [])

  const catMap = Object.fromEntries(categories.map((c: Category) => [c.category_id, c.category_name]))
  const uomMap = Object.fromEntries(uoms.map((u: UnitOfMeasure) => [u.uom_id, u.abbreviation || u.uom_name]))
  const supMap = Object.fromEntries(suppliers.map((s: Supplier) => [s.supplier_id, s.supplier_name]))

  function set<K extends keyof typeof emptyForm>(key: K, val: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, branch_id: selectedBranch?.branch_id ?? '' })
    setFormError('')
    setNewImages([])
    setExistingImages([])
    setPrimaryIdx(0)
    setPrevPrimaryId(null)
    setImagesToDelete([])
    setModal('create')
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      sku: p.sku ?? '', product_name: p.product_name ?? '', description: p.description ?? '',
      barcode: p.barcode ?? '', brand: p.brand ?? '', model: p.model ?? '',
      manufacturer: p.manufacturer ?? '',
      category_id: p.category_id ?? '', base_uom_id: p.base_uom_id ?? '', supplier_id: p.supplier_id ?? '',
      cost_price: p.cost_price != null ? String(p.cost_price) : '',
      retail_price: p.retail_price != null ? String(p.retail_price) : '',
      wholesale_price: p.wholesale_price != null ? String(p.wholesale_price) : '',
      wholesale_uom_id: p.wholesale_uom_id ?? '',
      wholesale_conversion_factor: p.wholesale_conversion_factor != null ? String(p.wholesale_conversion_factor) : '',
      wholesale_min_qty: p.wholesale_min_qty != null ? String(p.wholesale_min_qty) : '',
      tax_rate: p.tax_rate != null ? String(p.tax_rate) : '',
      discount_percentage: p.discount_percentage != null ? String(p.discount_percentage) : '',
      minimum_stock: p.minimum_stock != null ? String(p.minimum_stock) : '',
      maximum_stock: p.maximum_stock != null ? String(p.maximum_stock) : '',
      weight: p.weight != null ? String(p.weight) : '',
      length: p.length != null ? String(p.length) : '',
      width: p.width != null ? String(p.width) : '',
      height: p.height != null ? String(p.height) : '',
      serial_number_required: p.serial_number_required ?? false,
      expiry_required: p.expiry_required ?? false,
      track_inventory: p.track_inventory ?? true,
      branch_id: selectedBranch?.branch_id ?? '',
      quantity_on_hand: '',
      reorder_level: '',
      reorder_quantity: '',
      reserved_quantity: '',
      damaged_quantity: '',
      expired_quantity: '',
      available_quantity: '',
    })
    setFormError('')
    setNewImages([])
    setExistingImages([])
    setImagesToDelete([])
    setModal('edit')
    getProductImages(p.product_id).then((imgs) => {
      setExistingImages(imgs)
      const primIdx = imgs.findIndex((i) => i.is_primary)
      setPrimaryIdx(primIdx >= 0 ? primIdx : 0)
      setPrevPrimaryId(primIdx >= 0 ? imgs[primIdx].image_id : null)
    }).catch(() => {})
    getInventory({ productId: p.product_id }).then((res) => {
      const data = Array.isArray(res) ? res : res?.data ?? []
      if (data.length > 0) {
        const inv = data[0]
        setForm((f) => ({
          ...f,
          branch_id: inv.branch_id ?? '',
          quantity_on_hand: inv.quantity_on_hand != null ? String(inv.quantity_on_hand) : '',
          reorder_level: inv.reorder_level != null ? String(inv.reorder_level) : '',
          reorder_quantity: inv.reorder_quantity != null ? String(inv.reorder_quantity) : '',
          reserved_quantity: inv.reserved_quantity != null ? String(inv.reserved_quantity) : '',
          damaged_quantity: inv.damaged_quantity != null ? String(inv.damaged_quantity) : '',
          expired_quantity: inv.expired_quantity != null ? String(inv.expired_quantity) : '',
          available_quantity: inv.available_quantity != null ? String(inv.available_quantity) : '',
        }))
      }
    }).catch(() => {})
  }

  async function openView(p: Product) {
    setViewing(null)
    setViewImages([])
    setModal('view')
    try {
      const prod = await viewProduct(p.product_id)
      setViewing(prod)
      const imgs = await viewProductImages(p.product_id)
      setViewImages(imgs)
    } catch {
      setViewing(p)
    }
  }

  function num(v: string) { return v !== '' ? Number(v) : undefined }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.sku.trim() || !form.product_name.trim() || !form.base_uom_id) {
      setFormError('SKU, product name and UoM are required.')
      return
    }
    if (form.retail_price.trim() === '' && form.wholesale_price.trim() === '') {
      setFormError('Retail price or wholesale price is required.')
      return
    }
    setFormError('')
    try {
      const body: Record<string, unknown> = {
        sku: form.sku.trim(),
        product_name: form.product_name.trim(),
        cost_price: num(form.cost_price) ?? 0,
        retail_price: num(form.retail_price),
        wholesale_price: num(form.wholesale_price),
        description: form.description || undefined,
        barcode: form.barcode || undefined,
        brand: form.brand || undefined,
        model: form.model || undefined,
        manufacturer: form.manufacturer || undefined,
        tax_rate: num(form.tax_rate) ?? 0,
        discount_percentage: num(form.discount_percentage) ?? 0,
        minimum_stock: num(form.minimum_stock) ?? 0,
        maximum_stock: num(form.maximum_stock),
        weight: num(form.weight),
        length: num(form.length),
        width: num(form.width),
        height: num(form.height),
        serial_number_required: form.serial_number_required,
        expiry_required: form.expiry_required,
        track_inventory: form.track_inventory,
      }
      if (modal === 'create') {
        if (form.base_uom_id) body.base_uom_id = form.base_uom_id
        if (form.category_id) body.category_id = form.category_id
        if (form.supplier_id) body.supplier_id = form.supplier_id
        if (form.wholesale_uom_id) body.wholesale_uom_id = form.wholesale_uom_id
        if (form.wholesale_conversion_factor) body.wholesale_conversion_factor = num(form.wholesale_conversion_factor)
        if (form.wholesale_min_qty) body.wholesale_min_qty = num(form.wholesale_min_qty)
        if (form.branch_id) {
          body.branch_id = form.branch_id
          body.quantity = num(form.quantity_on_hand) ?? 0
          body.reorder_level = num(form.reorder_level) ?? 0
          body.reorder_quantity = num(form.reorder_quantity) ?? 0
          body.reserved_quantity = num(form.reserved_quantity)
          body.damaged_quantity = num(form.damaged_quantity)
          body.expired_quantity = num(form.expired_quantity)
          body.available_quantity = num(form.available_quantity)
        }
        const product = await createProduct(body)
        const existingCount = existingImages.length
        for (let i = 0; i < newImages.length; i++) {
          const isPrimary = existingCount + i === primaryIdx
          await uploadProductImage(product.product_id, newImages[i].file, isPrimary)
        }
      } else if (editing) {
        if (form.category_id) body.category_id = form.category_id
        if (form.supplier_id) body.supplier_id = form.supplier_id
        if (form.base_uom_id) body.base_uom_id = form.base_uom_id
        if (form.wholesale_uom_id) body.wholesale_uom_id = form.wholesale_uom_id
        if (form.wholesale_conversion_factor) body.wholesale_conversion_factor = num(form.wholesale_conversion_factor)
        if (form.wholesale_min_qty) body.wholesale_min_qty = num(form.wholesale_min_qty)
        if (form.branch_id) {
          body.branch_id = form.branch_id
          body.quantity = num(form.quantity_on_hand) ?? 0
          body.reorder_level = num(form.reorder_level) ?? 0
          body.reorder_quantity = num(form.reorder_quantity) ?? 0
          body.reserved_quantity = num(form.reserved_quantity)
          body.damaged_quantity = num(form.damaged_quantity)
          body.expired_quantity = num(form.expired_quantity)
          body.available_quantity = num(form.available_quantity)
        }
        await updateProduct(editing.product_id, body)
        if (prevPrimaryId) {
          const newPrimaryExistingIdx = primaryIdx < existingImages.length ? primaryIdx : -1
          const newPrimaryId = newPrimaryExistingIdx >= 0 ? existingImages[newPrimaryExistingIdx].image_id : null
          if (newPrimaryId && newPrimaryId !== prevPrimaryId) {
            await setProductImagePrimary(newPrimaryId)
          }
        }
        const existingCount = existingImages.length
        for (let i = 0; i < newImages.length; i++) {
          const isPrimary = existingCount + i === primaryIdx
          await uploadProductImage(editing.product_id, newImages[i].file, isPrimary)
        }
        for (const id of imagesToDelete) {
          await deleteProductImage(id)
        }
      }
      setModal(null)
      load()
      toast('Product saved successfully', 'success')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        (err as { response?: { data?: { message?: string; errors?: { msg?: string }[] } } }).response?.data?.errors?.[0]?.msg ??
        (err instanceof Error ? err.message : 'Save failed')
      setFormError(msg)
      toast(msg, 'error')
    }
  }

  async function handleToggle(p: Product) {
    setActionLoading(p.product_id)
    try {
      if (p.is_active) await deactivateProduct(p.product_id)
      else await reactivateProduct(p.product_id)
      load()
      toast(p.is_active ? 'Product deactivated' : 'Product activated', 'success')
    } catch {
      toast('Failed to update product status', 'error')
    }
    setActionLoading(null)
  }

  function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  const TEMPLATE_HEADERS = ['SKU', 'Product Name', 'Description', 'Barcode', 'Brand', 'Model', 'Manufacturer', 'Category', 'Supplier', 'Base UoM', 'Cost Price', 'Retail Price', 'Tax Rate', 'Minimum Stock', 'Maximum Stock', 'Weight', 'Length', 'Width', 'Height']

  const HEADER_MAP: Record<string, string> = {}
  for (const h of TEMPLATE_HEADERS) HEADER_MAP[h.toLowerCase()] = h

  function normalizeHeader(name: string): string {
    const lower = name.trim().toLowerCase()
    const map: Record<string, string> = {
      sku: 'SKU',
      'product name': 'Product Name',
      name: 'Product Name',
      description: 'Description',
      barcode: 'Barcode',
      brand: 'Brand',
      model: 'Model',
      manufacturer: 'Manufacturer',
      category: 'Category',
      supplier: 'Supplier',
      'base uom': 'Base UoM',
      uom: 'Base UoM',
      'cost price': 'Cost Price',
      cost: 'Cost Price',
      'retail price': 'Retail Price',
      retail: 'Retail Price',
      'tax rate': 'Tax Rate',
      tax: 'Tax Rate',
      'minimum stock': 'Minimum Stock',
      'min stock': 'Minimum Stock',
      'maximum stock': 'Maximum Stock',
      'max stock': 'Maximum Stock',
      weight: 'Weight',
      length: 'Length',
      width: 'Width',
      height: 'Height',
    }
    return map[lower] || name.trim()
  }

  async function handleFileImport(file: File) {
    setImportFileName(file.name)
    try {
      const buf = await readFileAsArrayBuffer(file)
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (!raw.length) {
        toast('File is empty', 'error')
        return
      }
      const normalized = raw.map((row) => {
        const out: Record<string, unknown> = {}
        for (const key of Object.keys(row)) {
          out[normalizeHeader(key)] = row[key]
        }
        return out
      })
      setImportRows(normalized)
      setImportFailures([])
      setImportDone(0)
      setModal('import')
    } catch {
      toast('Failed to parse file. Use XLSX or CSV.', 'error')
    }
  }

  async function confirmImport() {
    if (!importRows.length) return
    setImporting(true)
    setImportProgress({ done: 0, total: importRows.length })
    setImportFailures([])
    const failures: { row: number; sku: string; reason: string }[] = []
    let imported = 0
    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i]
      try {
        const body: Record<string, unknown> = {}
        if (row['SKU']) body.sku = String(row['SKU'])
        if (row['Product Name']) body.product_name = String(row['Product Name'])
        if (row['Description']) body.description = String(row['Description'])
        if (row['Barcode']) body.barcode = String(row['Barcode'])
        if (row['Brand']) body.brand = String(row['Brand'])
        if (row['Model']) body.model = String(row['Model'])
        if (row['Manufacturer']) body.manufacturer = String(row['Manufacturer'])
        if (row['Cost Price']) body.cost_price = Number(row['Cost Price']) || 0
        if (row['Retail Price']) body.retail_price = Number(row['Retail Price'])
        if (row['Tax Rate']) body.tax_rate = Number(row['Tax Rate']) || 0
        if (row['Minimum Stock']) body.minimum_stock = Number(row['Minimum Stock']) || 0
        if (row['Maximum Stock']) body.maximum_stock = Number(row['Maximum Stock'])
        if (row['Weight']) body.weight = Number(row['Weight'])
        if (row['Length']) body.length = Number(row['Length'])
        if (row['Width']) body.width = Number(row['Width'])
        if (row['Height']) body.height = Number(row['Height'])
        if (row['Category']) {
          const cat = categories.find((c) => c.category_name.toLowerCase() === String(row['Category']).toLowerCase())
          if (cat) body.category_id = cat.category_id
        }
        if (row['Supplier']) {
          const sup = suppliers.find((s) => s.supplier_name.toLowerCase() === String(row['Supplier']).toLowerCase())
          if (sup) body.supplier_id = sup.supplier_id
        }
        if (row['Base UoM']) {
          const uom = uoms.find((u) => (u.abbreviation || u.uom_name).toLowerCase() === String(row['Base UoM']).toLowerCase())
          if (uom) body.base_uom_id = uom.uom_id
        }
        if (selectedBranch?.branch_id) {
          body.branch_id = selectedBranch.branch_id
          body.quantity = 0
        }
        await createProduct(body)
        imported++
      } catch (err: unknown) {
        let reason = 'Unknown error'
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { data?: { message?: string } } }
          reason = axiosErr.response?.data?.message ?? 'Unknown error'
        } else if (err instanceof Error) {
          reason = err.message
        }
        failures.push({ row: i + 1, sku: String(row['SKU'] ?? `Row ${i + 1}`), reason })
      }
      setImportProgress({ done: i + 1, total: importRows.length })
    }
    setImporting(false)
    setImportProgress(null)
    setImportFailures(failures)
    setImportDone(imported)
    if (!failures.length) {
      setModal(null)
      load()
      toast(`${imported} product${imported !== 1 ? 's' : ''} imported`, 'success')
    } else {
      load()
      toast(`${imported} imported, ${failures.length} failed`, 'error')
    }
  }

  async function getExportData(): Promise<Record<string, unknown>[]> {
    try {
      const body: Record<string, unknown> = { page: 1, limit: 10000, includeInactive: true }
      if (search) body.q = search
      if (selectedBranch) body.branchId = selectedBranch.branch_id
      const res = await searchProducts(body)
      const allProducts = res.products ?? []
      return allProducts.map((p) => ({
        'SKU': p.sku,
        'Product Name': p.product_name,
        'Description': p.description ?? '',
        'Barcode': p.barcode ?? '',
        'Brand': p.brand ?? '',
        'Model': p.model ?? '',
        'Manufacturer': p.manufacturer ?? '',
        'Category': catMap[p.category_id ?? ''] || '',
        'Supplier': supMap[p.supplier_id ?? ''] || '',
        'Base UoM': uomMap[p.base_uom_id] || '',
        'Cost Price': p.cost_price,
        'Retail Price': p.retail_price,
        'Tax Rate': p.tax_rate,
        'Minimum Stock': p.minimum_stock,
        'Maximum Stock': p.maximum_stock ?? '',
        'Weight': p.weight ?? '',
        'Length': p.length ?? '',
        'Width': p.width ?? '',
        'Height': p.height ?? '',
      }))
    } catch {
      return []
    }
  }

  async function exportXLSX() {
    const data = await getExportData()
    if (!data.length) { toast('No data to export', 'error'); return }
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Products')
    XLSX.writeFile(wb, `products_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
    setShowExportMenu(false)
    toast(`${data.length} products exported as XLSX`, 'success')
  }

  async function exportCSV() {
    const data = await getExportData()
    if (!data.length) { toast('No data to export', 'error'); return }
    const ws = XLSX.utils.json_to_sheet(data)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products_export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
    toast(`${data.length} products exported as CSV`, 'success')
  }

  async function exportPDF() {
    const data = await getExportData()
    if (!data.length) { toast('No data to export', 'error'); return }
    const headers = Object.keys(data[0] || {})
    const rows = data.map((r) => headers.map((h) => String(r[h] ?? '')))
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFontSize(10)
    doc.text('Products Export', 14, 12)
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 18,
      styles: { fontSize: 6 },
      headStyles: { fillColor: [37, 99, 235] },
    })
    doc.save(`products_export_${new Date().toISOString().slice(0, 10)}.pdf`)
    setShowExportMenu(false)
    toast(`${data.length} products exported as PDF`, 'success')
  }

  function downloadTemplate() {
    const example: Record<string, unknown> = {}
    for (const h of TEMPLATE_HEADERS) example[h] = ''
    example['SKU'] = 'PRD-001'
    example['Product Name'] = 'Example Product'
    example['Cost Price'] = 10.00
    example['Retail Price'] = 24.99
    example['Category'] = 'Electronics'
    const ws = XLSX.utils.json_to_sheet([example])
    XLSX.utils.sheet_add_aoa(ws, [TEMPLATE_HEADERS], { origin: 'A1' })
    XLSX.utils.sheet_add_json(ws, [example], { origin: 'A2', skipHeader: true })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'product_import_template.xlsx')
    toast('Template downloaded', 'success')
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  function closeModal() {
    newImages.forEach((img) => URL.revokeObjectURL(img.preview))
    setModal(null)
    setViewing(null)
    setViewImages([])
    setLightboxIndex(null)
  }

  function openLabels() {
    const sel: Record<string, boolean> = {}
    products.forEach((p) => { if (p.barcode) sel[p.product_id] = true })
    setLabelSelection(sel)
    setLabelCopies(1)
    setShowLabels(true)
  }

  function toggleLabel(id: string) {
    setLabelSelection((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleAllLabels() {
    const withBarcode = products.filter((p) => p.barcode)
    const allSelected = withBarcode.length > 0 && withBarcode.every((p) => labelSelection[p.product_id])
    const next: Record<string, boolean> = { ...labelSelection }
    withBarcode.forEach((p) => { next[p.product_id] = !allSelected })
    setLabelSelection(next)
  }

  const selectedForLabels = products.filter((p) => labelSelection[p.product_id] && p.barcode)

  function printLabels() {
    const selected = selectedForLabels
    if (selected.length === 0) {
      toast('Select at least one product with a barcode.', 'error')
      return
    }
    const copies = Math.min(Math.max(labelCopies, 1), 100)
    const sheet = document.createElement('div')
    sheet.className = 'label-print-sheet'
    for (const p of selected) {
      for (let i = 0; i < copies; i++) {
        const cell = document.createElement('div')
        cell.className = `label label--${labelSize}`
        const name = document.createElement('div')
        name.className = 'label-name'
        name.textContent = p.product_name
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        cell.appendChild(name)
        cell.appendChild(svg)
        sheet.appendChild(cell)
        try {
          JsBarcode(svg, String(p.barcode), {
            format: 'CODE128',
            displayValue: true,
            fontSize: 12,
            width: 2,
            height: 40,
            margin: 2,
          })
        } catch { /* invalid barcode value — skip */ }
      }
    }
    document.body.appendChild(sheet)
    const cleanup = () => { if (sheet.parentNode) sheet.parentNode.removeChild(sheet) }
    window.addEventListener('afterprint', cleanup, { once: true })
    setTimeout(() => {
      void printReceipt().finally(cleanup)
    }, 50)
  }

  const Section = ({ title }: { title: string }) => (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
      <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p className="page-subtitle">{total} product{total !== 1 ? 's' : ''} total</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          {hasPermission('IMPORT_PRODUCTS') && (
          <div ref={importMenuRef} style={{ position: 'relative' }}>
            <button type="button" className="btn btn--ghost" onClick={() => setShowImportMenu(!showImportMenu)}>Import</button>
            {showImportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-lg)', zIndex: 20, minWidth: 180, overflow: 'hidden' }}>
                <label style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
                  Import XLSX / CSV
                  <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setShowImportMenu(false); handleFileImport(f) }; e.target.value = '' }} />
                </label>
              </div>
            )}
          </div>
          )}
          {hasPermission('EXPORT_PRODUCTS') && (
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button type="button" className="btn btn--ghost" onClick={() => setShowExportMenu(!showExportMenu)}>Export</button>
            {showExportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-lg)', zIndex: 20, minWidth: 180, overflow: 'hidden' }}>
                <button type="button" style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2) var(--space-4)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }} onClick={exportXLSX}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  Export XLSX
                </button>
                <button type="button" style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2) var(--space-4)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }} onClick={exportCSV}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                  Export CSV
                </button>
                <button type="button" style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2) var(--space-4)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }} onClick={exportPDF}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  Export PDF
                </button>
                <div style={{ borderTop: '1px solid var(--border)' }} />
                <button type="button" style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2) var(--space-4)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }} onClick={() => { downloadTemplate(); setShowExportMenu(false) }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Download Template
                </button>
              </div>
            )}
          </div>
          )}
          {hasPermission('EXPORT_PRODUCTS') && (
          <button type="button" className="btn btn--ghost" onClick={openLabels}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: '-2px' }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12h6m-3-3v6" /><path d="M3 9h18M3 15h18" /></svg>
            Print Labels
          </button>
          )}
          {hasPermission('CREATE_PRODUCT') && (
          <button type="button" className="btn btn--primary" onClick={openCreate}>+ Add Product</button>
          )}
        </div>
      </div>

      <div className="glass-card">
        <div className="search-input" style={{ marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input type="text" data-scan="true" placeholder="Search by name, SKU, or barcode..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>SKU</th>
                <th>Name</th>
                <th>Brand</th>
                <th>Category</th>
                <th>UoM</th>
                <th style={{ textAlign: 'right' }}>Retail</th>
                <th style={{ textAlign: 'right' }}>Cost</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading"><td colSpan={10}><div className="empty-state"><div className="skeleton skeleton--row" /></div></td></tr>
              ) : products.length === 0 ? (
                <tr key="empty"><td colSpan={10}><div className="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: 0.35, marginBottom: 8 }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12h6m-3-3v6" /><path d="M3 9h18M3 15h18" /></svg><p>No products yet.</p>{hasPermission('CREATE_PRODUCT') && <button type="button" className="btn btn--primary" style={{ marginTop: 8 }} onClick={openCreate}>Add Product</button>}</div></td></tr>
              ) : products.map((p) => (
                <tr key={p.product_id} style={{ opacity: p.is_active ? 1 : 0.5 }}>
                  <td>
                    {p.primary_image_url ? (
                      <img src={resolveImageUrl(p.primary_image_url) ?? undefined} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-button)', border: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                      </div>
                    )}
                  </td>
                  <td><strong>{p.sku}</strong></td>
                  <td>{p.product_name}</td>
                  <td>{p.brand || '—'}</td>
                  <td>{p.category_id ? (catMap[p.category_id] ?? '—') : '—'}</td>
                  <td>{uomMap[p.base_uom_id] ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>{p.retail_price != null ? Number(p.retail_price).toFixed(2) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{p.cost_price != null ? Number(p.cost_price).toFixed(2) : '—'}</td>
                  <td><span className={`badge ${p.is_active ? 'badge--success' : 'badge--danger'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openView(p)}>View</button>
                      <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openEdit(p)}>Edit</button>
                      <button type="button" className={`btn ${p.is_active ? 'btn--danger' : 'btn--primary'}`} style={{ padding: '4px 10px', fontSize: 13 }} disabled={actionLoading === p.product_id} onClick={() => p.is_active ? setConfirmTarget(p) : handleToggle(p)}>
                        {actionLoading === p.product_id ? '...' : p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ color: 'var(--secondary)', fontSize: 'var(--text-caption)' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button type="button" className="btn btn--ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ---- View Modal ---- */}
      {modal === 'view' && viewing && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 720, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)', fontWeight: 500 }}>{viewing.sku}</span>
                <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{viewing.product_name}</h3>
              </div>
              <button type="button" className="btn btn--ghost" onClick={closeModal} style={{ flexShrink: 0 }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: 'var(--space-6)', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
              {/* Image + Key Info row */}
              <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
                {/* Image gallery */}
                <div>
                  {viewImages.length > 0 ? (
                    <>
                      <div
                        style={{ width: 240, height: 240, borderRadius: 'var(--radius-card)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-2)' }}
                        onClick={() => setLightboxIndex(0)}
                      >
                        <img src={resolveImageUrl(viewImages[0].image_url) ?? undefined} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      {viewImages.length > 1 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {viewImages.map((img, i) => (
                            <img
                              key={img.image_id}
                              src={resolveImageUrl(img.image_url) ?? undefined}
                              alt=""
                              onClick={() => setLightboxIndex(i)}
                              style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 'var(--radius-button)', cursor: 'pointer', border: img.is_primary ? '2px solid var(--primary)' : '1px solid var(--border)', opacity: i === 0 ? 1 : 0.7 }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = i === 0 ? '1' : '0.7' }}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ width: 240, height: 240, borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)', fontSize: 'var(--text-caption)' }}>No image</div>
                  )}
                </div>

                {/* Key info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3) var(--space-4)', alignContent: 'start' }}>
                  <div><span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Status</span><div><span className={`badge ${viewing.is_active ? 'badge--success' : 'badge--danger'}`}>{viewing.is_active ? 'Active' : 'Inactive'}</span></div></div>
                  <div><span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Retail Price</span><div style={{ fontWeight: 600, fontSize: 'var(--text-h5)' }}>{viewing.retail_price != null ? `$${Number(viewing.retail_price).toFixed(2)}` : '—'}</div></div>
                  <div><span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Cost Price</span><div>{viewing.cost_price != null ? `$${Number(viewing.cost_price).toFixed(2)}` : '—'}</div></div>
                  <div><span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Tax Rate</span><div>{viewing.tax_rate != null ? `${viewing.tax_rate}%` : '—'}</div></div>
                  <div><span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Category</span><div>{catMap[viewing.category_id ?? ''] || '—'}</div></div>
                  <div><span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>UoM</span><div>{uomMap[viewing.base_uom_id ?? ''] || '—'}</div></div>
                  <div><span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Brand</span><div>{viewing.brand || '—'}</div></div>
                  <div><span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Model</span><div>{viewing.model || '—'}</div></div>
                </div>
              </div>

              {/* Details grid */}
              <Section title="Details" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Supplier</span>
                  <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>{viewing.supplier_id ? supMap[viewing.supplier_id] ?? '—' : '—'}</div>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Min Stock</span>
                  <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>{viewing.minimum_stock ?? 0}</div>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Max Stock</span>
                  <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>{viewing.maximum_stock ?? '—'}</div>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Track Inventory</span>
                  <div style={{ marginTop: 2 }}><span className={`badge ${viewing.track_inventory ? 'badge--success' : 'badge--warning'}`}>{viewing.track_inventory ? 'Yes' : 'No'}</span></div>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Serial #</span>
                  <div style={{ marginTop: 2 }}><span className={`badge ${viewing.serial_number_required ? 'badge--info' : 'badge--warning'}`}>{viewing.serial_number_required ? 'Required' : 'No'}</span></div>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Expiry</span>
                  <div style={{ marginTop: 2 }}><span className={`badge ${viewing.expiry_required ? 'badge--info' : 'badge--warning'}`}>{viewing.expiry_required ? 'Required' : 'No'}</span></div>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Weight</span>
                  <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>{viewing.weight != null ? `${viewing.weight} kg` : '—'}</div>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Dimensions</span>
                  <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>
                    {viewing.length || viewing.width || viewing.height
                      ? `${viewing.length || '?'} × ${viewing.width || '?'} × ${viewing.height || '?'} cm`
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Description */}
              {viewing.description && (
                <>
                  <Section title="Description" />
                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-body)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{viewing.description}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Image Lightbox ---- */}
      {lightboxIndex !== null && viewImages.length > 0 && (
        <div
          className="modal-overlay"
          style={{ background: 'rgba(0,0,0,0.85)', zIndex: 200 }}
          onClick={() => setLightboxIndex(null)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxIndex(null)
            if (e.key === 'ArrowLeft') setLightboxIndex((prev) => prev !== null && prev > 0 ? prev - 1 : prev)
            if (e.key === 'ArrowRight') setLightboxIndex((prev) => prev !== null && prev < viewImages.length - 1 ? prev + 1 : prev)
          }}
        >
          {/* Counter */}
          <span style={{ position: 'fixed', top: 'var(--space-5)', left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: 'var(--text-body)', background: 'rgba(0,0,0,0.5)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-badge)' }}>
            {lightboxIndex + 1} / {viewImages.length}
          </span>

          {/* Close button */}
          <button
            type="button"
            style={{ position: 'fixed', top: 'var(--space-5)', right: 'var(--space-5)', width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null) }}
          >✕</button>

          {/* Prev arrow */}
          {lightboxIndex > 0 && (
            <button
              type="button"
              style={{ position: 'fixed', top: '50%', left: 'var(--space-5)', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1) }}
            >‹</button>
          )}

          {/* Next arrow */}
          {lightboxIndex < viewImages.length - 1 && (
            <button
              type="button"
              style={{ position: 'fixed', top: '50%', right: 'var(--space-5)', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1) }}
            >›</button>
          )}

          {/* Image */}
          <img
            src={resolveImageUrl(viewImages[lightboxIndex].image_url) ?? undefined}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '85vw', maxHeight: '85vh', borderRadius: 'var(--radius-card)', objectFit: 'contain', boxShadow: '0 8px 48px rgba(0,0,0,0.4)' }}
          />
        </div>
      )}

      {/* ---- Create / Edit Modal ---- */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 560, textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>{modal === 'create' ? 'Add Product' : 'Edit Product'}</h3>

            {formError && <div className="auth-feedback auth-feedback--error" style={{ marginBottom: 12 }}>{formError}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* -- Basic Info -- */}
              <div className="field">
                <span>SKU *</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="e.g. PRD-001" style={{ flex: 1 }} />
                  <button type="button" className="btn btn--ghost" style={{ flexShrink: 0, whiteSpace: 'nowrap' }} onClick={() => set('sku', `PRD-${Math.random().toString(16).slice(2, 10).toUpperCase()}`)}>Generate</button>
                </div>
              </div>
              <div className="field">
                <span>Product Name *</span>
                <input value={form.product_name} onChange={(e) => set('product_name', e.target.value)} placeholder="e.g. Widget Pro" />
              </div>
              <div className="field">
                <span>Description</span>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional product description" rows={3} />
              </div>

              {/* -- Image -- */}
              <Section title={`Images (${existingImages.length + newImages.length} / 5)`} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {existingImages.map((img, i) => (
                  <div key={img.image_id} style={{ position: 'relative', width: 80 }}>
                    <img
                      src={resolveImageUrl(img.image_url) ?? undefined}
                      alt=""
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-button)', border: primaryIdx === i ? '2px solid var(--primary)' : '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => setPrimaryIdx(i)}
                    />
                    <input type="radio" name="primary" checked={primaryIdx === i} onChange={() => setPrimaryIdx(i)} style={{ position: 'absolute', bottom: 2, right: 2 }} />
                    <button
                      type="button"
                      style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'var(--danger, #ef4444)', color: '#fff', fontSize: 12, lineHeight: '20px', textAlign: 'center', cursor: 'pointer', padding: 0 }}
                      onClick={() => {
                        setImagesToDelete((prev) => [...prev, img.image_id])
                        setExistingImages((prev) => prev.filter((_, j) => j !== i))
                        if (primaryIdx === i) setPrimaryIdx(0)
                        else if (primaryIdx > i) setPrimaryIdx((p) => p - 1)
                      }}
                    >×</button>
                  </div>
                ))}
                {newImages.map((img, i) => {
                  const idx = existingImages.length + i
                  return (
                    <div key={img.preview} style={{ position: 'relative', width: 80 }}>
                      <img
                        src={img.preview}
                        alt=""
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-button)', border: primaryIdx === idx ? '2px solid var(--primary)' : '1px solid var(--border)', cursor: 'pointer' }}
                        onClick={() => setPrimaryIdx(idx)}
                      />
                      <input type="radio" name="primary" checked={primaryIdx === idx} onChange={() => setPrimaryIdx(idx)} style={{ position: 'absolute', bottom: 2, right: 2 }} />
                      <button
                        type="button"
                        style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'var(--danger, #ef4444)', color: '#fff', fontSize: 12, lineHeight: '20px', textAlign: 'center', cursor: 'pointer', padding: 0 }}
                        onClick={() => {
                          URL.revokeObjectURL(img.preview)
                          setNewImages((prev) => prev.filter((_, j) => j !== i))
                          if (primaryIdx === idx) setPrimaryIdx(0)
                          else if (primaryIdx > idx) setPrimaryIdx((p) => p - 1)
                        }}
                      >×</button>
                    </div>
                  )
                })}
                {existingImages.length + newImages.length < 5 && (
                  <label style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', borderRadius: 'var(--radius-button)', cursor: 'pointer', color: 'var(--secondary)', fontSize: 24 }}>
                    +
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast('Image must be under 5MB', 'error')
                          } else {
                            setNewImages((prev) => [...prev, { file, preview: URL.createObjectURL(file) }])
                          }
                        }
                        e.target.value = ''
                      }}
                    />
                  </label>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                <div className="field"><span>Barcode</span>
                  <div style={{ position: 'relative' }}>
                    <input value={form.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="Optional" style={{ paddingRight: 34 }} />
                    <button
                      type="button"
                      title="Generate barcode"
                      onClick={() => set('barcode', generateBarcode())}
                      style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 'var(--radius-button)', padding: 0 }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10" /><path d="M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
                    </button>
                  </div>
                </div>
                <div className="field"><span>Brand</span><input value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Optional" /></div>
                <div className="field"><span>Model</span><input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="Optional" /></div>
              </div>
              <div className="field">
                <span>Manufacturer</span>
                <input value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} placeholder="Optional" />
              </div>

              {/* -- Relationships -- */}
              <Section title="Category / Supplier / UoM" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                <div className="field">
                  <span>Category</span>
                  <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
                    <option value="">None</option>
                    {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <span>Supplier</span>
                  <select value={form.supplier_id} onChange={(e) => set('supplier_id', e.target.value)}>
                    <option value="">None</option>
                    {suppliers.map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <span>Base UoM {modal === 'create' && '*'}</span>
                  <select value={form.base_uom_id} onChange={(e) => set('base_uom_id', e.target.value)}>
                    <option value="">Select...</option>
                    {uoms.map((u) => <option key={u.uom_id} value={u.uom_id}>{u.abbreviation || u.uom_name}</option>)}
                  </select>
                </div>
              </div>

              {/* -- Pricing -- */}
              <Section title="Pricing" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                <div className="field"><span>Cost Price</span><input type="number" step="0.01" min="0" value={form.cost_price} onChange={(e) => set('cost_price', e.target.value)} placeholder="0.00" /></div>
                <div className="field"><span>Retail Price</span><input type="number" step="0.01" min="0" value={form.retail_price} onChange={(e) => set('retail_price', e.target.value)} placeholder="0.00" /></div>
                <div className="field"><span>Wholesale Price</span><input type="number" step="0.01" min="0" value={form.wholesale_price} onChange={(e) => set('wholesale_price', e.target.value)} placeholder="0.00" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                <div className="field">
                  <span>Wholesale UoM</span>
                  <select value={form.wholesale_uom_id} onChange={(e) => set('wholesale_uom_id', e.target.value)}>
                    <option value="">None</option>
                    {uoms.map((u) => <option key={u.uom_id} value={u.uom_id}>{u.abbreviation || u.uom_name}</option>)}
                  </select>
                </div>
                <div className="field"><span>Conversion Factor</span><input type="number" step="0.01" min="0" value={form.wholesale_conversion_factor} onChange={(e) => set('wholesale_conversion_factor', e.target.value)} placeholder="e.g. 12" /></div>
                <div className="field"><span>Wholesale Min Qty</span><input type="number" step="0.01" min="0" value={form.wholesale_min_qty} onChange={(e) => set('wholesale_min_qty', e.target.value)} placeholder="e.g. 6" /></div>
              </div>

              {/* -- Tax & Discount -- */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field"><span>Tax Rate %</span><input type="number" step="0.01" min="0" max="100" value={form.tax_rate} onChange={(e) => set('tax_rate', e.target.value)} placeholder="0" /></div>
                <div className="field"><span>Discount %</span><input type="number" step="0.01" min="0" max="100" value={form.discount_percentage} onChange={(e) => set('discount_percentage', e.target.value)} placeholder="0" /></div>
              </div>

              {/* -- Inventory -- */}
              <Section title="Inventory" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field"><span>Minimum Stock</span><input type="number" step="0.01" min="0" value={form.minimum_stock} onChange={(e) => set('minimum_stock', e.target.value)} placeholder="0" /></div>
                <div className="field"><span>Maximum Stock</span><input type="number" step="0.01" min="0" value={form.maximum_stock} onChange={(e) => set('maximum_stock', e.target.value)} placeholder="Optional" /></div>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <label className="checkbox-field"><input type="checkbox" checked={form.track_inventory} onChange={(e) => set('track_inventory', e.target.checked)} /> Track inventory</label>
                <label className="checkbox-field"><input type="checkbox" checked={form.serial_number_required} onChange={(e) => set('serial_number_required', e.target.checked)} /> Serial number required</label>
                <label className="checkbox-field"><input type="checkbox" checked={form.expiry_required} onChange={(e) => set('expiry_required', e.target.checked)} /> Expiry required</label>
              </div>

              {/* -- Branch Inventory -- */}
              <Section title="Branch Inventory" />
              <div className="field">
                <span>Branch</span>
                <input type="text" value={selectedBranch?.branch_name ?? 'Select a branch'} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                <div className="field"><span>Qty on Hand</span><input type="number" step="0.01" min="0" value={form.quantity_on_hand} onChange={(e) => set('quantity_on_hand', e.target.value)} placeholder="0" /></div>
                <div className="field"><span>Reorder Level</span><input type="number" step="0.01" min="0" value={form.reorder_level} onChange={(e) => set('reorder_level', e.target.value)} placeholder="0" /></div>
                <div className="field"><span>Reorder Qty</span><input type="number" step="0.01" min="0" value={form.reorder_quantity} onChange={(e) => set('reorder_quantity', e.target.value)} placeholder="0" /></div>
                <div className="field"><span>Available Qty</span><input type="number" step="0.01" min="0" value={form.available_quantity} onChange={(e) => set('available_quantity', e.target.value)} placeholder="0" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                <div className="field"><span>Reserved Qty</span><input type="number" step="0.01" min="0" value={form.reserved_quantity} onChange={(e) => set('reserved_quantity', e.target.value)} placeholder="0" /></div>
                <div className="field"><span>Damaged Qty</span><input type="number" step="0.01" min="0" value={form.damaged_quantity} onChange={(e) => set('damaged_quantity', e.target.value)} placeholder="0" /></div>
                <div className="field"><span>Expired Qty</span><input type="number" step="0.01" min="0" value={form.expired_quantity} onChange={(e) => set('expired_quantity', e.target.value)} placeholder="0" /></div>
              </div>

              {/* -- Physical -- */}
              <Section title="Physical Attributes" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                <div className="field"><span>Weight</span><input type="number" step="0.01" min="0" value={form.weight} onChange={(e) => set('weight', e.target.value)} placeholder="kg" /></div>
                <div className="field"><span>Length</span><input type="number" step="0.01" min="0" value={form.length} onChange={(e) => set('length', e.target.value)} placeholder="cm" /></div>
                <div className="field"><span>Width</span><input type="number" step="0.01" min="0" value={form.width} onChange={(e) => set('width', e.target.value)} placeholder="cm" /></div>
                <div className="field"><span>Height</span><input type="number" step="0.01" min="0" value={form.height} onChange={(e) => set('height', e.target.value)} placeholder="cm" /></div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn--primary">{modal === 'create' ? 'Create' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmTarget}
        title={confirmTarget?.is_active ? 'Deactivate product?' : 'Activate product?'}
        message={confirmTarget ? `Are you sure you want to ${confirmTarget.is_active ? 'deactivate' : 'activate'} ${confirmTarget.product_name}?` : ''}
        confirmLabel={confirmTarget?.is_active ? 'Deactivate' : 'Activate'}
        variant={confirmTarget?.is_active ? 'danger' : 'primary'}
        onConfirm={() => { if (confirmTarget) { const p = confirmTarget; setConfirmTarget(null); handleToggle(p) } }}
        onCancel={() => setConfirmTarget(null)}
      />

      {/* ---- Import Modal ---- */}
      {modal === 'import' && importRows.length > 0 && (
        <div className="modal-overlay" onClick={() => { if (!importing) setModal(null) }}>
          <div className="modal" style={{ maxWidth: 640, textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4 }}>Import Products</h3>
            <p className="page-subtitle" style={{ marginBottom: 'var(--space-4)' }}>{importFileName} &middot; {importRows.length} row{importRows.length !== 1 ? 's' : ''} detected</p>

            {importProgress ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)' }}>Importing {importProgress.done} of {importProgress.total}...</p>
                <div style={{ width: '100%', height: 8, background: 'var(--border)', borderRadius: 'var(--radius-badge)', marginTop: 'var(--space-3)', overflow: 'hidden' }}>
                  <div style={{ width: `${(importProgress.done / importProgress.total) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 'var(--radius-badge)', transition: 'width 200ms ease' }} />
                </div>
              </div>
            ) : importFailures.length > 0 ? (
              <>
                <p style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-body)' }}>
                  <strong style={{ color: 'var(--success)' }}>{importDone} imported</strong>
                  {importFailures.length > 0 && <span style={{ color: 'var(--error)' }}>, {importFailures.length} failed</span>}
                </p>
                <div className="table-wrap" style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 'var(--space-4)' }}>
                  <table className="data-table" style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ fontSize: 'var(--text-caption)', width: 40 }}>#</th>
                        <th style={{ fontSize: 'var(--text-caption)' }}>SKU</th>
                        <th style={{ fontSize: 'var(--text-caption)' }}>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importFailures.map((f, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: 'var(--text-small)', color: 'var(--secondary)' }}>{f.row}</td>
                          <td style={{ fontSize: 'var(--text-small)' }}>{f.sku}</td>
                          <td style={{ fontSize: 'var(--text-small)', color: 'var(--error)', wordBreak: 'break-word' }}>{f.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="dialog__actions">
                  <button type="button" className="btn btn--primary" onClick={() => setModal(null)}>Close</button>
                </div>
              </>
            ) : (
              <>
                <div className="table-wrap" style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 'var(--space-4)' }}>
                  <table className="data-table" style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        {Object.keys(importRows[0]).slice(0, 6).map((h) => <th key={h} style={{ fontSize: 'var(--text-caption)', whiteSpace: 'nowrap' }}>{h}</th>)}
                        {Object.keys(importRows[0]).length > 6 && <th style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>+{Object.keys(importRows[0]).length - 6}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).slice(0, 6).map((v, j) => <td key={j} style={{ fontSize: 'var(--text-small)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{String(v ?? '')}</td>)}
                          {Object.keys(row).length > 6 && <td style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>...</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="dialog__actions">
                  <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button type="button" className="btn btn--primary" onClick={confirmImport}>Import {importRows.length} Product{importRows.length !== 1 ? 's' : ''}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---- Print Labels Modal ---- */}
      {showLabels && (
        <div className="modal-overlay" onClick={() => setShowLabels(false)}>
          <div className="modal" style={{ maxWidth: 640, textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4 }}>Print Barcode Labels</h3>
            <p className="page-subtitle" style={{ marginBottom: 'var(--space-4)' }}>Select products to print {labelSize === '40x25' ? '40 × 25 mm' : '58 × 40 mm'} labels for.</p>

            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <button type="button" className="btn btn--ghost" onClick={toggleAllLabels}>Select all on page</button>
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>{selectedForLabels.length} selected</span>
            </div>

            <div className="table-wrap" style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 'var(--space-4)' }}>
              <table className="data-table" style={{ minWidth: 0 }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: 'var(--text-caption)', width: 40 }} />
                    <th style={{ fontSize: 'var(--text-caption)' }}>SKU</th>
                    <th style={{ fontSize: 'var(--text-caption)' }}>Product</th>
                    <th style={{ fontSize: 'var(--text-caption)' }}>Barcode</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>No products on this page.</td></tr>
                  )}
                  {products.map((p) => (
                    <tr key={p.product_id}>
                      <td>
                        <input type="checkbox" checked={!!labelSelection[p.product_id]} disabled={!p.barcode} onChange={() => toggleLabel(p.product_id)} />
                      </td>
                      <td style={{ fontSize: 'var(--text-small)', whiteSpace: 'nowrap' }}>{p.sku}</td>
                      <td style={{ fontSize: 'var(--text-small)', wordBreak: 'break-word' }}>{p.product_name}</td>
                      <td style={{ fontSize: 'var(--text-small)', color: p.barcode ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{p.barcode ?? 'no barcode'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 'var(--space-4)' }}>
              <div className="field">
                <span>Copies per label</span>
                <input type="number" min={1} max={100} value={labelCopies} onChange={(e) => setLabelCopies(Math.min(Math.max(Number(e.target.value) || 1, 1), 100))} />
              </div>
              <div className="field">
                <span>Label size</span>
                <select value={labelSize} onChange={(e) => setLabelSize(e.target.value as '40x25' | '58x40')}>
                  <option value="40x25">40 × 25 mm</option>
                  <option value="58x40">58 × 40 mm</option>
                </select>
              </div>
            </div>

            <div className="dialog__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setShowLabels(false)}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={printLabels}>
                Print {selectedForLabels.length * labelCopies} Label{selectedForLabels.length * labelCopies !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
