import { z } from "zod";
import { FIC_CANON, FIC_RATINGS, FIC_TYPES, GAUNTLET_BUCKETS, WORK_SOURCES } from "@/db/schema";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters")
  .max(20, "At most 20 characters")
  .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers and underscores only");

export const signupSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters").max(200),
  displayName: z.string().trim().min(1).max(50).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const logSchema = z.object({
  rating: z.coerce.number().int().min(1).max(10).nullish(),
  bucket: z.enum(GAUNTLET_BUCKETS).nullish(),
  score: z.coerce.number().min(0).max(10).nullish(),
  reaction: z.string().trim().max(280).optional(),
  reviewBody: z.string().trim().max(20_000).optional(),
  hasSpoilers: z.coerce.boolean().default(false),
  loggedOn: z.coerce.date().optional(),
});

export const reactionSchema = z.object({
  body: z.string().trim().min(1, "Say something").max(280),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  parentId: z.string().optional(),
});

export const listSchema = z.object({
  title: z.string().trim().min(1, "Give it a title").max(120),
  description: z.string().trim().max(2000).optional(),
  isRanked: z.coerce.boolean().default(false),
});

export const ficSchema = z.object({
  title: z.string().trim().min(1, "Give it a title").max(160),
  summary: z.string().trim().max(1000).optional(),
  type: z.enum(FIC_TYPES),
  rating: z.enum(FIC_RATINGS).default("general"),
  canon: z.enum(FIC_CANON).default("canon-divergent"),
  tone: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
  pairing: z.string().trim().max(80).optional(),
  chapterTitle: z.string().trim().max(160).optional(),
  body: z.string().trim().min(1, "Write something").max(200_000),
});

export const chapterSchema = z.object({
  title: z.string().trim().max(160).optional(),
  body: z.string().trim().min(1, "Write something").max(200_000),
});

export const importWorkSchema = z.object({
  source: z.enum(WORK_SOURCES),
  externalId: z.string().min(1),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LogInput = z.infer<typeof logSchema>;
export type FicInput = z.infer<typeof ficSchema>;
