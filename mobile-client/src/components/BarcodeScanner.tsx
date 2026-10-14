import { useEffect, useRef } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import type { BarcodeScanningResult, BarcodeType } from 'expo-camera'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

/**
 * Barcode types the app scans. Deliberately a focused subset of the full
 * `BarcodeType` union — the retail/goods codes we care about.
 */
const BARCODE_TYPES: BarcodeType[] = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'itf14',
  'codabar',
  'qr',
]

/**
 * Full-screen camera modal that reports the first successfully scanned barcode.
 *
 * The component renders nothing while closed, so the CameraView is unmounted
 * whenever the sheet is dismissed (Expo only supports one active preview).
 * The scan is latched after the first hit because `onBarcodeScanned` fires
 * continuously while a code is in frame.
 */
export function BarcodeScanner({
  visible,
  onScanned,
  onClose,
}: {
  visible: boolean
  onScanned: (data: string) => void
  onClose: () => void
}) {
  const [permission, requestPermission] = useCameraPermissions()
  const handledRef = useRef(false)

  // Reset the latch each time the sheet opens.
  useEffect(() => {
    if (visible) handledRef.current = false
  }, [visible])

  // Ask for camera access the first time the sheet is opened.
  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      void requestPermission()
    }
  }, [visible, permission, requestPermission])

  function handleScanned(result: BarcodeScanningResult) {
    if (handledRef.current || !result.data) return
    handledRef.current = true
    onScanned(result.data)
  }

  if (!visible) return null

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {!permission ? (
          <View style={styles.center}>
            <Text style={styles.message}>Preparing camera…</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Text style={styles.message}>
              Camera access is needed to scan barcodes.
            </Text>
            {permission.canAskAgain ? (
              <Pressable style={styles.button} onPress={() => void requestPermission()}>
                <Text style={styles.buttonText}>Grant permission</Text>
              </Pressable>
            ) : (
              <Text style={styles.message}>
                Enable camera access in your device settings and try again.
              </Text>
            )}
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
              onBarcodeScanned={handleScanned}
            />
            <View pointerEvents="none" style={styles.overlay}>
              <View style={styles.frame} />
              <Text style={styles.hint}>Point the camera at a barcode</Text>
            </View>
          </>
        )}

        <Pressable style={styles.close} onPress={onClose}>
          <Text style={styles.closeText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  message: {
    color: colors.surface,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  buttonText: { color: colors.surface, fontSize: fontSize.md, fontWeight: '600' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: colors.surface,
    borderRadius: radius.lg,
    backgroundColor: 'transparent',
  },
  hint: { color: colors.surface, fontSize: fontSize.sm, marginTop: spacing.md },
  close: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  closeText: { color: colors.surface, fontSize: fontSize.md, fontWeight: '600' },
})
