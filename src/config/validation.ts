import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3003),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  BACKUP_ENABLED: Joi.string().valid('true', 'false').default('false'),
  BACKUP_TIME: Joi.string().default('02:00'),
  BACKUP_TIMEZONE: Joi.string().default('Asia/Bangkok'),
  BACKUP_RETENTION_DAYS: Joi.number().default(30),
  GOOGLE_DRIVE_CLIENT_ID: Joi.string().optional().allow(''),
  GOOGLE_DRIVE_CLIENT_SECRET: Joi.string().optional().allow(''),
  GOOGLE_DRIVE_REFRESH_TOKEN: Joi.string().optional().allow(''),
  GOOGLE_DRIVE_BACKUP_FOLDER_ID: Joi.string().optional().allow(''),
  CORS_ORIGINS: Joi.string().optional().allow(''),
});
