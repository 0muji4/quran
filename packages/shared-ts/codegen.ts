import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../../schemas/graphql/schema.graphql',
  // No `documents`: this is a schema-first setup. The `typescript` and
  // `typescript-resolvers` plugins generate purely from the schema, and the
  // apps carry no client-side `gql` operations to scan.
  generates: {
    'src/graphql/types.generated.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        // Nullable schema fields stay optional (`field?: Maybe<T>`). The repo
        // types and resolvers are written against this shape; `avoidOptionals`
        // was previously set but never reflected in the committed output, so
        // enabling it now would be an unrelated breaking change.
        // Emit GraphQL object/input/interface types as `interface` to match
        // the Google TypeScript Style Guide preference. Utility/scaffolding
        // types (Maybe, Exact, the resolver helpers) stay as `type`.
        declarationKind: 'interface',
        // Emit `import type` for type-only imports (Google Style Guide).
        useTypeImports: true,
        contextType: '../types#GraphQLContext',
        scalars: {
          DateTime: 'string',
          JSONObject: 'Record<string, unknown>'
        }
      }
    }
  }
};

export default config;
