import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from 'src/generated/prisma/enums';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, Tokens } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.saltRounds,
    );

    const user = await this.prisma.user.create({
      data: {
        name: registerDto.name,
        email: registerDto.email,
        password: hashedPassword,
        role: registerDto.role ?? Role.TOURIST,
        language: registerDto.language ?? 'en',
        isActive: registerDto.isActive ?? true,
        isDeleted: registerDto.isDeleted ?? false,
        isBlocked: registerDto.isBlocked ?? false,
        image: registerDto.image,
      },
    });


    const tokens = await this.generateTokens(user.id, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isDeleted) {
      throw new UnauthorizedException('User account has been deleted');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('User account is blocked');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async refreshToken(refreshToken: string): Promise<Tokens> {
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'localLens-refresh-secret-key-2026-secure';

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    if (user.isDeleted) {
      throw new UnauthorizedException('User account has been deleted');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('User account is blocked');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );

    if (!isRefreshTokenValid) {
      // Possible token reuse attempt: invalidate stored token for safety
      await this.prisma.user.update({
        where: { id: user.id },
        data: { hashedRefreshToken: null },
      });
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    // Refresh token rotation: issue new token pair and store new hash
    const tokens = await this.generateTokens(user.id, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: number) {
    await this.prisma.user.updateMany({
      where: {
        id: userId,
        hashedRefreshToken: { not: null },
      },
      data: {
        hashedRefreshToken: null,
      },
    });

    return { message: 'Logged out successfully' };
  }

  private async generateTokens(userId: number, role: Role): Promise<Tokens> {
    const payload: JwtPayload = { sub: userId, role };

    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'localLens-access-secret-key-2026-secure';
    const accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'localLens-refresh-secret-key-2026-secure';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshTokenHash(
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(
      refreshToken,
      this.saltRounds,
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }

  private sanitizeUser(user: any) {
    const { password, hashedRefreshToken, ...safeUser } = user;
    return safeUser;
  }
}
