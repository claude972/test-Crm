import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export const HERMES_MEDIA_FORMATS = {
  IMAGE: {
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
    max: 5 * 1024 * 1024,
  },
  VIDEO: { mimes: ['video/mp4'], max: 16 * 1024 * 1024 },
  FILE: {
    mimes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    max: 20 * 1024 * 1024,
  },
  AUDIO: {
    mimes: ['audio/ogg', 'audio/opus', 'audio/mpeg', 'audio/mp4', 'audio/webm'],
    max: 16 * 1024 * 1024,
  },
} as const;
export const mediaKindSchema = z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'FILE']);
export const mediaScopeSchema = z
  .object({ conversationId: z.string().uuid(), assetId: z.string().uuid() })
  .strict();
export const prepareMediaSchema = z
  .object({
    conversationId: z.string().uuid(),
    kind: mediaKindSchema,
    filename: z
      .string()
      .min(1)
      .max(160)
      .regex(/^[^\\/\x00-\x1f\x7f]+$/),
    mimeType: z.string().min(1).max(80),
    size: z.number().int().positive(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const format = HERMES_MEDIA_FORMATS[input.kind];
    if (
      !(format.mimes as readonly string[]).includes(input.mimeType) ||
      input.size > format.max
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MEDIA_FORMAT_OR_SIZE_UNSUPPORTED',
      });
  });
export type HermesPrepareMediaInput = z.infer<typeof prepareMediaSchema>;
export type HermesMediaScopeInput = z.infer<typeof mediaScopeSchema>;
export const parseMedia = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new BadRequestException('INVALID_MEDIA_INPUT');
  return parsed.data;
};
