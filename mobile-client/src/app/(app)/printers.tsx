import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Redirect } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSIONS } from '@/config/permissions'
import { colors, fontSize, radius, spacing } from '@/theme/theme'
import {
  KIND_LABELS,
  connectAndSave,
  connectNetworkPrinter,
  forgetPrinter,
  getSavedPrinter,
  isPrintingSupported,
  listPrinters,
  printerSupportError,
  type DiscoveredPrinter,
} from '@/lib/printing'

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Android 12+ gates BLE scanning behind BLUETOOTH_SCAN/CONNECT runtime grants;
 * older versions used location. Without this, `getDeviceList` silently returns
 * nothing.
 */
async function ensureScanPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true
  try {
    const permissions =
      Number(Platform.Version) >= 31
        ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]
    const result = await PermissionsAndroid.requestMultiple(permissions)
    return Object.values(result).every((value) => value === PermissionsAndroid.RESULTS.GRANTED)
  } catch {
    return false
  }
}

export default function PrintersRoute() {
  const { hasPermission } = useAuth()
  const allowed = hasPermission(PERMISSIONS.createSale) || hasPermission(PERMISSIONS.sales)

  if (!allowed) return <Redirect href="/" />
  return <PrintersScreen />
}

function PrintersScreen() {
  const supported = isPrintingSupported()
  const supportError = printerSupportError()

  const [saved, setSaved] = useState<DiscoveredPrinter | null>(null)
  const [found, setFound] = useState<DiscoveredPrinter[]>([])
  const [scanning, setScanning] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [host, setHost] = useState('')
  const [port, setPort] = useState('9100')

  async function loadSaved() {
    setSaved(await getSavedPrinter())
  }

  useEffect(() => {
    let active = true
    getSavedPrinter()
      .then((printer) => {
        if (active) setSaved(printer)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  async function runScan() {
    setScanning(true)
    setFound([])
    try {
      if (!(await ensureScanPermissions())) {
        Alert.alert('Permission needed', 'Bluetooth permission is required to find printers.')
        return
      }
      const printers = await listPrinters('ble')
      setFound(printers)
      if (printers.length === 0) {
        Alert.alert('No printers found', 'Make sure the printer is on and paired, then try again.')
      }
    } catch (error) {
      Alert.alert('Scan failed', messageOf(error))
    } finally {
      setScanning(false)
    }
  }

  async function choose(printer: DiscoveredPrinter) {
    setBusyId(printer.id)
    try {
      await connectAndSave(printer)
      await loadSaved()
      Alert.alert('Printer saved', `${printer.name} is now the default receipt printer.`)
    } catch (error) {
      Alert.alert('Connection failed', messageOf(error))
    } finally {
      setBusyId(null)
    }
  }

  async function addNetworkPrinter() {
    const trimmedHost = host.trim()
    if (!trimmedHost) {
      Alert.alert('Host required', 'Enter the printer IP address or hostname.')
      return
    }
    const parsedPort = Number(port) || 9100
    setBusyId('net')
    try {
      await connectNetworkPrinter(trimmedHost, parsedPort)
      await loadSaved()
      setHost('')
      setPort('9100')
      Alert.alert('Printer saved', `${trimmedHost}:${parsedPort} is now the default receipt printer.`)
    } catch (error) {
      Alert.alert('Connection failed', messageOf(error))
    } finally {
      setBusyId(null)
    }
  }

  function confirmForget() {
    Alert.alert('Forget printer', 'Remove the saved receipt printer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Forget',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await forgetPrinter()
            await loadSaved()
          })()
        },
      },
    ])
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {!supported ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Development build required</Text>
          <Text style={styles.noticeText}>
            {supportError ?? 'Bluetooth printing is not available in this build.'}
          </Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Current printer</Text>
      <View style={styles.card}>
        {saved ? (
          <>
            <Text style={styles.printerName}>{saved.name}</Text>
            <Text style={styles.printerMeta}>{KIND_LABELS[saved.kind]}</Text>
            <Pressable style={styles.forgetButton} onPress={confirmForget}>
              <Text style={styles.forgetText}>Forget printer</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.empty}>No printer selected yet.</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Bluetooth printers</Text>
      <View style={styles.card}>
        <Pressable
          style={[styles.primaryButton, (!supported || scanning) && styles.buttonDisabled]}
          onPress={() => void runScan()}
          disabled={!supported || scanning}
        >
          {scanning ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Scan for printers</Text>
          )}
        </Pressable>

        {found.map((printer) => (
          <Pressable
            key={printer.id}
            style={styles.resultRow}
            onPress={() => void choose(printer)}
            disabled={busyId !== null}
          >
            <View style={styles.flex}>
              <Text style={styles.printerName}>{printer.name}</Text>
              <Text style={styles.printerMeta}>{printer.address}</Text>
            </View>
            {busyId === printer.id ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.selectText}>Select</Text>
            )}
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Network printer</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          value={host}
          onChangeText={setHost}
          placeholder="192.168.1.50"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
        />
        <TextInput
          style={[styles.input, styles.inputSpaced]}
          value={port}
          onChangeText={setPort}
          placeholder="9100"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
        <Pressable
          style={[styles.primaryButton, styles.inputSpaced, (!supported || busyId === 'net') && styles.buttonDisabled]}
          onPress={() => void addNetworkPrinter()}
          disabled={!supported || busyId === 'net'}
        >
          {busyId === 'net' ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Connect</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.footnote}>
        Bluetooth Classic (SPP) printers are not supported: iOS blocks them entirely, and the
        printing library only speaks BLE, USB and TCP.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  flex: { flex: 1 },
  sectionTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  notice: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeTitle: { fontSize: fontSize.md, fontWeight: '700', color: '#92400E' },
  noticeText: { fontSize: fontSize.sm, color: '#92400E', marginTop: spacing.xs },
  printerName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  printerMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  empty: { fontSize: fontSize.sm, color: colors.textMuted },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.surface, fontSize: fontSize.md, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  selectText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
  forgetButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
  },
  forgetText: { color: colors.danger, fontSize: fontSize.md, fontWeight: '600' },
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
  inputSpaced: { marginTop: spacing.sm },
  footnote: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.lg,
    lineHeight: 18,
  },
})
