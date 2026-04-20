import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Firestore } from 'firebase-admin/firestore';
import { FIREBASE_ADMIN, FIRESTORE } from '../firebase/firebase.provider';

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(FIREBASE_ADMIN) private readonly firebaseAdmin: typeof admin,
    @Inject(FIRESTORE) private readonly firestore: Firestore | null,
  ) {}

  async check() {
    if (!this.firestore) {
      const serviceAccountPath = this.configService.get<string>(
        'FIREBASE_SERVICE_ACCOUNT_PATH',
      );
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
      const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

      const privateKeyLooksLikePem =
        typeof privateKey === 'string' &&
        privateKey.includes('-----BEGIN PRIVATE KEY-----') &&
        privateKey.includes('-----END PRIVATE KEY-----') &&
        !privateKey.includes('YOUR_KEY') &&
        !privateKey.includes('REPLACE_WITH_YOUR_KEY');

      return {
        ok: true,
        firebase: {
          connected: false,
          initialized: Boolean(this.firebaseAdmin.apps?.length),
          configured: Boolean(
            serviceAccountPath || (projectId && clientEmail && privateKey),
          ),
          config: {
            hasServiceAccountPath: Boolean(serviceAccountPath),
            hasProjectId: Boolean(projectId),
            hasClientEmail: Boolean(clientEmail),
            hasPrivateKey: Boolean(privateKey),
            privateKeyLooksLikePem,
          },
        },
      };
    }

    const ref = this.firestore.collection('health').doc('status');
    await ref.set({
      ok: true,
      updatedAt: new Date().toISOString(),
    });

    const snapshot = await ref.get();

    return {
      ok: true,
      firebase: {
        connected: true,
      },
      id: snapshot.id,
      data: snapshot.data(),
    };
  }
}