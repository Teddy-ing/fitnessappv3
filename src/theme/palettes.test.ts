import { ironjotColors } from './palettes';

function luminance(hex: string): number {
    const rgb = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
        .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + 0.05) / (values[1] + 0.05);
}

it('keeps primary and secondary copy legible on every IronJot surface', () => {
    for (const surface of Object.values(ironjotColors.background)) {
        expect(contrast(ironjotColors.text.primary, surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(ironjotColors.text.secondary, surface)).toBeGreaterThanOrEqual(4.5);
    }
});
it('keeps filled action labels legible across the coral gradient', () => {
    for (const accent of ironjotColors.gradient.primary) {
        expect(contrast(ironjotColors.text.onAccent, accent)).toBeGreaterThanOrEqual(4.5);
    }
});
