export class UploadNotFoundError extends Error {
  constructor() {
    super('upload not found');
    this.name = 'UploadNotFoundError';
  }
}
