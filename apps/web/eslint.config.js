import baseConfig from '@quran-project/eslint-config';

export default [
  ...baseConfig,
  {
    ignores: [
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.mjs',
      '**/*.config.ts',
      'next-env.d.ts',
      '.next/**',
      'styled-system/**'
    ]
  },
  {
    // Next.js requires a default export from App Router route files, the
    // middleware entry, and the next-intl request config. Allow it there.
    files: [
      'app/**/page.tsx',
      'app/**/layout.tsx',
      'app/**/loading.tsx',
      'app/**/error.tsx',
      'app/**/not-found.tsx',
      'app/**/global-error.tsx',
      'app/**/template.tsx',
      'app/**/default.tsx',
      'app/**/route.ts',
      'app/**/sitemap.ts',
      'app/**/robots.ts',
      'app/**/manifest.ts',
      'app/**/{icon,apple-icon,opengraph-image,twitter-image}.tsx',
      'middleware.ts',
      'instrumentation.ts',
      'i18n/request.ts'
    ],
    rules: {
      'no-restricted-syntax': 'off'
    }
  }
];
