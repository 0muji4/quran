import { describe, expect, it } from 'vitest';
import { colorRoles } from '../generated/tokens';
import { recipes, textStyles } from '..';

describe('theme', () => {
  it('gives every colour role a light and a dark value', () => {
    for (const [name, role] of Object.entries(colorRoles)) {
      expect(role.value, name).toEqual({
        base: expect.stringMatching(/^#[0-9A-F]{6}$/),
        _dark: expect.stringMatching(/^#[0-9A-F]{6}$/)
      });
    }
  });

  it('sizes the Material 3 type scale in rem, so it follows the browser text size', () => {
    const { quran, ...scale } = textStyles;
    expect(Object.keys(scale)).toHaveLength(15);
    for (const [name, style] of Object.entries(scale)) {
      const value = (style as { value: Record<string, unknown> }).value;
      expect(value.fontFamily, name).toBe('ui');
      expect(value.fontSize, name).toMatch(/rem$/);
      expect(value.lineHeight, name).toMatch(/rem$/);
    }
    for (const [name, style] of Object.entries(quran as Record<string, { value: object }>)) {
      expect(style.value, name).toMatchObject({
        fontFamily: 'quran',
        fontSize: expect.stringMatching(/rem$/)
      });
    }
  });

  it('names each recipe and its class after the app components', () => {
    for (const [name, recipe] of Object.entries(recipes)) {
      expect(name).toMatch(/^app[A-Z]/);
      expect(recipe.className).toBe(name);
    }
  });
});
