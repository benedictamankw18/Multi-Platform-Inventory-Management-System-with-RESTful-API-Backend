import { useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useBusiness } from '@/contexts/BusinessContext'
import { useServerConfig } from '@/contexts/ServerConfigContext'
import {
  DEFAULT_SERVER_URL,
  normalizeServerUrl,
  type HealthResult,
} from '@/services/serverConfig'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

/**
 * "Connect to Your Server" screen.
 *
 * Reached automatically on first launch (no server saved) and from More >
 * Server. "Connect" stays disabled until the *current* input has passed a
 * health check, so a typo can never be committed as the server.
 */
export default function ConnectServerScreen() {
  const { serverUrl, check, connect } = useServerConfig()
  const { name, logo } = useBusiness()

  const [input, setInput] = useState(serverUrl ?? DEFAULT_SERVER_URL)
  const [checking, setChecking] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [result, setResult] = useState<HealthResult | null>(null)
  // The exact input string that produced the successful check, so editing the
  // field after a pass disables Connect again.
  const [verifiedInput, setVerifiedInput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Remember which logo URL failed so a later, valid one still renders.
  const [failedLogo, setFailedLogo] = useState<string | null>(null)

  const canConnect = result?.ok === true && verifiedInput !== null && input.trim() === verifiedInput

  async function onCheck() {
    setError(null)
    setResult(null)
    setVerifiedInput(null)
    setChecking(true)
    try {
      const res = await check(input)
      setResult(res)
      if (res.ok) setVerifiedInput(input.trim())
    } finally {
      setChecking(false)
    }
  }

  async function onConnect() {
    const normalized = normalizeServerUrl(input)
    if (!normalized.ok) {
      setError(normalized.error)
      return
    }
    setConnecting(true)
    setError(null)
    try {
      await connect(normalized.url)
      router.replace('/login')
    } catch {
      setError('Could not save the server address. Please try again.')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.branding}>
          {logo && logo !== failedLogo ? (
            <Image
              source={{ uri: logo }}
              style={styles.logo}
              resizeMode="contain"
              onError={() => setFailedLogo(logo)}
            />
          ) : null}
          <Text style={styles.brandName}>{name || 'Inventory Manager'}</Text>
          <Text style={styles.title}>Connect to Your Server</Text>
          <Text style={styles.intro}>
            Point the app at your inventory API. We&apos;ll confirm it&apos;s reachable before you
            continue, then remember the address for next time.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Server Host URL</Text>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="http://192.168.1.10:8040"
            placeholderTextColor={colors.textMuted}
            editable={!checking && !connecting}
          />
          <Text style={styles.hint}>
            Include the port if it isn&apos;t 80/443. We&apos;ll append /api/v1 automatically.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {result ? (
            <View style={styles.feedback}>
              {result.ok ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              ) : (
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
              )}
              <Text style={[styles.feedbackText, result.ok ? styles.ok : styles.error]}>
                {result.ok
                  ? `Connected${result.ms != null ? ` · ${result.ms} ms` : ''}.`
                  : result.message}
              </Text>
            </View>
          ) : null}

          {result?.ok && result.warning ? (
            <View style={styles.warning}>
              <Ionicons name="warning-outline" size={16} color={colors.warning} />
              <Text style={styles.warningText}>{result.warning}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              (checking || connecting || pressed) && styles.secondaryButtonPressed,
            ]}
            onPress={onCheck}
            disabled={checking || connecting}
          >
            {checking ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="pulse-outline" size={18} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Check Connection</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              (!canConnect || connecting) && styles.buttonDisabled,
              (connecting || pressed) && canConnect && styles.buttonPressed,
            ]}
            onPress={onConnect}
            disabled={!canConnect || connecting}
            accessibilityRole="button"
            accessibilityLabel="Connect"
            accessibilityHint="Save this server and continue to sign in"
          >
            {connecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Connect</Text>
            )}
          </Pressable>

          {!canConnect && !checking ? (
            <Text style={styles.hint}>Run a successful check to enable Connect.</Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => {
            setInput(DEFAULT_SERVER_URL)
            setResult(null)
            setVerifiedInput(null)
            setError(null)
          }}
          hitSlop={8}
          disabled={checking || connecting}
        >
          <Text style={styles.defaultLink}>Use default ({DEFAULT_SERVER_URL})</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1, justifyContent: 'center' },
  branding: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { width: 96, height: 96, marginBottom: spacing.sm },
  brandName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  intro: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  hint: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.md },
  ok: { color: colors.success, fontWeight: '600' },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  feedbackText: { fontSize: fontSize.sm, flexShrink: 1 },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.35)',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  warningText: { color: colors.warning, fontSize: fontSize.sm, flexShrink: 1 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  secondaryButtonPressed: { backgroundColor: 'rgba(37, 99, 235, 0.08)' },
  secondaryButtonText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: { backgroundColor: colors.border },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  defaultLink: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.lg,
    textDecorationLine: 'underline',
  },
})
