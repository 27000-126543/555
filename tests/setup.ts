import 'reflect-metadata';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

process.env.NODE_ENV = 'test';

beforeAll(async () => {
  jest.setTimeout(30000);
});

afterAll(async () => {
  jest.clearAllTimers();
});
