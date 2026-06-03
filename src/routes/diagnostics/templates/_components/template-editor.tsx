import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  PlusIcon,
  TrashIcon,
  GripVerticalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AlertTriangleIcon,
  XIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { FieldErrorDisplay } from '@/components/forms/form-error';
import {
  useCreateDiagnosticTemplate,
  useUpdateDiagnosticTemplate,
  DiagnosticTemplateSchemaSchema,
  TemplateFieldTypeEnum,
} from '@/hooks/use-diagnostic-templates';
import type {
  DiagnosticTemplate,
  TemplateFieldType,
  UpdateDiagnosticTemplateBody,
} from '@/hooks/use-diagnostic-templates';
import { SPECIALIST_TYPES } from '@/lib/constants';
import { slugifyKey } from '@/lib/format';
import { isAppError, toI18nKey } from '@/lib/error-map';

const FIELD_TYPES = TemplateFieldTypeEnum.options;
const TYPES_WITH_OPTIONS: TemplateFieldType[] = ['select', 'multiselect'];
const TYPES_WITH_MINMAX: TemplateFieldType[] = ['number', 'scale'];

const TemplateFormSchema = z.object({
  specialist_type: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  schema: DiagnosticTemplateSchemaSchema.refine(
    (s) => {
      // Only manually-typed keys must be unique; blank keys are auto-derived from
      // the label on submit (see deriveSchemaKeys), so they don't count as dupes.
      const manualKeys = s.sections
        .flatMap((sec) => sec.fields.map((f) => f.key.trim()))
        .filter(Boolean);
      return manualKeys.length === new Set(manualKeys).size;
    },
    { message: 'duplicate_keys' },
  ),
});

type TemplateFormData = z.infer<typeof TemplateFormSchema>;

/**
 * Finalizes the schema before sending: fills blank field keys by slugifying the
 * label (fallback `field`), guarantees global key uniqueness with numeric
 * suffixes, and trims/drops empty option strings.
 */
function deriveSchemaKeys(schema: TemplateFormData['schema']): TemplateFormData['schema'] {
  const used = new Set<string>();
  return {
    sections: schema.sections.map((sec) => ({
      title: sec.title,
      fields: sec.fields.map((f) => {
        const base = f.key.trim() || slugifyKey(f.label) || 'field';
        let unique = base;
        let n = 2;
        while (used.has(unique)) unique = `${base}_${n++}`;
        used.add(unique);
        const options = f.options?.map((o) => o.trim()).filter(Boolean);
        return { ...f, key: unique, options: options && options.length > 0 ? options : undefined };
      }),
    })),
  };
}

function buildDefaultField() {
  return {
    key: '',
    label: '',
    type: 'text' as TemplateFieldType,
    required: false,
    options: undefined as string[] | undefined,
    min: undefined as number | undefined,
    max: undefined as number | undefined,
  };
}

function buildDefaultSection() {
  return {
    title: '',
    fields: [buildDefaultField()],
  };
}

function formDefaults(template?: DiagnosticTemplate): TemplateFormData {
  if (template) {
    return {
      specialist_type: template.specialist_type,
      name: template.name,
      description: template.description ?? '',
      schema: template.schema,
    };
  }
  return {
    specialist_type: '',
    name: '',
    description: '',
    schema: { sections: [buildDefaultSection()] },
  };
}

interface TemplateEditorProps {
  mode: 'create' | 'edit';
  template?: DiagnosticTemplate;
  schemaLocked?: boolean;
}

export function TemplateEditor({ mode, template, schemaLocked = false }: TemplateEditorProps) {
  const { t } = useTranslation(['diagnostics', 'staff', 'common', 'errors']);
  const navigate = useNavigate();
  const createMutation = useCreateDiagnosticTemplate();
  const updateMutation = useUpdateDiagnosticTemplate(template?.id ?? '');
  const [hasEntriesLock, setHasEntriesLock] = useState(schemaLocked);

  const isLocked = hasEntriesLock;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<TemplateFormData>({
    resolver: zodResolver(TemplateFormSchema),
    defaultValues: formDefaults(template),
  });

  const {
    fields: sections,
    append: appendSection,
    remove: removeSection,
    move: moveSection,
  } = useFieldArray({ control, name: 'schema.sections' });

  async function onSubmit(data: TemplateFormData) {
    const body = {
      ...data,
      description: data.description || undefined,
      schema: deriveSchemaKeys(data.schema),
    };
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(body);
        toast.success(t('diagnostics:form.create_success'));
        navigate('/diagnostics/templates');
      } else {
        const updateBody: UpdateDiagnosticTemplateBody = {
          name: body.name,
          description: body.description ?? null,
        };
        if (!isLocked) {
          updateBody.schema = body.schema;
        }
        await updateMutation.mutateAsync(updateBody);
        toast.success(t('diagnostics:form.update_success'));
        navigate('/diagnostics/templates');
      }
    } catch (err) {
      if (isAppError(err) && err.code === 'template_has_entries') {
        setHasEntriesLock(true);
        return;
      }
      if (isAppError(err)) {
        toast.error(t(toI18nKey(err)));
      } else {
        toast.error(t('errors:unknown_error'));
        console.error(err);
      }
    }
  }

  return (
    <div className="page">
      <div className="mb-3 flex items-center gap-2 text-[13px] text-[color:var(--text-3)]">
        <button
          type="button"
          className="hover:text-[color:var(--primary)]"
          onClick={() => navigate('/diagnostics/templates')}
        >
          {t('diagnostics:detail.breadcrumb')}
        </button>
        <ChevronRightIcon className="size-3 text-[color:var(--text-4)]" />
        <span className="text-[color:var(--text-1)]">
          {mode === 'create'
            ? t('diagnostics:form.create_title')
            : `${template?.name ?? ''} (v${template?.version ?? 1})`}
        </span>
      </div>

      {isLocked && (
        <div className="mb-4 flex items-start gap-3 rounded-[var(--r-lg)] border border-[var(--warning-soft-border)] bg-[var(--warning-soft)] p-4">
          <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-[color:var(--warning-text)]" />
          <div className="text-[13px] text-[color:var(--text-1)]">
            <div className="mb-1 font-semibold text-[color:var(--warning-text)]">
              {t('diagnostics:template_has_entries_banner_title')}
            </div>
            {t('diagnostics:template_has_entries_warning')}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('diagnostics:form.name')}
                    <span className="text-[color:var(--danger)]"> *</span>
                  </Label>
                  <Input
                    {...register('name')}
                    placeholder={t('diagnostics:form.name_placeholder')}
                  />
                  <FieldErrorDisplay message={errors.name?.message} />
                </div>
                <div>
                  <Label className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('diagnostics:form.specialist_type')}
                    <span className="text-[color:var(--danger)]"> *</span>
                  </Label>
                  <Controller
                    control={control}
                    name="specialist_type"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={mode === 'edit'}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t('diagnostics:form.specialist_type_placeholder')}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {SPECIALIST_TYPES.map((st) => (
                            <SelectItem key={st} value={st}>
                              {t(`staff:specialist_type.${st}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldErrorDisplay message={errors.specialist_type?.message} />
                </div>
              </div>
              <div className="mt-4">
                <Label className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('diagnostics:form.description')}
                </Label>
                <Textarea
                  {...register('description')}
                  rows={2}
                  placeholder={t('diagnostics:form.description_placeholder')}
                />
              </div>
            </div>

            <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-[color:var(--text-1)]">
                  {t('diagnostics:constructor.title')}
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isLocked}
                  onClick={() => appendSection(buildDefaultSection())}
                >
                  <PlusIcon className="size-3.5" />
                  {t('diagnostics:constructor.add_section')}
                </Button>
              </div>

              {errors.schema?.message === 'duplicate_keys' && (
                <p className="mb-3 text-[12px] text-[color:var(--danger-fg)]">
                  {t('diagnostics:constructor.duplicate_keys')}
                </p>
              )}

              <div className="flex flex-col gap-4">
                {sections.map((section, sIdx) => (
                  <SectionBlock
                    key={section.id}
                    sectionIndex={sIdx}
                    totalSections={sections.length}
                    control={control}
                    register={register}
                    errors={errors}
                    watch={watch}
                    locked={isLocked}
                    onRemove={() => removeSection(sIdx)}
                    onMoveUp={sIdx > 0 ? () => moveSection(sIdx, sIdx - 1) : undefined}
                    onMoveDown={
                      sIdx < sections.length - 1 ? () => moveSection(sIdx, sIdx + 1) : undefined
                    }
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {template && (
              <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4">
                <h3 className="mb-2 text-[14px] font-bold text-[color:var(--text-1)]">
                  {t('diagnostics:detail.version_label', { version: template.version })}
                </h3>
                <div className="text-[12.5px] text-[color:var(--text-3)]">
                  {t('diagnostics:status.active')}:{' '}
                  {template.is_active ? (
                    <Badge variant="success" dot>
                      {t('diagnostics:status.active')}
                    </Badge>
                  ) : (
                    <Badge variant="neutral" dot>
                      {t('diagnostics:status.inactive')}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4">
              <h3 className="mb-2 text-[14px] font-bold text-[color:var(--text-1)]">
                {t('diagnostics:constructor.field_types_ref')}
              </h3>
              <div className="flex flex-col gap-2 text-[12.5px]">
                {FIELD_TYPES.map((ft) => (
                  <div key={ft} className="flex items-center gap-2">
                    <Badge variant="neutral">{t(`diagnostics:field_type.${ft}`)}</Badge>
                    <span className="text-[color:var(--text-3)]">
                      {t(`diagnostics:field_type_hint.${ft}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button
            type="submit"
            disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
          >
            {t('diagnostics:form.save')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/diagnostics/templates')}
          >
            {t('diagnostics:form.cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface SectionBlockProps {
  sectionIndex: number;
  totalSections: number;
  control: ReturnType<typeof useForm<TemplateFormData>>['control'];
  register: ReturnType<typeof useForm<TemplateFormData>>['register'];
  errors: ReturnType<typeof useForm<TemplateFormData>>['formState']['errors'];
  watch: ReturnType<typeof useForm<TemplateFormData>>['watch'];
  locked: boolean;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function SectionBlock({
  sectionIndex,
  totalSections,
  control,
  register,
  errors,
  watch,
  locked,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SectionBlockProps) {
  const { t } = useTranslation('diagnostics');
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `schema.sections.${sectionIndex}.fields`,
  });

  return (
    <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-sunken)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <GripVerticalIcon className="size-3.5 shrink-0 text-[color:var(--text-4)]" />
        <div className="flex-1">
          <Input
            {...register(`schema.sections.${sectionIndex}.title`)}
            placeholder={t('constructor.section_title_placeholder')}
            disabled={locked}
            className="h-7 text-[13px] font-semibold"
          />
        </div>
        <Badge variant="neutral">{t('constructor.fields_count', { count: fields.length })}</Badge>
        <div className="flex items-center gap-1">
          {onMoveUp && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onMoveUp}
              disabled={locked}
            >
              <ChevronLeftIcon className="size-3 rotate-90" />
            </Button>
          )}
          {onMoveDown && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onMoveDown}
              disabled={locked}
            >
              <ChevronLeftIcon className="size-3 -rotate-90" />
            </Button>
          )}
          {totalSections > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onRemove}
              disabled={locked}
            >
              <TrashIcon className="size-3 text-[color:var(--danger)]" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {fields.map((field, fIdx) => (
          <FieldRow
            key={field.id}
            sectionIndex={sectionIndex}
            fieldIndex={fIdx}
            control={control}
            register={register}
            errors={errors}
            watch={watch}
            locked={locked}
            onRemove={() => remove(fIdx)}
            onMoveUp={fIdx > 0 ? () => move(fIdx, fIdx - 1) : undefined}
            onMoveDown={fIdx < fields.length - 1 ? () => move(fIdx, fIdx + 1) : undefined}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2"
        disabled={locked}
        onClick={() => append(buildDefaultField())}
      >
        <PlusIcon className="size-3.5" />
        {t('constructor.add_field')}
      </Button>
    </div>
  );
}

interface FieldRowProps {
  sectionIndex: number;
  fieldIndex: number;
  control: ReturnType<typeof useForm<TemplateFormData>>['control'];
  register: ReturnType<typeof useForm<TemplateFormData>>['register'];
  errors: ReturnType<typeof useForm<TemplateFormData>>['formState']['errors'];
  watch: ReturnType<typeof useForm<TemplateFormData>>['watch'];
  locked: boolean;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function FieldRow({
  sectionIndex,
  fieldIndex,
  control,
  register,
  errors,
  watch,
  locked,
  onRemove,
  onMoveUp,
  onMoveDown,
}: FieldRowProps) {
  const { t } = useTranslation('diagnostics');
  const prefix = `schema.sections.${sectionIndex}.fields.${fieldIndex}` as const;
  const fieldType = watch(`${prefix}.type`);
  const showOptions = TYPES_WITH_OPTIONS.includes(fieldType);
  const showMinMax = TYPES_WITH_MINMAX.includes(fieldType);
  const fieldErrors = errors.schema?.sections?.[sectionIndex]?.fields?.[fieldIndex];

  return (
    <div className="rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--bg-elev)] p-3">
      <div className="flex items-start gap-2">
        <GripVerticalIcon className="mt-1.5 size-3.5 shrink-0 text-[color:var(--text-4)]" />
        <div className="flex-1">
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <Input
                {...register(`${prefix}.label`)}
                placeholder={t('constructor.field_label_placeholder')}
                disabled={locked}
                className="h-7 text-[12.5px]"
              />
              <FieldErrorDisplay message={fieldErrors?.label?.message} />
            </div>
            <div>
              <Input
                {...register(`${prefix}.key`)}
                placeholder={t('constructor.field_key_placeholder')}
                disabled={locked}
                className="h-7 font-mono text-[12px]"
              />
              <FieldErrorDisplay message={fieldErrors?.key?.message} />
            </div>
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name={`${prefix}.type`}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={locked}>
                    <SelectTrigger className="h-7 w-full text-[12.5px]" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((ft) => (
                        <SelectItem key={ft} value={ft}>
                          {t(`field_type.${ft}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Controller
              control={control}
              name={`${prefix}.required`}
              render={({ field }) => (
                <label className="flex items-center gap-1.5 text-[12px] text-[color:var(--text-2)]">
                  <Switch
                    size="sm"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={locked}
                  />
                  {t('constructor.field_required')}
                </label>
              )}
            />

            {showMinMax && (
              <>
                <div className="w-20">
                  <Controller
                    control={control}
                    name={`${prefix}.min`}
                    render={({ field }) => (
                      <Input
                        type="number"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v === '' ? undefined : Number(v));
                        }}
                        placeholder={t('constructor.field_min')}
                        disabled={locked}
                        className="h-7 text-[12px]"
                      />
                    )}
                  />
                </div>
                <div className="w-20">
                  <Controller
                    control={control}
                    name={`${prefix}.max`}
                    render={({ field }) => (
                      <Input
                        type="number"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v === '' ? undefined : Number(v));
                        }}
                        placeholder={t('constructor.field_max')}
                        disabled={locked}
                        className="h-7 text-[12px]"
                      />
                    )}
                  />
                </div>
              </>
            )}
          </div>

          {showOptions && <OptionsEditor prefix={prefix} control={control} locked={locked} />}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {watch(`${prefix}.required`) && (
            <Badge variant="error" className="text-[10px]">
              {t('constructor.field_required')}
            </Badge>
          )}
          {onMoveUp && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onMoveUp}
              disabled={locked}
            >
              <ChevronLeftIcon className="size-3 rotate-90" />
            </Button>
          )}
          {onMoveDown && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onMoveDown}
              disabled={locked}
            >
              <ChevronLeftIcon className="size-3 -rotate-90" />
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon-xs" onClick={onRemove} disabled={locked}>
            <TrashIcon className="size-3 text-[color:var(--danger)]" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface OptionsEditorProps {
  prefix: string;
  control: ReturnType<typeof useForm<TemplateFormData>>['control'];
  locked: boolean;
}

function OptionsEditor({ prefix, control, locked }: OptionsEditorProps) {
  const { t } = useTranslation('diagnostics');
  return (
    <div className="mt-2 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--bg-sunken)] p-2.5">
      <div className="mb-1.5 text-[11.5px] font-semibold text-[color:var(--text-3)]">
        {t('constructor.field_options')}
      </div>
      <Controller
        control={control}
        name={`${prefix}.options` as `schema.sections.${number}.fields.${number}.options`}
        render={({ field }) => {
          const options = field.value ?? [];
          const update = (next: string[]) => field.onChange(next.length > 0 ? next : undefined);
          return (
            <div className="flex flex-col gap-1.5">
              {options.length === 0 && (
                <p className="text-[11.5px] text-[color:var(--text-4)]">
                  {t('constructor.no_options')}
                </p>
              )}
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-4 shrink-0 text-center text-[11px] text-[color:var(--text-4)]">
                    {i + 1}
                  </span>
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = e.target.value;
                      field.onChange(next);
                    }}
                    placeholder={t('constructor.option_placeholder')}
                    disabled={locked}
                    className="h-7 flex-1 text-[12px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={locked}
                    aria-label={t('constructor.remove_option')}
                    onClick={() => update(options.filter((_, idx) => idx !== i))}
                  >
                    <XIcon className="size-3 text-[color:var(--danger)]" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                disabled={locked}
                onClick={() => field.onChange([...options, ''])}
              >
                <PlusIcon className="size-3.5" />
                {t('constructor.add_option')}
              </Button>
            </div>
          );
        }}
      />
    </div>
  );
}
