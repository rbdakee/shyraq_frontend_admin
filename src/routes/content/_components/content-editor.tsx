import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  SaveIcon,
  ClockIcon,
  CheckCircleIcon,
  Trash2Icon,
  ArrowLeftIcon,
  ChevronDownIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { PairedI18nField } from '@/components/forms/paired-i18n-field';
import { EntityCombobox } from '@/components/forms/entity-combobox';
import { MultipartMediaInput } from '@/components/forms/multipart-media-input';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';

import {
  useCreateContent,
  useUpdateContent,
  useDeleteContent,
  usePublishContent,
  useScheduleContent,
  ContentTypeEnum,
  ContentTargetTypeEnum,
  validateContentFiles,
} from '@/hooks/use-content';
import type { ContentPost, ContentType, ContentI18n } from '@/hooks/use-content';
import { useGroups } from '@/hooks/use-groups';
import { useChildrenList } from '@/hooks/use-children';
import type { ComboboxOption } from '@/components/forms/entity-combobox';
import { toI18nKey, isAppError } from '@/lib/error-map';

const STATUS_BADGE_MAP = {
  draft: 'neutral',
  scheduled: 'info',
  published: 'success',
} as const;

const ContentFormSchema = z
  .object({
    content_type: ContentTypeEnum,
    target_type: ContentTargetTypeEnum,
    target_group_id: z.string().nullable(),
    target_child_id: z.string().nullable(),
    title_i18n: z.object({ ru: z.string(), kk: z.string() }),
    body_i18n: z.object({ ru: z.string(), kk: z.string() }),
    expires_at: z.string().optional(),
    metadata_json: z.string().optional(),
    qundylyq_month: z.string().optional(),
    qundylyq_theme: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.target_type === 'group' && !d.target_group_id) return false;
      return true;
    },
    { path: ['target_group_id'], message: 'required' },
  )
  .refine(
    (d) => {
      if (d.target_type === 'child' && !d.target_child_id) return false;
      return true;
    },
    { path: ['target_child_id'], message: 'required' },
  );

type ContentFormValues = z.infer<typeof ContentFormSchema>;

interface ContentEditorProps {
  mode: 'create' | 'edit';
  post?: ContentPost;
}

function parseMetadata(post: ContentPost | undefined): {
  metadataJson: string;
  qundylyqMonth: string;
  qundylyqTheme: string;
} {
  if (!post?.metadata) return { metadataJson: '', qundylyqMonth: '', qundylyqTheme: '' };
  const md = post.metadata as Record<string, unknown>;
  const month = typeof md.month === 'string' ? md.month : '';
  const theme = typeof md.theme === 'string' ? md.theme : '';
  const rest = { ...md };
  delete rest.month;
  delete rest.theme;
  const jsonStr = Object.keys(rest).length > 0 ? JSON.stringify(rest, null, 2) : '';
  return { metadataJson: jsonStr, qundylyqMonth: month, qundylyqTheme: theme };
}

export function ContentEditor({ mode, post }: ContentEditorProps) {
  const { t } = useTranslation('content');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isPublished = post?.status === 'published';
  const isDraft = !post || post.status === 'draft';

  const presetType = searchParams.get('type') as ContentType | null;

  const { metadataJson, qundylyqMonth, qundylyqTheme } = parseMetadata(post);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ContentFormValues>({
    resolver: zodResolver(ContentFormSchema),
    defaultValues: {
      content_type: post?.content_type ?? presetType ?? 'news',
      target_type: post?.target_type ?? 'all',
      target_group_id: post?.target_group_id ?? null,
      target_child_id: post?.target_child_id ?? null,
      title_i18n: {
        ru: (post?.title_i18n as ContentI18n | null)?.ru ?? '',
        kk: (post?.title_i18n as ContentI18n | null)?.kk ?? '',
      },
      body_i18n: {
        ru: (post?.body_i18n as ContentI18n | null)?.ru ?? '',
        kk: (post?.body_i18n as ContentI18n | null)?.kk ?? '',
      },
      expires_at: post?.expires_at ?? '',
      metadata_json: metadataJson,
      qundylyq_month: qundylyqMonth,
      qundylyq_theme: qundylyqTheme,
    },
  });

  const contentType = useWatch({ control, name: 'content_type' });
  const targetType = useWatch({ control, name: 'target_type' });
  const isQundylyq = contentType === 'qundylyq';

  const [files, setFiles] = useState<File[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const createMutation = useCreateContent();
  const updateMutation = useUpdateContent(post?.id ?? '');
  const deleteMutation = useDeleteContent();
  const publishMutation = usePublishContent();
  const scheduleMutation = useScheduleContent();

  const groupsQuery = useGroups();
  const childrenQuery = useChildrenList({ status: 'active', limit: 100 });

  const fetchGroups = useCallback(
    async (query: string): Promise<ComboboxOption[]> => {
      const groups = groupsQuery.data ?? [];
      const lowerQ = query.toLowerCase();
      return groups
        .filter((g) => !lowerQ || g.name.toLowerCase().includes(lowerQ))
        .map((g) => ({ value: g.id, label: g.name }));
    },
    [groupsQuery.data],
  );

  const fetchChildren = useCallback(
    async (query: string): Promise<ComboboxOption[]> => {
      const children = childrenQuery.data?.data ?? [];
      const lowerQ = query.toLowerCase();
      return children
        .filter((c) => !lowerQ || (c.full_name ?? '').toLowerCase().includes(lowerQ))
        .slice(0, 30)
        .map((c) => ({ value: c.id, label: c.full_name ?? c.id }));
    },
    [childrenQuery.data],
  );

  function buildBody(vals: ContentFormValues) {
    let metadata: Record<string, unknown> | undefined;

    if (isQundylyq) {
      metadata = {
        month: vals.qundylyq_month || undefined,
        theme: vals.qundylyq_theme || undefined,
      };
    }

    if (vals.metadata_json) {
      try {
        const parsed: unknown = JSON.parse(vals.metadata_json);
        if (typeof parsed === 'object' && parsed !== null) {
          metadata = { ...metadata, ...(parsed as Record<string, unknown>) };
        }
      } catch {
        /* validated below */
      }
    }

    return {
      content_type: vals.content_type,
      target_type: vals.target_type,
      target_group_id:
        vals.target_type === 'group' ? (vals.target_group_id ?? undefined) : undefined,
      target_child_id:
        vals.target_type === 'child' ? (vals.target_child_id ?? undefined) : undefined,
      title_i18n: vals.title_i18n,
      body_i18n: vals.body_i18n,
      expires_at: vals.expires_at || undefined,
      metadata: metadata && Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  }

  function handleError(err: unknown) {
    if (isAppError(err)) {
      if ((err as { code: string }).code === 'content_target_invalid') {
        setError('target_group_id', {
          type: 'server',
          message: t('errors:content_target_invalid'),
        });
        setError('target_child_id', {
          type: 'server',
          message: t('errors:content_target_invalid'),
        });
        return;
      }
      const mapped = mapValidationErrors(err, setError);
      if (!mapped) {
        toast.error(t(toI18nKey(err)));
      }
    } else {
      toast.error(t('errors:unknown_error'));
      console.error(err);
    }
  }

  async function onSaveDraft(vals: ContentFormValues) {
    if (files.length > 0) {
      const ve = validateContentFiles(files);
      if (ve) {
        toast.error(t(`errors:${ve.code}`, { defaultValue: t(ve.code) }));
        return;
      }
    }
    const body = buildBody(vals);
    try {
      if (mode === 'create') {
        const created = await createMutation.mutateAsync({
          body,
          files: files.length > 0 ? files : undefined,
        });
        toast.success(t('action_save_draft'));
        navigate(`/content/${created.id}`);
      } else if (post) {
        await updateMutation.mutateAsync({
          body,
          files: files.length > 0 ? files : undefined,
        });
        toast.success(t('action_save_draft'));
      }
    } catch (err) {
      handleError(err);
    }
  }

  async function onPublish(vals: ContentFormValues) {
    try {
      if (mode === 'create') {
        const body = buildBody(vals);
        const created = await createMutation.mutateAsync({
          body,
          files: files.length > 0 ? files : undefined,
        });
        await publishMutation.mutateAsync(created.id);
        toast.success(t('action_publish'));
        navigate(`/content/${created.id}`);
      } else if (post) {
        if (files.length > 0 || Object.keys(buildBody(vals)).length > 0) {
          await updateMutation.mutateAsync({
            body: buildBody(vals),
            files: files.length > 0 ? files : undefined,
          });
        }
        await publishMutation.mutateAsync(post.id);
        toast.success(t('action_publish'));
      }
    } catch (err) {
      handleError(err);
    }
  }

  async function onScheduleSubmit(vals: ContentFormValues) {
    if (!scheduleDate) return;
    try {
      if (mode === 'create') {
        const body = buildBody(vals);
        const created = await createMutation.mutateAsync({
          body,
          files: files.length > 0 ? files : undefined,
        });
        await scheduleMutation.mutateAsync({ id: created.id, scheduled_for: scheduleDate });
        toast.success(t('action_schedule'));
        navigate(`/content/${created.id}`);
      } else if (post) {
        await scheduleMutation.mutateAsync({ id: post.id, scheduled_for: scheduleDate });
        toast.success(t('action_schedule'));
      }
    } catch (err) {
      handleError(err);
    }
    setScheduleOpen(false);
  }

  async function onDelete() {
    if (!post) return;
    try {
      await deleteMutation.mutateAsync(post.id);
      toast.success(t('action_delete'));
      navigate('/content');
    } catch (err) {
      handleError(err);
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;
  const publishing = publishMutation.isPending;
  const scheduling = scheduleMutation.isPending;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/content')}
          className="text-[color:var(--text-3)]"
        >
          <ArrowLeftIcon className="mr-1 size-4" />
          {t('action_back_to_feed')}
        </Button>
        <h1 className="text-[20px] font-bold text-[color:var(--text-1)]">
          {mode === 'create' ? t('editor_title_new') : t('editor_title_edit')}
        </h1>
        {post && (
          <Badge variant={STATUS_BADGE_MAP[post.status]}>{t(`status_${post.status}`)}</Badge>
        )}
      </div>

      {isPublished && (
        <div className="mb-4 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-sunken)] p-4 text-[13px] text-[color:var(--text-2)]">
          {t('published_readonly_notice')}
        </div>
      )}

      <form onSubmit={handleSubmit(onSaveDraft)} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('field_type')}
            </Label>
            <Controller
              control={control}
              name="content_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isPublished}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ContentTypeEnum.options.map((ct) => (
                      <SelectItem key={ct} value={ct}>
                        {t(`type_${ct}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('field_target')}
            </Label>
            <Controller
              control={control}
              name="target_type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                  }}
                  disabled={isPublished}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ContentTargetTypeEnum.options.map((tt) => (
                      <SelectItem key={tt} value={tt}>
                        {t(`field_target_${tt}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.target_group_id && targetType === 'group' && (
              <p className="mt-1 text-[12px] text-[color:var(--danger)]">
                {errors.target_group_id.message}
              </p>
            )}
            {errors.target_child_id && targetType === 'child' && (
              <p className="mt-1 text-[12px] text-[color:var(--danger)]">
                {errors.target_child_id.message}
              </p>
            )}
          </div>
        </div>

        {targetType === 'group' && (
          <div>
            <Label className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('field_target_group')}
            </Label>
            <Controller
              control={control}
              name="target_group_id"
              render={({ field }) => (
                <EntityCombobox
                  value={field.value}
                  onChange={(v) => field.onChange(v)}
                  fetchOptions={fetchGroups}
                  disabled={isPublished}
                />
              )}
            />
          </div>
        )}

        {targetType === 'child' && (
          <div>
            <Label className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('field_target_child')}
            </Label>
            <Controller
              control={control}
              name="target_child_id"
              render={({ field }) => (
                <EntityCombobox
                  value={field.value}
                  onChange={(v) => field.onChange(v)}
                  fetchOptions={fetchChildren}
                  disabled={isPublished}
                />
              )}
            />
          </div>
        )}

        <div>
          <Label className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('field_title')}
          </Label>
          <Controller
            control={control}
            name="title_i18n"
            render={({ field }) => (
              <PairedI18nField
                value={field.value}
                onChange={field.onChange}
                disabled={isPublished}
                placeholder={t('field_title')}
              />
            )}
          />
        </div>

        <div>
          <Label className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('field_body')}
          </Label>
          <Controller
            control={control}
            name="body_i18n"
            render={({ field }) => (
              <PairedI18nField
                value={field.value}
                onChange={field.onChange}
                as="textarea"
                disabled={isPublished}
                placeholder={t('field_body')}
              />
            )}
          />
        </div>

        <div>
          <Label className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('field_media')}
          </Label>
          <MultipartMediaInput
            existingUrls={post?.media_urls ?? undefined}
            readOnly={isPublished}
            files={files}
            onFilesChange={setFiles}
          />
        </div>

        {isQundylyq && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('field_qundylyq_month')}
              </Label>
              <Controller
                control={control}
                name="qundylyq_month"
                render={({ field }) => (
                  <Input
                    type="month"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    disabled={isPublished}
                  />
                )}
              />
            </div>
            <div>
              <Label className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('field_qundylyq_theme')}
              </Label>
              <Controller
                control={control}
                name="qundylyq_theme"
                render={({ field }) => (
                  <Input
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    disabled={isPublished}
                  />
                )}
              />
            </div>
          </div>
        )}

        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="gap-1 text-[color:var(--text-3)]"
          >
            <ChevronDownIcon
              className={`size-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
            />
            {t('field_advanced')}
          </Button>
          {advancedOpen && (
            <div className="mt-3 flex flex-col gap-4">
              <div>
                <Label className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('field_expires_at')}
                </Label>
                <Controller
                  control={control}
                  name="expires_at"
                  render={({ field }) => (
                    <Input
                      type="datetime-local"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      disabled={isPublished}
                    />
                  )}
                />
              </div>
              <div>
                <Label className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('field_metadata')}
                </Label>
                <Controller
                  control={control}
                  name="metadata_json"
                  render={({ field }) => (
                    <Textarea
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      rows={4}
                      disabled={isPublished}
                      className="font-mono text-[12.5px]"
                    />
                  )}
                />
              </div>
            </div>
          )}
        </div>

        {!isPublished && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-4">
            <Button type="submit" disabled={saving} className="gap-1">
              <SaveIcon className="size-4" />
              {t('action_save_draft')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={scheduling}
              onClick={() => setScheduleOpen(true)}
              className="gap-1"
            >
              <ClockIcon className="size-4" />
              {t('action_schedule')}
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={publishing}
              onClick={handleSubmit(onPublish)}
              className="gap-1 bg-[var(--primary)] text-white hover:bg-[color:color-mix(in_oklab,var(--primary)_85%,black)]"
            >
              <CheckCircleIcon className="size-4" />
              {t('action_publish')}
            </Button>
            {isDraft && mode === 'edit' && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                className="ml-auto gap-1"
              >
                <Trash2Icon className="size-4" />
                {t('action_delete')}
              </Button>
            )}
          </div>
        )}
      </form>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('schedule_datetime_title')}</DialogTitle>
            <DialogDescription>{t('schedule_datetime_label')}</DialogDescription>
          </DialogHeader>
          <Input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              {t('action_back_to_feed')}
            </Button>
            <Button disabled={!scheduleDate || scheduling} onClick={handleSubmit(onScheduleSubmit)}>
              {t('action_schedule')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DestructiveConfirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('delete_confirm_title')}
        description={t('delete_confirm_body')}
        confirmLabel={t('delete_confirm_action')}
        onConfirm={onDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
