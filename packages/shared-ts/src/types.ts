export interface UserSession {
  id: string;
  email?: string;
  displayName?: string;
}

export interface GraphQLContext {
  session: UserSession | null;
  requestId: string;
}
