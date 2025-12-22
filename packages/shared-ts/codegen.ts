import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../../schemas/graphql/schema.graphql',
  documents: ['../../apps/**/*.{ts,tsx}'],
  generates: {
    'src/graphql/types.generated.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        avoidOptionals: true,
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
