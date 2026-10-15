import { useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Redirect, router } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { useBusiness } from '@/contexts/BusinessContext'
import { useServerConfig } from '@/contexts/ServerConfigContext'
import { LoadingScreen } from '@/components/LoadingScreen'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

export default function LoginScreen() {
  const { login, isAuthenticated, isLoading, needsBranchSelection } = useAuth()
  const { serverUrl, configured } = useServerConfig()
  const { name, logo } = useBusiness()
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  // Remember which logo URL failed so a later, valid one still renders.
  const [failedLogo, setFailedLogo] = useState<string | null>(null)

  async function onSubmit() {
    if (!usernameOrEmail.trim() || !password) {
      setLocalError('Enter your username and password.')
      return
    }
    setSubmitting(true)
    setLocalError(null)
    try {
      await login(usernameOrEmail.trim(), password)
      router.replace('/select-branch')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  // No server chosen yet -> send the user to the Connect screen first.
  if (!configured) {
    return <Redirect href="/connect-server" />
  }

  if (isAuthenticated) {
    return <Redirect href={needsBranchSelection ? '/select-branch' : '/'} />
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
      </View>

      <View style={styles.card}>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <Text style={styles.label}>Username or email</Text>
        <TextInput
          style={styles.input}
          value={usernameOrEmail}
          onChangeText={setUsernameOrEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="e.g. admin@example.com"
          placeholderTextColor={colors.textMuted}
          editable={!submitting}
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            autoComplete="current-password"
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            editable={!submitting}
            onSubmitEditing={onSubmit}
            returnKeyType="go"
          />
          <Pressable
            style={styles.passwordToggle}
            onPress={() => setShowPassword((v) => !v)}
            disabled={submitting}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        </View>

        {localError ? <Text style={styles.error}>{localError}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.button, (submitting || pressed) && styles.buttonPressed]}
          onPress={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.serverRow}
          onPress={() => router.push('/connect-server')}
          disabled={submitting}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Change server"
          accessibilityHint="Choose a different server host URL"
        >
          <Ionicons name="server-outline" size={14} color={colors.textMuted} />
          <Text style={styles.serverText} numberOfLines={1}>
            {serverUrl ?? 'No server configured'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  branding: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { width: 96, height: 96, marginBottom: spacing.sm },
  brandName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subtitle: { fontSize: fontSize.md, color: colors.textMuted, marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xs, marginTop: spacing.sm },
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.text,
  },
  passwordToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.md },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  serverText: { color: colors.textMuted, fontSize: fontSize.sm, flexShrink: 1 },
})
