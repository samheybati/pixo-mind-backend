import type * as admin from 'firebase-admin';

export type AuthUser = {
  uid: string;
  email: string | null;
  emailVerified: boolean | null;
  name: string | null;
  picture: string | null;
  firebase: admin.auth.DecodedIdToken;
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

