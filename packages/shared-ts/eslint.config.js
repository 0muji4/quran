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
  },
  {
    // graphql-codegen loads `codegen.ts` via `--config` and requires it to
    // default-export the config object.
    files: ['codegen.ts'],
    rules: {
      'no-restricted-syntax': 'off'
    }
  }
];
