#!/bin/sh
# Setup MinIO CORS configuration for development

set -e

echo "Waiting for MinIO to be ready..."
until mc alias set local http://minio:9000 minio minio123 2>/dev/null; do
  sleep 1
done

echo "Creating bucket if not exists..."
mc mb --ignore-existing local/quran-alignments

echo "Setting bucket policy..."
mc anonymous set download local/quran-alignments/uploads

echo "Setting CORS configuration..."
mc anonymous set-json /tmp/minio-cors.json local/quran-alignments || true

echo "MinIO setup complete!"
