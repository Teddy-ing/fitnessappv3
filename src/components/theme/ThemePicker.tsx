import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { borderRadius, createThemedStyles, palettes, spacing, typography, useThemeColors, type ThemeId } from '../../theme';
import { useAppTheme } from './AppThemeProvider';

const options: { id: ThemeId; name: string; description: string }[] = [
    { id: 'ironjot', name: 'IronJot', description: 'Charcoal, coral & cream · Default' },
    { id: 'purple', name: 'Classic Purple', description: 'Black & purple' },
];

export default function ThemePicker() {
    const styles = useStyles();
    const colors = useThemeColors();
    const { themeId, selectTheme, isSavingTheme } = useAppTheme();
    return <View style={styles.container}>
        <View style={styles.heading}>
            <MaterialIcons name="palette" size={20} color={colors.text.primary} />
            <Text style={styles.title}>App theme</Text>
        </View>
        {options.map(option => {
            const selected = themeId === option.id;
            const preview = palettes[option.id];
            return <TouchableOpacity
                key={option.id}
                accessibilityRole="radio"
                accessibilityLabel={`${option.name}, ${option.description}`}
                accessibilityState={{ selected, checked: selected, disabled: isSavingTheme }}
                disabled={isSavingTheme}
                style={[styles.option, selected && styles.selected]}
                onPress={() => {
                    void selectTheme(option.id).catch(() => {
                        Alert.alert('Theme Not Saved', 'Please try again. Your current theme is unchanged.');
                    });
                }}
            >
                <View style={[styles.swatches, { backgroundColor: preview.background.primary }]}>
                    <View style={[styles.swatch, { backgroundColor: preview.accent.primary }]} />
                    <View style={[styles.swatch, { backgroundColor: preview.text.primary }]} />
                </View>
                <View style={styles.labels}>
                    <Text style={styles.name}>{option.name}</Text>
                    <Text style={styles.description}>{option.description}</Text>
                </View>
                <MaterialIcons name={selected ? 'radio-button-checked' : 'radio-button-unchecked'} size={22}
                    color={selected ? colors.accent.primary : colors.text.secondary} />
            </TouchableOpacity>;
        })}
    </View>;
}

const useStyles = createThemedStyles(colors => ({
    container: { backgroundColor: colors.background.secondary, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.xs },
    heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    title: { color: colors.text.primary, fontSize: typography.size.md },
    option: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm, minHeight: 76, gap: spacing.sm },
    selected: { borderColor: colors.accent.primary, backgroundColor: colors.accent.subtle },
    swatches: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
    swatch: { width: 12, height: 26, borderRadius: 4 },
    labels: { flex: 1 },
    name: { fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: colors.text.primary },
    description: { fontSize: typography.size.xs, color: colors.text.secondary, marginTop: 3 },
}));
