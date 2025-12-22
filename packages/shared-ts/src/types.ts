export type UserSession = {
  id: string;
  email?: string;
  displayName?: string;
};

export type GraphQLContext = {
  session: UserSession | null;
  requestId: string;
};
