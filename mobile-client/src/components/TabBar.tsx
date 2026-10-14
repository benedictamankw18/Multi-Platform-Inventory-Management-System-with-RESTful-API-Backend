import { useState, type ComponentProps } from 'react'
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Feather } from '@expo/vector-icons'
import type { BottomTabBarProps } from 'expo-router/js-tabs'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

/**
 * TabBar.tsx
 *
 * Custom bottom tab bar for the authenticated shell.
 *
 * It mirrors the icon language of the web/desktop clients, which render
 * hand-written Feather SVGs (stroke 1.5). Here the same Feather set is drawn
 * through `@expo/vector-icons`, so no extra dependency is required.
 *
 * Navigation itself is untouched: this component only replaces the presentation
 * of the React Navigation tab bar. Presses emit the standard `tabPress` event
 * and delegate to `navigation.navigate`, so deep links, nested stacks and the
 * auth/permission redirects keep working exactly as before.
 *
 * The visible items are computed by the layout (which owns the permission
 * checks) and passed in, because `href: null` only hides the *default* tab bar
 * entries — a custom bar must decide for itself what to render.
 */

type FeatherName = ComponentProps<typeof Feather>['name']

export type TabBarItem = {
  /** Route name inside the (app) group, e.g. `index` or `pos`. */
  name: string
  /** Label shown under the icon (and used as the hover tooltip). */
  label: string
  icon: FeatherName
  /** Render as the large, circular, raised centre button. */
  primary?: boolean
}

const WIDE_BREAKPOINT = 600
const BAR_MAX_WIDTH = 640

export function TabBar({
  state,
  navigation,
  insets,
  items,
}: BottomTabBarProps & { items: TabBarItem[] }) {
  const { width } = useWindowDimensions()
  const isWide = width >= WIDE_BREAKPOINT

  // `focusedKey` backs the keyboard/web focus ring; `hoveredKey` backs the
  // hover tooltip (web only — hover never fires on a touch device).
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  const routeByName = new Map(state.routes.map((route) => [route.name, route]))

  return (
    <View
      role="tablist"
      style={[
        styles.container,
        isWide
          ? {
              backgroundColor: 'transparent',
              paddingHorizontal: spacing.md,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            }
          : { paddingBottom: insets.bottom },
      ]}
    >
      <View style={[styles.bar, isWide ? styles.barWide : styles.barNarrow]}>
        {items.map((item) => {
          const route = routeByName.get(item.name)
          // A permitted item whose route is missing (e.g. filtered out of the
          // navigator) is skipped rather than rendered as a dead button.
          if (!route) return null

          const routeIndex = state.routes.indexOf(route)
          const isFocused = state.index === routeIndex
          const isKeyboardFocused = focusedKey === item.name
          const isHovered = hoveredKey === item.name

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name)
            }
          }

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key })
          }

          const tooltip = isHovered ? (
            <View
              pointerEvents="none"
              style={[styles.tooltipWrap, item.primary && styles.tooltipWrapRaised]}
            >
              <View style={styles.tooltip}>
                <Text style={styles.tooltipText}>{item.label}</Text>
              </View>
            </View>
          ) : null

          const a11y = {
            accessibilityRole: 'button' as const,
            accessibilityState: { selected: isFocused },
            accessibilityLabel: item.label,
            accessibilityHint: `Opens ${item.label}`,
            testID: `tab-${item.name}`,
            onPress,
            onLongPress,
            onFocus: () => setFocusedKey(item.name),
            onBlur: () => setFocusedKey((key) => (key === item.name ? null : key)),
            onHoverIn: () => setHoveredKey(item.name),
            onHoverOut: () => setHoveredKey((key) => (key === item.name ? null : key)),
          }

          if (item.primary) {
            return (
              <View key={item.name} style={styles.slot}>
                {tooltip}
                <Pressable
                  {...a11y}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    isWide && styles.primaryButtonWide,
                    isKeyboardFocused && styles.primaryButtonFocused,
                    pressed && styles.primaryButtonPressed,
                  ]}
                >
                  <Feather name={item.icon} size={isWide ? 30 : 26} color="#fff" />
                </Pressable>
                <Text style={[styles.label, styles.labelPrimary, isFocused && styles.labelActive]}>
                  {item.label}
                </Text>
              </View>
            )
          }

          return (
            <Pressable key={item.name} {...a11y} style={styles.slot}>
              {tooltip}
              <View
                style={[
                  styles.iconPill,
                  isFocused && styles.iconPillActive,
                  isKeyboardFocused && styles.iconPillFocused,
                ]}
              >
                <Feather
                  name={item.icon}
                  size={22}
                  color={isFocused ? colors.primary : colors.textMuted}
                />
              </View>
              <Text style={[styles.label, isFocused && styles.labelActive]}>{item.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: spacing.sm,
  },
  barNarrow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingBottom: 6,
  },
  barWide: {
    width: '100%',
    maxWidth: BAR_MAX_WIDTH,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingBottom: 6,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconPill: {
    width: 40,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconPillActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  iconPillFocused: {
    borderColor: colors.primary,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
  },
  labelPrimary: {
    marginTop: 4,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  primaryButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  primaryButtonWide: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: -26,
  },
  primaryButtonFocused: {
    borderColor: '#93C5FD',
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  tooltipWrap: {
    position: 'absolute',
    top: -38,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tooltipWrapRaised: {
    top: -68,
  },
  tooltip: {
    backgroundColor: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  tooltipText: {
    color: '#fff',
    fontSize: fontSize.sm - 1,
    fontWeight: '500',
  },
})
