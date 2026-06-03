import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  listDiagnosticTemplates,
  getDiagnosticTemplate,
  createDiagnosticTemplate,
  updateDiagnosticTemplate,
  deactivateDiagnosticTemplate,
} from '@/api/diagnostic-templates';
import type {
  DiagnosticTemplateListFilters,
  CreateDiagnosticTemplateBody,
  UpdateDiagnosticTemplateBody,
} from '@/api/diagnostic-templates';
import { qk } from './query-keys';

export type {
  DiagnosticTemplate,
  DiagnosticTemplateField,
  DiagnosticTemplateSection,
  DiagnosticTemplateSchema,
  DiagnosticTemplateListResponse,
  DiagnosticTemplateListFilters,
  CreateDiagnosticTemplateBody,
  UpdateDiagnosticTemplateBody,
  TemplateFieldType,
} from '@/api/diagnostic-templates';

export {
  DiagnosticTemplateSchemaSchema,
  DiagnosticTemplateFieldSchema,
  DiagnosticTemplateSectionSchema,
  TemplateFieldTypeEnum,
} from '@/api/diagnostic-templates';

const FIVE_MINUTES = 5 * 60 * 1000;

export function useDiagnosticTemplates(
  filters: Omit<DiagnosticTemplateListFilters, 'cursor'> = {},
) {
  return useInfiniteQuery({
    queryKey: qk.diagnosticTemplates.list(filters),
    queryFn: ({ pageParam }) =>
      listDiagnosticTemplates({ ...filters, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: FIVE_MINUTES,
  });
}

export function useDiagnosticTemplate(id: string | undefined) {
  return useQuery({
    queryKey: qk.diagnosticTemplates.detail(id ?? ''),
    queryFn: () => getDiagnosticTemplate(id!),
    enabled: !!id,
  });
}

export function useCreateDiagnosticTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDiagnosticTemplateBody) => createDiagnosticTemplate(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.diagnosticTemplates.all });
    },
  });
}

export function useUpdateDiagnosticTemplate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateDiagnosticTemplateBody) => updateDiagnosticTemplate(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: qk.diagnosticTemplates.detail(id),
      });
      void queryClient.invalidateQueries({ queryKey: qk.diagnosticTemplates.all });
    },
  });
}

export function useDeactivateDiagnosticTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateDiagnosticTemplate(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: qk.diagnosticTemplates.detail(id),
      });
      void queryClient.invalidateQueries({ queryKey: qk.diagnosticTemplates.all });
    },
  });
}
