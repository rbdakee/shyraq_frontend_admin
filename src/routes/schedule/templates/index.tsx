import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PlusIcon, CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBox } from '@/components/feedback/skeleton';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { FullScreenSheet } from '@/components/forms/full-screen-sheet';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';

import { useScheduleTemplates, useCreateScheduleTemplate } from '@/hooks/use-schedule';
import { useGroups } from '@/hooks/use-groups';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { toI18nKey } from '@/lib/error-map';
import { cn } from '@/lib/cn';

const CreateTemplateSchema = z.object({
  name: z.string().min(1),
  groupId: z.string().optional(),
  validFrom: z.string().min(1),
  validUntil: z.string().optional(),
  isActive: z.boolean(),
});

type CreateTemplateForm = z.infer<typeof CreateTemplateSchema>;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ScheduleTemplatesIndexPage() {
  const { t } = useTranslation('schedule');
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<boolean>(true);
  const [createOpen, setCreateOpen] = useState(false);

  const filters = {
    groupId: groupFilter !== 'all' ? groupFilter : undefined,
    isActive: activeFilter || undefined,
  };

  const templatesQuery = useScheduleTemplates(filters);
  const groupsQuery = useGroups({ archived: false });
  const templates = templatesQuery.data ?? [];
  const groups = groupsQuery.data ?? [];

  const isFiltered = groupFilter !== 'all' || activeFilter;

  function handleResetFilters() {
    setGroupFilter('all');
    setActiveFilter(false);
  }

  if (templatesQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-7 w-32 animate-pulse rounded bg-[var(--bg-sunken)]" />
            <div className="mt-1 h-4 w-48 animate-pulse rounded bg-[var(--bg-sunken)]" />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonBox key={i} height={72} />
          ))}
        </div>
      </div>
    );
  }

  if (templatesQuery.isError) {
    return <ErrorState onRetry={() => void templatesQuery.refetch()} />;
  }

  if (isMobile) {
    return (
      <>
        <MobileTopBar
          title={t('title')}
          sub={t('sub')}
          back={false}
          action={
            <button
              type="button"
              className="m-iconbtn primary"
              onClick={() => setCreateOpen(true)}
              aria-label={t('templates.create_button')}
            >
              <PlusIcon />
            </button>
          }
        />

        <div className="flex flex-col gap-3">
          <div className="m-chips">
            <button
              type="button"
              className={cn('m-chip', groupFilter === 'all' && 'active')}
              onClick={() => setGroupFilter('all')}
            >
              {t('templates.filter_all_groups')}
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                className={cn('m-chip', groupFilter === g.id && 'active')}
                onClick={() => setGroupFilter(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>

          {templates.length === 0 && !isFiltered && (
            <EmptyState
              title={t('templates.list_empty')}
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <PlusIcon className="size-4" />
                  {t('templates.first_template')}
                </Button>
              }
            />
          )}

          {templates.length === 0 && isFiltered && (
            <EmptyState
              variant="filtered"
              title={t('templates.list_filtered_empty')}
              onResetFilters={handleResetFilters}
            />
          )}

          <div className="flex flex-col gap-2.5">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="m-card"
                style={{ padding: 14, cursor: 'pointer' }}
                onClick={() => navigate(`/schedule/templates/${tpl.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[15px] font-bold">{tpl.name}</div>
                    <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
                      {t('templates.slots_count', { count: tpl.slots.length })}
                    </div>
                  </div>
                  <Badge variant={tpl.isActive ? 'success' : 'neutral'}>
                    {tpl.isActive ? t('templates.active_badge') : t('templates.inactive_badge')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <MobileCreateTemplateSheet
            open={createOpen}
            onOpenChange={setCreateOpen}
            groups={groups}
            onSuccess={(id) => navigate(`/schedule/templates/${id}`)}
          />
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-[color:var(--text-1)]">
            {t('title')}
          </h1>
          <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">{t('sub')}</div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" />
          {t('templates.create_button')}
        </Button>
      </div>

      <Tabs value="templates">
        <TabsList variant="line">
          <TabsTrigger value="templates">{t('tabs.templates')}</TabsTrigger>
          <TabsTrigger value="weeks" onClick={() => navigate('/schedule/weeks')}>
            {t('tabs.weeks')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-3">
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger size="sm">
            <CalendarIcon className="size-3.5 text-[color:var(--text-3)]" />
            <SelectValue placeholder={t('templates.filter_group')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('templates.filter_all_groups')}</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 text-[13px] text-[color:var(--text-2)]">
          <Switch checked={activeFilter} onCheckedChange={setActiveFilter} />
          {t('templates.filter_active')}
        </label>
      </div>

      {templates.length === 0 && !isFiltered && (
        <EmptyState
          title={t('templates.list_empty')}
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="size-4" />
              {t('templates.first_template')}
            </Button>
          }
        />
      )}

      {templates.length === 0 && isFiltered && (
        <EmptyState
          variant="filtered"
          title={t('templates.list_filtered_empty')}
          onResetFilters={handleResetFilters}
        />
      )}

      {templates.length > 0 && (
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
            <div className="text-[15px] font-bold text-[color:var(--text-1)]">
              {t('tabs.templates')}
            </div>
          </div>
          <div>
            {templates.map((tpl, i) => (
              <div
                key={tpl.id}
                className={cn(
                  'flex cursor-pointer items-center justify-between border-b border-[var(--line)] px-3 py-3 transition-colors hover:bg-[var(--bg-subtle)]',
                  i === templates.length - 1 && 'border-b-0',
                )}
                onClick={() => navigate(`/schedule/templates/${tpl.id}`)}
              >
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-[color:var(--text-1)]">
                    {tpl.name}
                  </div>
                  <div className="text-[12px] text-[color:var(--text-3)]">
                    {t('templates.slots_count', { count: tpl.slots.length })}
                    {' · '}
                    {formatDate(tpl.validFrom)}
                  </div>
                </div>
                <Badge variant={tpl.isActive ? 'success' : 'neutral'} dot={false}>
                  {tpl.isActive ? t('templates.active_badge') : t('templates.inactive_badge')}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        groups={groups}
        onSuccess={(id) => navigate(`/schedule/templates/${id}`)}
      />
    </div>
  );
}

interface CreateTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: Array<{ id: string; name: string }>;
  onSuccess: (id: string) => void;
}

function CreateTemplateDialog({ open, onOpenChange, groups, onSuccess }: CreateTemplateProps) {
  const { t } = useTranslation('schedule');
  const tErrors = useTranslation('errors').t;
  const createTemplate = useCreateScheduleTemplate();

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTemplateForm>({
    resolver: zodResolver(CreateTemplateSchema),
    defaultValues: {
      name: '',
      groupId: undefined,
      validFrom: '',
      validUntil: '',
      isActive: true,
    },
  });

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const onSubmit = handleSubmit((data) => {
    createTemplate.mutate(
      {
        name: data.name,
        groupId: data.groupId && data.groupId !== 'all' ? data.groupId : undefined,
        validFrom: data.validFrom,
        validUntil: data.validUntil || undefined,
        isActive: data.isActive,
      },
      {
        onSuccess: (tpl) => {
          toast.success(t('templates.create_success'));
          reset();
          onOpenChange(false);
          onSuccess(tpl.id);
        },
        onError: (error) => {
          const mapped = mapValidationErrors(error, setError);
          if (!mapped) {
            toast.error(tErrors(toI18nKey(error)));
          }
        },
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('templates.create_dialog.title')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-[22px] pb-[18px]">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('templates.create_dialog.name')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input {...register('name')} aria-invalid={!!errors.name} />
            {errors.name && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('templates.create_dialog.group')}
            </Label>
            <Controller
              name="groupId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? 'all'}
                  onValueChange={(v) => field.onChange(v === 'all' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('templates.filter_kg_wide')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('templates.filter_kg_wide')}</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('templates.create_dialog.valid_from')}
                <span className="text-[color:var(--danger)]"> *</span>
              </Label>
              <Input type="date" {...register('validFrom')} aria-invalid={!!errors.validFrom} />
              {errors.validFrom && (
                <p className="text-[12px] text-[color:var(--danger-fg)]">
                  {errors.validFrom.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('templates.create_dialog.valid_until')}
              </Label>
              <Input type="date" {...register('validUntil')} />
            </div>
          </div>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-[13px] text-[color:var(--text-2)]">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                {t('templates.create_dialog.is_active')}
              </label>
            )}
          />

          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('templates.create_dialog.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || createTemplate.isPending}>
              {t('templates.create_dialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MobileCreateTemplateSheet({ open, onOpenChange, groups, onSuccess }: CreateTemplateProps) {
  const { t } = useTranslation('schedule');
  const tErrors = useTranslation('errors').t;
  const createTemplate = useCreateScheduleTemplate();

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTemplateForm>({
    resolver: zodResolver(CreateTemplateSchema),
    defaultValues: {
      name: '',
      groupId: undefined,
      validFrom: '',
      validUntil: '',
      isActive: true,
    },
  });

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const onSubmit = handleSubmit((data) => {
    createTemplate.mutate(
      {
        name: data.name,
        groupId: data.groupId && data.groupId !== 'all' ? data.groupId : undefined,
        validFrom: data.validFrom,
        validUntil: data.validUntil || undefined,
        isActive: data.isActive,
      },
      {
        onSuccess: (tpl) => {
          toast.success(t('templates.create_success'));
          reset();
          onOpenChange(false);
          onSuccess(tpl.id);
        },
        onError: (error) => {
          const mapped = mapValidationErrors(error, setError);
          if (!mapped) {
            toast.error(tErrors(toI18nKey(error)));
          }
        },
      },
    );
  });

  return (
    <FullScreenSheet
      open={open}
      onOpenChange={handleClose}
      title={t('templates.create_dialog.title')}
      footer={
        <Button
          className="flex-1"
          disabled={isSubmitting || createTemplate.isPending}
          onClick={() => void onSubmit()}
        >
          {t('templates.create_dialog.submit')}
        </Button>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('templates.create_dialog.name')}
            <span className="text-[color:var(--danger)]"> *</span>
          </Label>
          <Input {...register('name')} aria-invalid={!!errors.name} />
          {errors.name && (
            <p className="text-[12px] text-[color:var(--danger-fg)]">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('templates.create_dialog.group')}
          </Label>
          <Controller
            name="groupId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? 'all'}
                onValueChange={(v) => field.onChange(v === 'all' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('templates.filter_kg_wide')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('templates.filter_kg_wide')}</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('templates.create_dialog.valid_from')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input type="date" {...register('validFrom')} aria-invalid={!!errors.validFrom} />
            {errors.validFrom && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">
                {errors.validFrom.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('templates.create_dialog.valid_until')}
            </Label>
            <Input type="date" {...register('validUntil')} />
          </div>
        </div>

        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-2 text-[13px] text-[color:var(--text-2)]">
              <Switch checked={field.value} onCheckedChange={field.onChange} />
              {t('templates.create_dialog.is_active')}
            </label>
          )}
        />
      </form>
    </FullScreenSheet>
  );
}
