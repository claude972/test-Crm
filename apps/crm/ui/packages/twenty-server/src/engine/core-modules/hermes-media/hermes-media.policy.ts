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
    mimes: [
      'audio/ogg',
      'audio/opus',
      'audio/mpeg',
      'audio/mp4',
      'audio/webm',
      'video/webm',
    ],
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

// The media type without its parameters, lowercased.
//
// The native sniff reports codec parameters for some real containers: a genuine
// Opus voice note is detected as `audio/ogg; codecs=opus`, not `audio/ogg`.
// Comparing that whole string against a type is comparing a type to a type plus
// a codec, which rejects valid media. The essence is what identifies the format.
//
// This does not widen what is accepted. The allowlists in HERMES_MEDIA_FORMATS
// are unchanged and a declared MIME is still matched strictly against them; only
// the comparison between a declared type and a sniffed one, and the lookup of a
// sniffed type in the allowlist, ignore the parameters.
export const mediaMimeEssence = (value: string): string =>
  value.split(';')[0].trim().toLowerCase();

// Whether a sniffed MIME is one this kind accepts, ignoring codec parameters.
export const mediaMimeAllowed = (kind: string, detected: string): boolean => {
  const format = HERMES_MEDIA_FORMATS[kind as keyof typeof HERMES_MEDIA_FORMATS];

  return (
    format !== undefined &&
    (format.mimes as readonly string[]).includes(mediaMimeEssence(detected))
  );
};

// file-type identifies a WebM container as video/webm even for audio-only
// MediaRecorder output. Keep its authoritative detected MIME; never relabel bytes.
export const mediaMimeMatches = (
  kind: string,
  declared: string,
  detected: string,
): boolean => {
  const declaredEssence = mediaMimeEssence(declared);
  const detectedEssence = mediaMimeEssence(detected);

  return (
    declaredEssence === detectedEssence ||
    (kind === 'AUDIO' &&
      declaredEssence === 'audio/webm' &&
      detectedEssence === 'video/webm')
  );
};
