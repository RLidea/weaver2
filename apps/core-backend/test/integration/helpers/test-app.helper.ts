import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import { CoreModule } from '../../../src/core.module';
import { setNestApp } from '@weaver2/common/global/nest.config';
import cookieParser from 'cookie-parser';

let app: INestApplication;
let testingModule: TestingModule;

export async function createTestApp(): Promise<INestApplication> {
  testingModule = await Test.createTestingModule({
    imports: [CoreModule],
  }).compile();

  app = testingModule.createNestApplication();
  app.use(cookieParser());
  app.enableVersioning({ type: VersioningType.URI, prefix: 'v' });
  setNestApp(app);
  await app.init();
  return app;
}

export async function closeTestApp(): Promise<void> {
  await app?.close();
}

export function getTestApp(): INestApplication {
  return app;
}

export function getTestingModule(): TestingModule {
  return testingModule;
}
