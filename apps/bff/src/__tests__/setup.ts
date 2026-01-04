import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { Client as MinioClient } from 'minio';
import jwt from 'jsonwebtoken';
import type { UserSession } from '@quran-project/shared-ts';

// Test database setup
export const setupTestDB = async (): Promise<{ pool: Pool; cleanup: () => Promise<void> }> => {
  const dbName = `test_bff_${randomUUID().replace(/-/g, '_')}`;

  // Connect to default postgres database to create test database
  const adminPool = new Pool({
    host: process.env.TEST_POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.TEST_POSTGRES_PORT || '5432'),
    user: process.env.TEST_POSTGRES_USER || 'app',
    password: process.env.TEST_POSTGRES_PASSWORD || 'app',
    database: 'postgres'
  });

  try {
    await adminPool.query(`CREATE DATABASE ${dbName}`);
  } catch (error) {
    console.error('Failed to create test database:', error);
    throw error;
  }

  // Connect to the new test database
  const pool = new Pool({
    host: process.env.TEST_POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.TEST_POSTGRES_PORT || '5432'),
    user: process.env.TEST_POSTGRES_USER || 'app',
    password: process.env.TEST_POSTGRES_PASSWORD || 'app',
    database: dbName
  });

  // Create user_data_objects table
  await pool.query(`
    CREATE TABLE user_data_objects (
      session_id TEXT PRIMARY KEY,
      user_id TEXT,
      audio_key TEXT NOT NULL,
      alignment_object_key TEXT,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  const cleanup = async () => {
    await pool.end();
    await adminPool.query(`DROP DATABASE IF EXISTS ${dbName}`);
    await adminPool.end();
  };

  return { pool, cleanup };
};

// Test MinIO setup
export const setupTestMinIO = (): {
  client: MinioClient;
  bucket: string;
  cleanup: () => Promise<void>;
} => {
  const bucket = `test-bucket-${randomUUID()}`;

  const client = new MinioClient({
    endPoint: process.env.TEST_MINIO_ENDPOINT?.split(':')[0] || 'localhost',
    port: parseInt(process.env.TEST_MINIO_ENDPOINT?.split(':')[1] || '9000'),
    accessKey: process.env.TEST_MINIO_ACCESS_KEY || 'minio',
    secretKey: process.env.TEST_MINIO_SECRET_KEY || 'minio123',
    useSSL: false
  });

  const cleanup = async () => {
    try {
      // List and remove all objects in the bucket
      const objectsList = await client.listObjects(bucket, '', true);
      const objectsToDelete: string[] = [];

      for await (const obj of objectsList) {
        if (obj.name) {
          objectsToDelete.push(obj.name);
        }
      }

      if (objectsToDelete.length > 0) {
        await client.removeObjects(bucket, objectsToDelete);
      }

      // Remove the bucket
      await client.removeBucket(bucket);
    } catch (error) {
      // Bucket might not exist, ignore
      console.warn('Cleanup warning:', error);
    }
  };

  return { client, bucket, cleanup };
};

// JWT token generation for testing
export const generateTestToken = (session: Partial<UserSession>, secret: string = 'test-secret'): string => {
  const payload = {
    sub: session.id || 'test-user',
    email: session.email,
    name: session.displayName
  };

  return jwt.sign(payload, secret, { expiresIn: '1h' });
};

// Wait for async operations
export const waitFor = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
