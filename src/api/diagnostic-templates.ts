import { z } from 'zod';
import { apiClient } from './client';

const TemplateFieldTypeEnum = z.enum([
  'text',
  'number',
  'boolean',
  'select',
  'multiselect',
  'date',
  'scale',
]);

export const DiagnosticTemplateFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: TemplateFieldTypeEnum,
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const DiagnosticTemplateSectionSchema = z.object({
  title: z.string(),
  fields: z.array(DiagnosticTemplateFieldSchema),
});

export const DiagnosticTemplateSchemaSchema = z.object({
  sections: z.array(DiagnosticTemplateSectionSchema),
});

export const DiagnosticTemplateResponseDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  specialist_type: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  version: z.number(),
  is_active: z.boolean(),
  schema: DiagnosticTemplateSchemaSchema,
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const DiagnosticTemplateListResponseSchema = z.object({
  items: z.array(DiagnosticTemplateResponseDtoSchema),
  next_cursor: z.string().nullable(),
});

export type TemplateFieldType = z.infer<typeof TemplateFieldTypeEnum>;
export type DiagnosticTemplateField = z.infer<typeof DiagnosticTemplateFieldSchema>;
export type DiagnosticTemplateSection = z.infer<typeof DiagnosticTemplateSectionSchema>;
export type DiagnosticTemplateSchema = z.infer<typeof DiagnosticTemplateSchemaSchema>;
export type DiagnosticTemplate = z.infer<typeof DiagnosticTemplateResponseDtoSchema>;
export type DiagnosticTemplateListResponse = z.infer<typeof DiagnosticTemplateListResponseSchema>;

export { TemplateFieldTypeEnum };

export interface DiagnosticTemplateListFilters {
  specialist_type?: string;
  is_active?: boolean;
  cursor?: string;
  limit?: number;
}

export interface CreateDiagnosticTemplateBody {
  specialist_type: string;
  name: string;
  description?: string;
  schema: DiagnosticTemplateSchema;
}

export interface UpdateDiagnosticTemplateBody {
  name?: string;
  description?: string | null;
  schema?: DiagnosticTemplateSchema;
}

export async function listDiagnosticTemplates(
  filters: DiagnosticTemplateListFilters = {},
): Promise<DiagnosticTemplateListResponse> {
  const searchParams: Record<string, string> = {};
  if (filters.specialist_type !== undefined) searchParams.specialist_type = filters.specialist_type;
  if (filters.is_active !== undefined) searchParams.is_active = String(filters.is_active);
  if (filters.cursor !== undefined) searchParams.cursor = filters.cursor;
  if (filters.limit !== undefined) searchParams.limit = String(filters.limit);

  const data: unknown = await apiClient.get('admin/diagnostic-templates', { searchParams }).json();
  return DiagnosticTemplateListResponseSchema.parse(data);
}

export async function getDiagnosticTemplate(id: string): Promise<DiagnosticTemplate> {
  const data: unknown = await apiClient.get(`admin/diagnostic-templates/${id}`).json();
  return DiagnosticTemplateResponseDtoSchema.parse(data);
}

export async function createDiagnosticTemplate(
  body: CreateDiagnosticTemplateBody,
): Promise<DiagnosticTemplate> {
  const data: unknown = await apiClient.post('admin/diagnostic-templates', { json: body }).json();
  return DiagnosticTemplateResponseDtoSchema.parse(data);
}

export async function updateDiagnosticTemplate(
  id: string,
  body: UpdateDiagnosticTemplateBody,
): Promise<DiagnosticTemplate> {
  const data: unknown = await apiClient
    .patch(`admin/diagnostic-templates/${id}`, { json: body })
    .json();
  return DiagnosticTemplateResponseDtoSchema.parse(data);
}

export async function deactivateDiagnosticTemplate(id: string): Promise<DiagnosticTemplate> {
  const data: unknown = await apiClient.post(`admin/diagnostic-templates/${id}/deactivate`).json();
  return DiagnosticTemplateResponseDtoSchema.parse(data);
}
