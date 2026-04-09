import 'reflect-metadata';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.SIX1_CORE_API_DB_HOST,
  port: Number(process.env.SIX1_CORE_API_DB_PORT ?? 3306),
  username: process.env.SIX1_CORE_API_DB_USERNAME,
  password: process.env.SIX1_CORE_API_DB_PASSWORD,
  database: process.env.SIX1_CORE_API_DB_DATABASE,
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
  entities: ['dist/**/*.entity.js', 'src/**/*.entity.ts'],
  migrations:
    process.env.NODE_ENV === 'production'
      ? ['dist/db/migrations/*.js']
      : ['src/db/migrations/*.ts'],
});

