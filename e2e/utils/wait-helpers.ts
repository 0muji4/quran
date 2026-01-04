import { Page } from '@playwright/test';

/**
 * Wait for a specific network response
 */
export async function waitForResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Wait for multiple conditions with retry
 */
export async function waitWithRetry<T>(
  condition: () => Promise<T>,
  options: {
    timeout?: number;
    interval?: number;
    errorMessage?: string;
  } = {}
): Promise<T> {
  const { timeout = 30000, interval = 1000, errorMessage = 'Condition not met' } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) {
        return result;
      }
    } catch (error) {
      // Continue retrying
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`${errorMessage} (timeout: ${timeout}ms)`);
}

/**
 * Poll for a condition to be true
 */
export async function pollUntil(
  condition: () => Promise<boolean>,
  timeout = 30000,
  interval = 1000
): Promise<void> {
  await waitWithRetry(
    async () => {
      const result = await condition();
      if (result) return true;
      throw new Error('Condition false');
    },
    { timeout, interval, errorMessage: 'Polling condition not met' }
  );
}
