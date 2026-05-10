import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type NeurosafeKind = "pdf" | "image" | "text" | "link";

export type NeurosafeMaterial = {
  id: string;
  title: string;
  description: string;
  contributorDisplay: string;
  createdAt: string;
  kind: NeurosafeKind;
  /** Plain text resource (shown in full on the detail card) */
  textBody?: string;
  /** data:… URL when a file was uploaded */
  fileDataUrl?: string;
  fileName?: string;
  mimeType?: string;
  externalUrl?: string;
};

const MAX_FILE_BYTES = 1_500_000;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/plain",
]);

function approxBase64Bytes(b64: string): number {
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return (b64.length * 3) / 4 - padding;
}

const seedMaterials: NeurosafeMaterial[] = [
  {
    id: "seed-checklist",
    title: "Classroom sensory checklist",
    description:
      "Questions educators can ask before sharing video or slides: lighting, pacing, captions, and clear opt-out paths.",
    contributorDisplay: "Brainway",
    createdAt: "2025-01-15T12:00:00.000Z",
    kind: "text",
    textBody:
      "• Is motion slow and predictable?\n• Are captions or a transcript available?\n• Can learners pause or step away without missing essential content?\n• Is there a static alternative if live video feels overwhelming?",
  },
  {
    id: "seed-colors",
    title: "Low-contrast color pairs for slides",
    description:
      "Reference combinations that reduce glare and visual noise for many autistic and migraine-prone learners.",
    contributorDisplay: "Brainway",
    createdAt: "2025-01-20T12:00:00.000Z",
    kind: "text",
    textBody:
      "Warm off-white (#f4f1ec) on deep slate (#2c3338)\nMuted sage (#c5cfc6) on charcoal (#1a1f1e)\nAvoid long reading sessions in pure white (#fff) on pure black (#000).",
  },
];

const materials: NeurosafeMaterial[] = [...seedMaterials];

const publishInputSchema = z
  .object({
    title: z.string().min(2).max(120),
    description: z.string().min(10).max(2000),
    contributorDisplay: z.string().max(80).optional(),
    kind: z.enum(["pdf", "image", "text", "link"]),
    externalUrl: z.string().max(2048).optional(),
    textBody: z.string().max(8000).optional(),
    /** Raw base64 (no data: prefix) */
    fileBase64: z.string().max(2_200_000).optional(),
    fileName: z.string().max(255).optional(),
    mimeType: z.string().max(120).optional(),
  })
  .superRefine((val, ctx) => {
    const urlTrimmed = val.externalUrl?.trim() ?? "";
    if (urlTrimmed) {
      try {
        const u = new URL(urlTrimmed);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Link must start with http:// or https://",
            path: ["externalUrl"],
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid link URL.",
          path: ["externalUrl"],
        });
      }
    }

    const hasUrl = urlTrimmed.length > 0;
    const hasText = val.textBody && val.textBody.trim().length > 0;
    const hasFile = val.fileBase64 && val.fileBase64.length > 0;
    if (!hasUrl && !hasText && !hasFile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a public link, text content, or a file.",
      });
    }
    if (hasFile) {
      if (!val.mimeType || !ALLOWED_MIME.has(val.mimeType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "File type not allowed. Use PDF, PNG, JPEG, WebP, GIF, or plain text.",
        });
      }
      if (approxBase64Bytes(val.fileBase64!) > MAX_FILE_BYTES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `File is too large (max ${Math.round(MAX_FILE_BYTES / 1024)} KB).`,
        });
      }
    }
  });

export const listNeurosafeMaterialsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<NeurosafeMaterial[]> => {
    return materials.map((m) => ({ ...m }));
  },
);

export const publishNeurosafeMaterialFn = createServerFn({ method: "POST" })
  .inputValidator(publishInputSchema)
  .handler(async ({ data }): Promise<NeurosafeMaterial> => {
    const contributor =
      data.contributorDisplay?.trim() || "Community member";

    let fileDataUrl: string | undefined;
    let fileName: string | undefined;
    let mimeType: string | undefined;
    if (data.fileBase64 && data.mimeType && ALLOWED_MIME.has(data.mimeType)) {
      fileDataUrl = `data:${data.mimeType};base64,${data.fileBase64}`;
      fileName = data.fileName?.trim() || "upload";
      mimeType = data.mimeType;
    }

    const urlTrimmed = data.externalUrl?.trim() ?? "";
    const externalUrl = urlTrimmed.length > 0 ? urlTrimmed : undefined;

    const textBody =
      data.textBody && data.textBody.trim().length > 0
        ? data.textBody.trim()
        : undefined;

    const entry: NeurosafeMaterial = {
      id: crypto.randomUUID(),
      title: data.title.trim(),
      description: data.description.trim(),
      contributorDisplay: contributor,
      createdAt: new Date().toISOString(),
      kind: data.kind,
      textBody,
      fileDataUrl,
      fileName,
      mimeType,
      externalUrl,
    };

    materials.unshift(entry);
    return { ...entry };
  });
