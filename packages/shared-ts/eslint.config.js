import baseConfig from '@quran-project/eslint-config';

export default [
  ...baseConfig,
  {
    ignores: [
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.mjs',
      '**/*.config.ts',
      'dist/**',
      'src/graphql/types.generated.ts'
    ]
  }
];
