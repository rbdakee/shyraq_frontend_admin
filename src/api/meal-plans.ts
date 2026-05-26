import { z } from 'zod';
import { apiClient } from './client';

export const MultiLangTextDtoSchema = z
  .object({
    ru: z.string(),
    kk: z.string().optional(),
    en: z.string().optional(),
  })
  .passthrough();

const MealTypeEnum = z.enum(['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner']);

const MealPlanSourceEnum = z.enum(['manual', 'cron', 'copied']);

export const MealItemResponseDtoSchema = z.object({
  id: z.string(),
  meal_type: MealTypeEnum,
  dish_name: MultiLangTextDtoSchema,
  description: MultiLangTextDtoSchema.nullable().optional(),
  allergens: z.array(z.string()).nullable().optional(),
  photo_url: z.string().nullable().optional(),
  calories: z.number().nullable().optional(),
  position: z.number(),
});

export const MealPlanResponseDtoSchema = z.object({
  id: z.string(),
  date: z.string(),
  group_id: z.string().nullable().optional(),
  is_published: z.boolean(),
  notes: MultiLangTextDtoSchema.nullable().optional(),
  source: MealPlanSourceEnum,
  copied_from: z.string().nullable().optional(),
  items: z.array(MealItemResponseDtoSchema),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CopyWeekDtoSchema = z.object({
  fromMonday: z.string(),
});

export const CopyWeekSummaryDtoSchema = z.object({
  plans_created: z.number(),
  plans_skipped: z.number(),
});

export type MultiLangText = z.infer<typeof MultiLangTextDtoSchema>;
export type MealItem = z.infer<typeof MealItemResponseDtoSchema>;
export type MealPlan = z.infer<typeof MealPlanResponseDtoSchema>;
export type MealPlanCopyWeekSummary = z.infer<typeof CopyWeekSummaryDtoSchema>;

export interface MealPlanListFilters {
  date_from?: string;
  date_to?: string;
  group_id?: string;
}

export interface CreateMealPlanBody {
  date: string;
  group_id?: string;
  is_published?: boolean;
  notes?: MultiLangText | null;
  items?: CreateMealItemBody[];
}

export interface UpdateMealPlanBody {
  is_published?: boolean;
  notes?: MultiLangText | null;
}

export interface CreateMealItemBody {
  meal_type: MealItem['meal_type'];
  dish_name: MultiLangText;
  description?: MultiLangText | null;
  allergens?: string[];
  photo_url?: string;
  calories?: number;
  position?: number;
}

export interface UpdateMealItemBody {
  meal_type?: MealItem['meal_type'];
  dish_name?: MultiLangText;
  description?: MultiLangText | null;
  allergens?: string[];
  photo_url?: string | null;
  calories?: number | null;
  position?: number;
}

export interface CopyWeekBody {
  fromMonday: string;
}

export async function listMealPlans(filters: MealPlanListFilters = {}): Promise<MealPlan[]> {
  const searchParams: Record<string, string> = {};
  if (filters.date_from !== undefined) searchParams.date_from = filters.date_from;
  if (filters.date_to !== undefined) searchParams.date_to = filters.date_to;
  if (filters.group_id !== undefined) searchParams.group_id = filters.group_id;

  const data: unknown = await apiClient.get('admin/meal-plans', { searchParams }).json();
  return z.array(MealPlanResponseDtoSchema).parse(data);
}

export async function createMealPlan(body: CreateMealPlanBody): Promise<MealPlan> {
  const data: unknown = await apiClient.post('admin/meal-plans', { json: body }).json();
  return MealPlanResponseDtoSchema.parse(data);
}

export async function updateMealPlan(id: string, body: UpdateMealPlanBody): Promise<MealPlan> {
  const data: unknown = await apiClient.patch(`admin/meal-plans/${id}`, { json: body }).json();
  return MealPlanResponseDtoSchema.parse(data);
}

export async function deleteMealPlan(id: string): Promise<void> {
  await apiClient.delete(`admin/meal-plans/${id}`).json();
}

export async function createMealItem(planId: string, body: CreateMealItemBody): Promise<MealPlan> {
  const data: unknown = await apiClient
    .post(`admin/meal-plans/${planId}/items`, { json: body })
    .json();
  return MealPlanResponseDtoSchema.parse(data);
}

export async function updateMealItem(
  planId: string,
  itemId: string,
  body: UpdateMealItemBody,
): Promise<MealPlan> {
  const data: unknown = await apiClient
    .patch(`admin/meal-plans/${planId}/items/${itemId}`, { json: body })
    .json();
  return MealPlanResponseDtoSchema.parse(data);
}

export async function deleteMealItem(planId: string, itemId: string): Promise<void> {
  await apiClient.delete(`admin/meal-plans/${planId}/items/${itemId}`).json();
}

export async function copyMealWeek(body: CopyWeekBody): Promise<MealPlanCopyWeekSummary> {
  const data: unknown = await apiClient.post('admin/meal-plans/copy-week', { json: body }).json();
  return CopyWeekSummaryDtoSchema.parse(data);
}
