import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client;
  private readonly bucketName = process.env.R2_BUCKET_NAME;
  private readonly publicDomain = process.env.R2_PUBLIC_DOMAIN;

  constructor() {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<{ url: string; filename: string; mimetype: string; size: number }> {
    const filename = `${uuidv4()}${extname(file.originalname)}`;
    
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: filename,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      // If a public domain is configured (e.g., https://cdn.domain.com), use it.
      // Otherwise, we fallback to a relative path or the direct R2 URL (which might not be public).
      // For R2, public buckets have a public development URL or a custom domain.
      const url = this.publicDomain 
        ? `${this.publicDomain}/${filename}` 
        : `https://pub-${this.bucketName}.r2.dev/${filename}`; // Fallback to a typical R2 pub dev url pattern if no domain provided. Ideally they set R2_PUBLIC_DOMAIN.

      return {
        url,
        filename,
        mimetype: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      console.error('S3 Upload Error:', error);
      throw new InternalServerErrorException('Failed to upload file to Cloudflare R2');
    }
  }
}
