import { Stack } from 'expo-router'
import { colors } from '@/theme/theme'

/**
 * Nested stack for the Products tab. The tab sets `headerShown: false` so this
 * stack owns the header (same arrangement as the Sales tab). Static routes
 * (`new`, `categories`, `units-of-measure`, `price-history`) take precedence
 * over the dynamic `[productId]` route.
 */
export default function ProductsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Products' }} />
      <Stack.Screen name="new" options={{ title: 'New product' }} />
      <Stack.Screen name="[productId]" options={{ title: 'Product' }} />
      <Stack.Screen name="categories" options={{ title: 'Categories' }} />
      <Stack.Screen name="units-of-measure" options={{ title: 'Units of measure' }} />
      <Stack.Screen name="price-history" options={{ title: 'Price history' }} />
    </Stack>
  )
}
