import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_ADMIN } from '../firebase/firebase.provider';
import { AuthUser } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebaseAdmin: typeof admin,
  ) {}

  async login(dto: LoginDto) {
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('FIREBASE_API_KEY is not set');
    }

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: dto.email,
          password: dto.password,
          returnSecureToken: true,
        }),
      },
    );

    const data = (await res.json().catch(() => null)) as
      | {
          idToken: string;
          refreshToken: string;
          expiresIn: string;
          localId: string;
          email?: string;
          registered?: boolean;
        }
      | { error?: { message?: string } }
      | null;

    if (!res.ok) {
      const message =
        (data &&
          typeof data === 'object' &&
          'error' in data &&
          data.error?.message) ||
        `Login failed (${res.status})`;
      throw new UnauthorizedException(message);
    }

    if (!data || typeof data !== 'object' || !('idToken' in data)) {
      throw new UnauthorizedException('Login failed');
    }

    return {
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      uid: data.localId,
      email: data.email ?? dto.email,
    };
  }

  async register(dto: RegisterDto) {
    if (!this.firebaseAdmin.apps?.length) {
      throw new BadRequestException('Auth not configured');
    }

    try {
      const userRecord = await this.firebaseAdmin.auth().createUser({
        email: dto.email,
        password: dto.password,
        displayName: dto.displayName,
      });

      return {
        uid: userRecord.uid,
        email: userRecord.email ?? null,
        emailVerified: userRecord.emailVerified ?? null,
        displayName: userRecord.displayName ?? null,
        photoURL: userRecord.photoURL ?? null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(message);
    }
  }

  async verifyBearerToken(authorizationHeader: string | undefined) {
    const token = this.extractBearerToken(authorizationHeader);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    if (!this.firebaseAdmin.apps?.length) {
      throw new UnauthorizedException('Auth not configured');
    }

    const decoded = await this.firebaseAdmin.auth().verifyIdToken(token);
    return this.toAuthUser(decoded);
  }

  private extractBearerToken(authorizationHeader: string | undefined) {
    if (!authorizationHeader) return null;
    const [scheme, token] = authorizationHeader.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token;
  }

  private toAuthUser(decoded: admin.auth.DecodedIdToken): AuthUser {
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? null,
      name: decoded.name ?? null,
      picture: decoded.picture ?? null,
      firebase: decoded,
    };
  }
}

