import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { FIRESTORE } from '../firebase/firebase.provider';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: FIRESTORE,
          useValue: null,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
