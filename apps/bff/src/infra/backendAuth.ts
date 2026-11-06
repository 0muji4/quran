/** Authorization header value that authenticates the BFF to the Go backend. */
export const backendAuthorization = (): string | undefined => {
  const token = process.env.BACKEND_AUTH_TOKEN;
  return token ? `Bearer ${token}` : undefined;
};
