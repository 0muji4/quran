import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const BCRYPT_COST = 12;

const ACCESS_TTL = '15m';
const REFRESH_TTL = '30d';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_COST);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export type TokenPayload = {
  sub: string;
  email?: string;
  name?: string;
};

const requireSecret = (envVar: string): string => {
  const value = process.env[envVar];
  if (!value) throw new Error(`${envVar} is not configured`);
  return value;
};

export const issueAccessToken = (payload: TokenPayload): string =>
  jwt.sign(payload, requireSecret('JWT_SECRET'), { expiresIn: ACCESS_TTL });

export const issueRefreshToken = (payload: TokenPayload): string =>
  jwt.sign(payload, requireSecret('REFRESH_TOKEN_SECRET'), {
    expiresIn: REFRESH_TTL
  });
