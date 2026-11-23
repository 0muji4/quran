import { describe, expect, it } from 'vitest';

import { renderPanda } from '../panda.mjs';

const tokens = {
  colors: {
    material: [{ name: 'primary', light: '315EA1', dark: 'AAC7FF' }],
    app: [{ name: 'onPass', light: 'FFFFFF', dark: '003919' }]
  },
  spacing: [
    { name: '0', px: 0 },
    { name: '4', px: 16 }
  ],
  shape: [{ name: 'extraSmall', px: 4 }]
};

describe('renderPanda', () => {
  const source = renderPanda(tokens)['tokens.ts'];

  it('writes one module', () => {
    expect(Object.keys(renderPanda(tokens))).toEqual(['tokens.ts']);
  });

  it('gives every colour role a light base and a dark value', () => {
    expect(source).toContain("primary: { value: { base: '#315EA1', _dark: '#AAC7FF' } }");
    expect(source).toContain("onPass: { value: { base: '#FFFFFF', _dark: '#003919' } }");
  });

  it('quotes keys that are not identifiers', () => {
    expect(source).toContain("'0': { value: '0px' }");
    expect(source).toContain("'4': { value: '16px' }");
    expect(source).toContain("extraSmall: { value: '4px' }");
  });

  it('leaves no trailing comma, as the Prettier config requires', () => {
    expect(source).not.toMatch(/,\n\}/);
  });
});
