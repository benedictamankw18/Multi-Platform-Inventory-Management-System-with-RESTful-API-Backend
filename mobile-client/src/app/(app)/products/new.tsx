import { router } from 'expo-router'
import { Alert } from 'react-native'
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
    try {
      return await api.createProduct({ ...input, branch_id: selectedBranch?.branch_id ?? undefined })
    } catch (err: any) {
      const queued = !!err && (err.queuedOffline === true || (err.message && /saved to the sync queue/i.test(err.message)))
      if (queued) {
        Alert.alert('Saved offline', 'This product will be created when you reconnect.')
        router.back()
        return {} as any
      }
      throw err
    }
  }

  return (
    <ProductForm
      submitLabel="Create product"
      onSubmit={handleSubmit}
      onSaved={() => router.back()}
    />
  )
}
