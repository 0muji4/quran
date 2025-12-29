import { Client as MinioClient } from 'minio';
import { Pool } from 'pg';

let pool: Pool | null = null;
let minio: MinioClient | null = null;

const getPool = (): Pool | null => {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  pool = new Pool({ connectionString });
  return pool;
};

export const getMinioClient = (): MinioClient | null => {
  if (minio) return minio;
  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  if (!endpoint || !accessKey || !secretKey) return null;
  const secure = process.env.MINIO_SECURE?.toLowerCase() === 'true';
  minio = new MinioClient({
    endPoint: endpoint.split(':')[0],
    port: endpoint.includes(':') ? Number(endpoint.split(':')[1]) : undefined,
    accessKey,
    secretKey,
    useSSL: secure
  });
  return minio;
};

export const ensureBucketPolicy = async (): Promise<void> => {
  const bucket = process.env.MINIO_BUCKET;
  const uploadPrefix = process.env.MINIO_UPLOAD_PREFIX ?? 'uploads/';
  const applyPolicy = process.env.MINIO_APPLY_BUCKET_POLICY === 'true';
  const client = getMinioClient();
  if (!client || !bucket) return;

  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket, '');
  }

  if (!applyPolicy) return;

  const resource = `arn:aws:s3:::${bucket}/${uploadPrefix}*`;
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:PutObject'],
        Resource: [resource]
      }
    ]
  };

  await client.setBucketPolicy(bucket, JSON.stringify(policy));
};

export const recordUploadKey = async (input: {
  sessionId: string;
  userId: string | null;
  audioKey: string;
  expiresAt: Date;
}): Promise<void> => {
  const connection = getPool();
  if (!connection) return;
  await connection.query(
    `
    INSERT INTO user_data_objects (
      session_id, user_id, audio_key, expires_at, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT (session_id)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      audio_key = EXCLUDED.audio_key,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW();
    `,
    [input.sessionId, input.userId, input.audioKey, input.expiresAt]
  );
};

export const deleteUserData = async (input: {
  sessionId: string;
  userId: string;
}): Promise<{ audioKey: string; alignmentKey: string | null } | null> => {
  const connection = getPool();
  if (!connection) return null;

  const result = await connection.query(
    `
    SELECT audio_key, alignment_object_key
    FROM user_data_objects
    WHERE session_id = $1 AND user_id = $2
    `,
    [input.sessionId, input.userId]
  );

  if (result.rowCount === 0) return null;
  const { audio_key: audioKey, alignment_object_key: alignmentKey } = result.rows[0];

  await connection.query(
    `
    DELETE FROM user_data_objects
    WHERE session_id = $1 AND user_id = $2
    `,
    [input.sessionId, input.userId]
  );

  const bucket = process.env.MINIO_BUCKET;
  const client = getMinioClient();
  if (bucket && client) {
    await client.removeObject(bucket, audioKey);
    if (alignmentKey) {
      await client.removeObject(bucket, alignmentKey);
    }
  }

  return { audioKey, alignmentKey };
};
