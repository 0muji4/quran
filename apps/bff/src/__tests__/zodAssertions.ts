import { expect } from 'vitest';

export const expectZodPathError = (body: unknown, expectedPath: Array<string | number>): void => {
  const b = body as { errors?: Array<{ path: PropertyKey[] }> };
  expect(b.errors).toBeDefined();
  expect(
    (b.errors ?? []).some((e) => JSON.stringify(e.path) === JSON.stringify(expectedPath))
  ).toBe(true);
};
