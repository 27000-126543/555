import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: process.env.DB_TYPE as 'mysql' | 'postgres' | 'sqlite' || 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'streetlight',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  entities: [process.env.DB_ENTITIES || 'src/entities/**/*.ts'],
  migrations: [process.env.DB_MIGRATIONS || 'src/migrations/**/*.ts'],
  subscribers: [process.env.DB_SUBSCRIBERS || 'src/subscribers/**/*.ts'],
  timezone: process.env.DB_TIMEZONE || '+08:00',
  charset: process.env.DB_CHARSET || 'utf8mb4',
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
};

export default AppDataSource;
