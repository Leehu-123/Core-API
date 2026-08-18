import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Public } from '../../common/decorators';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Public() // Allow unauthenticated uploads for simplicity, or remove if token is sent
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        const allowedExts = ['jpg','jpeg','png','gif','webp','svg','bmp','ico','tiff','pdf','doc','docx','xls','xlsx','csv','txt','ppt','pptx','zip','rar','7z','tar','gz','mp4','mp3','wav','avi','mov','wmv','flv','mkv','ogg','aac','wma','json','xml','html','css','js','ts','rtf'];
        if (!ext || !allowedExts.includes(ext)) {
          return cb(new BadRequestException('Invalid file type!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    
    return await this.uploadService.uploadFile(file);
  }
}
