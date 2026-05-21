interface CookieValue {
  name: string;
  value: string;
}

const store = new Map<string, string>();

const fakeCookieStore = {
  get(name: string): CookieValue | undefined {
    const value = store.get(name);
    return value === undefined ? undefined : { name, value };
  },
  set(...args: [string, string, ...unknown[]]): void {
    const [name, value] = args;
    store.set(name, value);
  },
  delete(name: string): void {
    store.delete(name);
  }
};

export const cookies = async () => fakeCookieStore;

export const __resetCookies = (): void => {
  store.clear();
};
