import { Global, Module } from '@nestjs/common';
import { firebaseProviders } from './firebase.provider';

@Global()
@Module({
  providers: [...firebaseProviders],
  exports: [...firebaseProviders],
})
export class FirebaseModule {}