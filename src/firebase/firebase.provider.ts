import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';
export const FIRESTORE = 'FIRESTORE';

function looksLikePemPrivateKey(key: string) {
  return (
    key.includes('-----BEGIN PRIVATE KEY-----') &&
    key.includes('-----END PRIVATE KEY-----') &&
    !key.includes('YOUR_KEY')
  );
}

export const firebaseProviders: Provider[] = [
  {
    provide: FIREBASE_ADMIN,
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
      const logger = new Logger('FirebaseProvider');
      const serviceAccountPath = configService.get<string>(
        'FIREBASE_SERVICE_ACCOUNT_PATH',
      );
      const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');
      const storageBucket = configService.get<string>('FIREBASE_STORAGE_BUCKET');
      const privateKey = configService
        .get<string>('FIREBASE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n');

      // Allow the app to boot without Firebase credentials (e.g. local dev).
      if (!admin.apps.length) {
        try {
          if (serviceAccountPath) {
            const raw = readFileSync(serviceAccountPath, 'utf8');
            const serviceAccount = JSON.parse(raw) as {
              project_id?: string;
              client_email?: string;
              private_key?: string;
            };

            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
              storageBucket: storageBucket || undefined,
            });
          } else {
            // Fall back to env-var based config.
            if (!projectId || !clientEmail || !privateKey) {
              return admin;
            }

            // Avoid crashing the whole app on invalid placeholder keys.
            if (!looksLikePemPrivateKey(privateKey)) {
              return admin;
            }

            admin.initializeApp({
              credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
              }),
              storageBucket: storageBucket || undefined,
            });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logger.warn(`Firebase Admin init failed: ${message}`);
          return admin;
        }
      }

      return admin;
    },
  },
  {
    provide: FIRESTORE,
    inject: [FIREBASE_ADMIN],
    useFactory: (adminApp: typeof admin) => {
      if (!adminApp.apps?.length) return null;
      return adminApp.firestore();
    },
  },
];