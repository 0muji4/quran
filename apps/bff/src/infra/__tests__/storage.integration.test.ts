import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { Client as MinioClient } from 'minio';
import {
  getDatabasePool,
  getMinioClient,
  ensureBucketPolicy,
  recordUploadKey,
  findSessionIdForUploadKey,
  deleteUserData,
  resetDatabasePool
} from '../storage';
import { setupTestDB, setupTestMinIO } from '../../__tests__/setup';

// Check if PostgreSQL is available
const isPostgresAvailable = async (): Promise<boolean> => {
  const testPool = new Pool({
    host: process.env.TEST_POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.TEST_POSTGRES_PORT || '5432'),
    user: process.env.TEST_POSTGRES_USER || 'app',
    password: process.env.TEST_POSTGRES_PASSWORD || 'app',
    database: 'postgres',
    connectionTimeoutMillis: 2000
  });

  try {
    await testPool.query('SELECT 1');
    await testPool.end();
    return true;
  } catch {
    await testPool.end();
    return false;
  }
};

const postgresAvailable = await isPostgresAvailable();

describe.skipIf(!postgresAvailable)('storage integration', () => {
  let pool: Pool;
  let minioClient: MinioClient;
  let bucket: string;
  let dbCleanup: (() => Promise<void>) | undefined;
  let minioCleanup: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    // Setup test database
    const dbSetup = await setupTestDB();
    pool = dbSetup.pool;
    dbCleanup = dbSetup.cleanup;

    // Setup test MinIO
    const minioSetup = setupTestMinIO();
    minioClient = minioSetup.client;
    bucket = minioSetup.bucket;
    minioCleanup = minioSetup.cleanup;

    // Set environment variables for the storage module
    process.env.DATABASE_URL = `postgresql://${pool.options.user}:${pool.options.password}@${pool.options.host}:${pool.options.port}/${pool.options.database}`;
    process.env.MINIO_ENDPOINT = `${minioClient.host}:${minioClient.port}`;
    process.env.MINIO_ACCESS_KEY = minioClient.accessKey;
    process.env.MINIO_SECRET_KEY = minioClient.secretKey;
    process.env.MINIO_BUCKET = bucket;
    process.env.MINIO_SECURE = 'false';
    process.env.MINIO_APPLY_BUCKET_POLICY = 'false'; // Skip policy for faster tests

    // Create bucket for tests
    await minioClient.makeBucket(bucket, '');
  });

  afterAll(async () => {
    // Close the storage singleton pool so dbCleanup can drop the test database
    // without "being accessed by other users" / pg_terminate_backend races.
    await resetDatabasePool();
    if (dbCleanup) await dbCleanup();
    if (minioCleanup) await minioCleanup();
  });

  beforeEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM user_data_objects');
  });

  describe('getDatabasePool', () => {
    it('returns a pool instance', () => {
      const result = getDatabasePool();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('query');
    });

    it('returns the same pool on subsequent calls', () => {
      const pool1 = getDatabasePool();
      const pool2 = getDatabasePool();

      expect(pool1).toBe(pool2);
    });
  });

  describe('getMinioClient', () => {
    it('returns a MinIO client instance', () => {
      const result = getMinioClient();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('putObject');
      expect(result).toHaveProperty('getObject');
    });

    it('returns the same client on subsequent calls', () => {
      const client1 = getMinioClient();
      const client2 = getMinioClient();

      expect(client1).toBe(client2);
    });
  });

  describe('ensureBucketPolicy', () => {
    it('creates bucket if it does not exist', async () => {
      const newBucket = `test-new-bucket-${Date.now()}`;
      process.env.MINIO_BUCKET = newBucket;

      await ensureBucketPolicy();

      const exists = await minioClient.bucketExists(newBucket);
      expect(exists).toBe(true);

      // Cleanup
      await minioClient.removeBucket(newBucket);
      process.env.MINIO_BUCKET = bucket;
    });

    it('does not throw if bucket already exists', async () => {
      await expect(ensureBucketPolicy()).resolves.not.toThrow();
    });

    it('applies bucket policy when MINIO_APPLY_BUCKET_POLICY is true', async () => {
      process.env.MINIO_APPLY_BUCKET_POLICY = 'true';
      process.env.MINIO_UPLOAD_PREFIX = 'uploads/';

      await ensureBucketPolicy();

      const policy = await minioClient.getBucketPolicy(bucket);
      expect(policy).toBeDefined();
      expect(policy).toContain('uploads/*');

      process.env.MINIO_APPLY_BUCKET_POLICY = 'false';
    });
  });

  describe('recordUploadKey', () => {
    it('inserts new upload record', async () => {
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      await recordUploadKey({
        sessionId: 'session-123',
        userId: 'user-456',
        audioKey: 'uploads/test.opus',
        expiresAt
      });

      const result = await pool.query('SELECT * FROM user_data_objects WHERE session_id = $1', [
        'session-123'
      ]);

      expect(result.rowCount).toBe(1);
      expect(result.rows[0]).toMatchObject({
        session_id: 'session-123',
        user_id: 'user-456',
        audio_key: 'uploads/test.opus'
      });
    });

    it('updates existing upload record on conflict', async () => {
      const expiresAt1 = new Date(Date.now() + 3600000);
      const expiresAt2 = new Date(Date.now() + 7200000);

      // Insert first record
      await recordUploadKey({
        sessionId: 'session-789',
        userId: 'user-111',
        audioKey: 'uploads/first.opus',
        expiresAt: expiresAt1
      });

      // Update with new data
      await recordUploadKey({
        sessionId: 'session-789',
        userId: 'user-222',
        audioKey: 'uploads/second.opus',
        expiresAt: expiresAt2
      });

      const result = await pool.query('SELECT * FROM user_data_objects WHERE session_id = $1', [
        'session-789'
      ]);

      expect(result.rowCount).toBe(1);
      expect(result.rows[0]).toMatchObject({
        session_id: 'session-789',
        user_id: 'user-222',
        audio_key: 'uploads/second.opus'
      });
    });

    it('handles null userId', async () => {
      const expiresAt = new Date(Date.now() + 3600000);

      await recordUploadKey({
        sessionId: 'session-null-user',
        userId: null,
        audioKey: 'uploads/anonymous.opus',
        expiresAt
      });

      const result = await pool.query('SELECT * FROM user_data_objects WHERE session_id = $1', [
        'session-null-user'
      ]);

      expect(result.rowCount).toBe(1);
      expect(result.rows[0].user_id).toBeNull();
    });
  });

  describe('findSessionIdForUploadKey', () => {
    beforeEach(async () => {
      // Insert test data
      const expiresAt = new Date(Date.now() + 3600000);

      await pool.query(
        `INSERT INTO user_data_objects (session_id, user_id, audio_key, expires_at)
         VALUES ($1, $2, $3, $4)`,
        ['session-with-user', 'user-123', 'uploads/with-user.opus', expiresAt]
      );

      await pool.query(
        `INSERT INTO user_data_objects (session_id, user_id, audio_key, expires_at)
         VALUES ($1, $2, $3, $4)`,
        ['session-without-user', null, 'uploads/without-user.opus', expiresAt]
      );
    });

    it('finds session by audio key with userId', async () => {
      const result = await findSessionIdForUploadKey({
        audioKey: 'uploads/with-user.opus',
        userId: 'user-123'
      });

      expect(result).toBe('session-with-user');
    });

    it('finds session by audio key without userId', async () => {
      const result = await findSessionIdForUploadKey({
        audioKey: 'uploads/without-user.opus'
      });

      expect(result).toBe('session-without-user');
    });

    it('returns null when audio key not found', async () => {
      const result = await findSessionIdForUploadKey({
        audioKey: 'uploads/nonexistent.opus'
      });

      expect(result).toBeNull();
    });

    it('returns null when userId does not match', async () => {
      const result = await findSessionIdForUploadKey({
        audioKey: 'uploads/with-user.opus',
        userId: 'wrong-user'
      });

      expect(result).toBeNull();
    });

    it('handles null userId in query', async () => {
      const result = await findSessionIdForUploadKey({
        audioKey: 'uploads/with-user.opus',
        userId: null
      });

      expect(result).toBe('session-with-user');
    });
  });

  describe('deleteUserData', () => {
    beforeEach(async () => {
      const expiresAt = new Date(Date.now() + 3600000);

      // Insert test record
      await pool.query(
        `INSERT INTO user_data_objects (session_id, user_id, audio_key, alignment_object_key, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'session-delete',
          'user-delete',
          'uploads/delete.opus',
          'alignments/delete.json',
          expiresAt
        ]
      );

      // Upload test objects to MinIO
      await minioClient.putObject(bucket, 'uploads/delete.opus', Buffer.from('test audio data'));
      await minioClient.putObject(
        bucket,
        'alignments/delete.json',
        Buffer.from(JSON.stringify({ test: 'alignment' }))
      );
    });

    it('deletes user data from database and MinIO', async () => {
      const result = await deleteUserData({
        sessionId: 'session-delete',
        userId: 'user-delete'
      });

      expect(result).toEqual({
        audioKey: 'uploads/delete.opus',
        alignmentKey: 'alignments/delete.json'
      });

      // Verify database deletion
      const dbResult = await pool.query('SELECT * FROM user_data_objects WHERE session_id = $1', [
        'session-delete'
      ]);
      expect(dbResult.rowCount).toBe(0);

      // Verify MinIO object deletion
      await expect(minioClient.statObject(bucket, 'uploads/delete.opus')).rejects.toThrow();
      await expect(minioClient.statObject(bucket, 'alignments/delete.json')).rejects.toThrow();
    });

    it('deletes only audio when alignment is null', async () => {
      const expiresAt = new Date(Date.now() + 3600000);

      await pool.query(
        `INSERT INTO user_data_objects (session_id, user_id, audio_key, alignment_object_key, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        ['session-audio-only', 'user-audio', 'uploads/audio-only.opus', null, expiresAt]
      );

      await minioClient.putObject(bucket, 'uploads/audio-only.opus', Buffer.from('test audio'));

      const result = await deleteUserData({
        sessionId: 'session-audio-only',
        userId: 'user-audio'
      });

      expect(result).toEqual({
        audioKey: 'uploads/audio-only.opus',
        alignmentKey: null
      });

      await expect(minioClient.statObject(bucket, 'uploads/audio-only.opus')).rejects.toThrow();
    });

    it('returns null when session not found', async () => {
      const result = await deleteUserData({
        sessionId: 'nonexistent-session',
        userId: 'user-123'
      });

      expect(result).toBeNull();
    });

    it('returns null when userId does not match', async () => {
      const result = await deleteUserData({
        sessionId: 'session-delete',
        userId: 'wrong-user'
      });

      expect(result).toBeNull();
    });

    it('handles MinIO deletion errors gracefully', async () => {
      const expiresAt = new Date(Date.now() + 3600000);

      await pool.query(
        `INSERT INTO user_data_objects (session_id, user_id, audio_key, expires_at)
         VALUES ($1, $2, $3, $4)`,
        ['session-missing-object', 'user-missing', 'uploads/missing.opus', expiresAt]
      );

      // Object doesn't exist in MinIO, but should still delete from DB
      const result = await deleteUserData({
        sessionId: 'session-missing-object',
        userId: 'user-missing'
      });

      expect(result).toEqual({
        audioKey: 'uploads/missing.opus',
        alignmentKey: null
      });

      // Verify database deletion
      const dbResult = await pool.query('SELECT * FROM user_data_objects WHERE session_id = $1', [
        'session-missing-object'
      ]);
      expect(dbResult.rowCount).toBe(0);
    });
  });
});
