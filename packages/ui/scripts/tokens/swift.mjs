// iOS renderer: semantic tokens → Swift source for SwiftUI.
// Pure functions that return file contents; no I/O.

import { GENERATED_NOTICE } from './output.mjs';

const header = GENERATED_NOTICE.map((line) => `// ${line}`).join('\n');

function colorTokens({ material, app }) {
  const roles = [...material, ...app];
  return `${header}
import SwiftUI
import UIKit

/// Material 3 colour roles and the app-specific roles. Each colour resolves
/// to its light or dark value from the current trait collection.
enum TokenColor {
${roles
  .map((role) => `  static let ${role.name} = Color(light: 0x${role.light}, dark: 0x${role.dark})`)
  .join('\n')}
}

private extension Color {
  init(light: UInt32, dark: UInt32) {
    self.init(
      uiColor: UIColor { traits in
        UIColor(tokenHex: traits.userInterfaceStyle == .dark ? dark : light)
      })
  }
}

private extension UIColor {
  convenience init(tokenHex hex: UInt32) {
    self.init(
      red: CGFloat((hex >> 16) & 0xFF) / 255,
      green: CGFloat((hex >> 8) & 0xFF) / 255,
      blue: CGFloat(hex & 0xFF) / 255,
      alpha: 1)
  }
}
`;
}

function dimensionTokens({ spacing, shape }) {
  const namespace = (name, doc, entries) =>
    [
      `/// ${doc}`,
      `enum ${name} {`,
      ...entries.map(({ name: entry, px }) => `  static let ${entry}: CGFloat = ${px}`),
      '}'
    ].join('\n');

  return `${header}
import CoreGraphics

${namespace(
  'TokenSpacing',
  'Spacing on a 4pt grid.',
  spacing.map(({ name, px }) => ({ name: `space${name}`, px }))
)}

${namespace('TokenShape', 'Corner radii on the Material 3 shape scale.', shape)}
`;
}

/** Returns { file name: contents } for the iOS generated directory. */
export function renderSwift(tokens) {
  return {
    'ColorTokens.swift': colorTokens(tokens.colors),
    'DimensionTokens.swift': dimensionTokens(tokens)
  };
}
