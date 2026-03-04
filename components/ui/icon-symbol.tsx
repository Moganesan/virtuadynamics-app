// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'monitor.fill': 'monitor-heart',
  'settings.fill': 'settings',
  'heart.fill': 'favorite',
  'lungs.fill': 'air',
  'thermometer': 'device-thermostat',
  'drop.fill': 'water-drop',
  'airplane': 'flight',
  'battery.100': 'battery-full',
  'exclamationmark.triangle.fill': 'warning',
  'bluetooth': 'bluetooth',
  'bluetooth.slash': 'bluetooth-disabled',
  'clock.fill': 'schedule',
  'heart.circle.fill': 'favorite',
  'airplane.circle.fill': 'flight',
  'xmark.circle.fill': 'cancel',
  'clock.rotate.left': 'history',
  'play.fill': 'play-arrow',
  'pause.fill': 'pause',
  'mic.fill': 'mic',
  'person.fill': 'person',
  'location.fill': 'location-on',
  'line.3.horizontal.decrease': 'filter-list',
  'waveform': 'graphic-eq',
  'chevron.down': 'expand-more',
  'checkmark.circle.fill': 'check-circle',
  'envelope.fill': 'email',
  'phone.fill': 'phone',
  'bell.fill': 'notifications',
  'bell.slash.fill': 'notifications-off',
  'person.2.fill': 'group',
  'plus.circle.fill': 'add-circle',
  'trash.fill': 'delete',
  'arrow.right.square': 'logout',
  'pencil': 'edit',
  'scalemass.fill': 'monitor-weight',
  'ruler': 'straighten',
  'mappin.fill': 'location-on',
  'person.crop.circle.fill': 'account-circle',
  'shield.fill': 'shield',
  'toggle.on': 'toggle-on',
} as any;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
