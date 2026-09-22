import { z } from "zod";
import {
  ACCESSIBILITY_KEYS,
  ALLOWED_EMAIL_DOMAINS,
  GENDER_TYPES,
  RANK_LETTERS,
  RATING_TAGS,
} from "./constants.js";

export const factStateSchema = z.enum(["yes", "no", "unknown"]);
export const genderTypeSchema = z.enum(GENDER_TYPES);
export const rankLetterSchema = z.enum(RANK_LETTERS);
export const accessibilityKeySchema = z.enum(ACCESSIBILITY_KEYS);
export const ratingTagSchema = z.enum(RATING_TAGS);

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string().min(1),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const ubcEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .refine((email) => {
    const domain = email.split("@")[1];
    return domain !== undefined && ALLOWED_EMAIL_DOMAINS.includes(domain as (typeof ALLOWED_EMAIL_DOMAINS)[number]);
  }, "Use a UBC email address (@student.ubc.ca or @ubc.ca).");

export const requestMagicLinkSchema = z.object({
  email: ubcEmailSchema,
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(20),
});

export const sessionUserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  role: z.enum(["USER", "ADMIN"]),
  emailDomain: z.string(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

export const boundsQuerySchema = z.object({
  west: z.coerce.number(),
  south: z.coerce.number(),
  east: z.coerce.number(),
  north: z.coerce.number(),
  q: z.string().trim().max(80).optional(),
  rank: rankLetterSchema.optional(),
  genderType: genderTypeSchema.optional(),
  stepFreeBuildingAccess: factStateSchema.optional(),
  accessibleStall: factStateSchema.optional(),
  grabBars: factStateSchema.optional(),
  automaticDoor: factStateSchema.optional(),
  elevatorAccess: factStateSchema.optional(),
  changingTable: factStateSchema.optional(),
});

export type MapQuery = z.infer<typeof boundsQuerySchema>;

export const accessibilityAttributeSchema = z.object({
  key: accessibilityKeySchema,
  value: factStateSchema,
  source: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  lastVerifiedAt: z.string(),
});

export const washroomSummarySchema = z.object({
  id: z.string(),
  buildingId: z.string(),
  buildingName: z.string(),
  buildingCode: z.string().nullable(),
  name: z.string(),
  floor: z.string(),
  directions: z.string(),
  genderType: genderTypeSchema,
  hours: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  voteCount: z.number(),
  bayesianScore: z.number().nullable(),
  rankLetter: rankLetterSchema.nullable(),
  confidence: z.enum(["none", "low", "medium", "high"]),
  attributes: z.array(accessibilityAttributeSchema),
});

export type WashroomSummary = z.infer<typeof washroomSummarySchema>;

export const buildingSummarySchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  centroidLat: z.number(),
  centroidLng: z.number(),
  footprint: z.unknown(),
  stepFreeAccess: factStateSchema,
  hours: z.string().nullable(),
  washroomCount: z.number(),
  bestRank: rankLetterSchema.nullable(),
});

export type BuildingSummary = z.infer<typeof buildingSummarySchema>;

export const mapPayloadSchema = z.object({
  buildings: z.array(buildingSummarySchema),
  washrooms: z.array(washroomSummarySchema),
});

export type MapPayload = z.infer<typeof mapPayloadSchema>;

export const ratingBreakdownSchema = z.object({
  cleanliness: z.number().nullable(),
  privacy: z.number().nullable(),
  availability: z.number().nullable(),
  overall: z.number().nullable(),
});

export const washroomDetailSchema = washroomSummarySchema.extend({
  buildingStepFreeAccess: factStateSchema,
  buildingHours: z.string().nullable(),
  lastVerifiedAt: z.string().nullable(),
  attributeSource: z.string().nullable(),
  breakdown: ratingBreakdownSchema,
  viewerRating: z
    .object({
      cleanliness: z.number(),
      privacy: z.number(),
      availability: z.number(),
      overall: z.number(),
      tags: z.array(ratingTagSchema),
    })
    .nullable(),
});

export type WashroomDetail = z.infer<typeof washroomDetailSchema>;

export const upsertRatingSchema = z.object({
  cleanliness: z.number().int().min(1).max(5),
  privacy: z.number().int().min(1).max(5),
  availability: z.number().int().min(1).max(5),
  overall: z.number().int().min(1).max(5),
  tags: z.array(ratingTagSchema).max(6).default([]),
});

export type UpsertRatingInput = z.infer<typeof upsertRatingSchema>;

export const createReportSchema = z.object({
  type: z.enum(["incorrect_access", "closed", "directions", "other"]),
  message: z.string().trim().min(8).max(800),
});

export const reportSchema = z.object({
  id: z.string(),
  washroomId: z.string(),
  washroomName: z.string(),
  buildingName: z.string(),
  type: z.string(),
  message: z.string(),
  status: z.enum(["open", "reviewed", "dismissed"]),
  createdAt: z.string(),
  reviewerNote: z.string().nullable(),
});

export const updateReportSchema = z.object({
  status: z.enum(["reviewed", "dismissed"]),
  reviewerNote: z.string().trim().max(400).optional(),
});
