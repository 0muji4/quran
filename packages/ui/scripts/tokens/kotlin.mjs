// Android renderer: semantic tokens → Kotlin source for Jetpack Compose.
// Pure functions that return file contents; no I/O.

import { GENERATED_NOTICE } from './output.mjs';

const PACKAGE = 'com.tilawah.android.designsystem.generated';
const header = GENERATED_NOTICE.map((line) => `// ${line}`).join('\n');
const color = (hex) => `Color(0xFF${hex})`;
const call = (name, args) => [`${name}(`, ...args.map((arg) => `    ${arg},`), ')'].join('\n');

function colorTokens({ material, app }) {
  const scheme = (factory, mode) =>
    call(
      factory,
      material.map((role) => `${role.name} = ${color(role[mode])}`)
    );
  const appColors = (mode) =>
    call(
      'AppColors',
      app.map((role) => `${role.name} = ${color(role[mode])}`)
    );

  return `${header}
package ${PACKAGE}

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

/** Material 3 colour roles for light mode. */
val LightColorScheme: ColorScheme = ${scheme('lightColorScheme', 'light')}

/** Material 3 colour roles for dark mode. */
val DarkColorScheme: ColorScheme = ${scheme('darkColorScheme', 'dark')}

/** Colour roles that Material 3 has no slot for. */
@Immutable
data class AppColors(
${app.map((role) => `    val ${role.name}: Color,`).join('\n')}
)

/** App-specific colour roles for light mode. */
val LightAppColors: AppColors = ${appColors('light')}

/** App-specific colour roles for dark mode. */
val DarkAppColors: AppColors = ${appColors('dark')}
`;
}

function dimensionTokens({ spacing, shape }) {
  const object = (name, doc, entries) =>
    [
      `/** ${doc} */`,
      `object ${name} {`,
      ...entries.map(({ name: entry, px }) => `    val ${entry}: Dp = ${px}.dp`),
      '}'
    ].join('\n');

  return `${header}
package ${PACKAGE}

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

${object(
  'TokenSpacing',
  'Spacing on a 4dp grid.',
  spacing.map(({ name, px }) => ({ name: `space${name}`, px }))
)}

${object('TokenShape', 'Corner radii on the Material 3 shape scale.', shape)}
`;
}

/** Returns { file name: contents } for the Android generated directory. */
export function renderKotlin(tokens) {
  return {
    'ColorTokens.kt': colorTokens(tokens.colors),
    'DimensionTokens.kt': dimensionTokens(tokens)
  };
}
