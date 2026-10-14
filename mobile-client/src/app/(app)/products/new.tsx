import { router } from 'expo-router'
import * as api from '@/services/api'
import type { ProductInput } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSIONS } from '@/config/permissions'
import { PermissionGate } from '@/components/PermissionGate'
import { ProductForm } from '@/components/ProductForm'

export default function NewProductRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.createProduct}>
      <NewProduct />
    </PermissionGate>
  )
}

function NewProduct() {
  const { selectedBranch } = useAuth()

  async function handleSubmit(input: ProductInput) {
    // Open the product in the acting branch so the API also creates its
    // `product_branch_inventory` row. Without it the product is saved but
    // filtered out of the branch-scoped product list and POS search.
    return api.createProduct({ ...input, branch_id: selectedBranch?.branch_id ?? undefined })
  }

  return (
    <ProductForm
      submitLabel="Create product"
      onSubmit={handleSubmit}
      onSaved={() => router.back()}
    />
  )
}
