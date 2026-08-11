import { z } from 'zod';

export const workspaceInfoSchema = z.object({
  name: z.string().min(1),
});

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
});
