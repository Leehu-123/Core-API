import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { extname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName = process.env.R2_BUCKET_NAME;
  private readonly publicDomain = process.env.R2_PUBLIC_DOMAIN;

  constructor() {
    if (process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
      });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<{ url: string; filename: string; mimetype: string; size: number }> {
    const filename = `${uuidv4()}${extname(file.originalname)}`;

    // Try Cloudflare R2 if configured
    if (this.s3Client && this.bucketName) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: filename,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
        );

        const url = this.publicDomain 
          ? `${this.publicDomain}/${filename}` 
          : `https://pub-${this.bucketName}.r2.dev/${filename}`;

        return {
          url,
          filename: file.originalname || filename,
          mimetype: file.mimetype,
          size: file.size,
        };
      } catch (error) {
        console.error('S3/R2 Upload Error, falling back to local storage:', error);
      }
    }

    // Local file fallback
    try {
      const uploadDir = join(process.cwd(), 'uploads');
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = join(uploadDir, filename);
      writeFileSync(filePath, file.buffer);

      const serverDomain = process.env.CORE_API_URL || 'https://coreapi.ldhuy.name.vn';
      const url = `${serverDomain}/uploads/${filename}`;

      return {
        url,
        filename: file.originalname || filename,
        mimetype: file.mimetype,
        size: file.size,
      };
    } catch (localError) {
      console.error('Local File Save Error:', localError);
      throw new InternalServerErrorException('Failed to save file');
    }
  }
}
