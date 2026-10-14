import { Stack } from 'expo-router'
import { colors } from '@/theme/theme'

/**
 * Nested stack for the Sales tab: list -> detail. Headers come from this stack
 * (the Sales tab sets `headerShown: false` so there is no double header).
 */
export default function SalesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Sales' }} />
      <Stack.Screen name="[saleId]" options={{ title: 'Sale' }} />
    </Stack>
  )
}
