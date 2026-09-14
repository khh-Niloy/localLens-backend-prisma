import { Role } from 'src/generated/prisma/enums';

export interface JwtPayload {
  sub: number;
  role: Role;
  email?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
