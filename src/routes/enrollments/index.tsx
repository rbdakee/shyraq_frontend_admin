import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import { PlusIcon, SearchIcon, EyeIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { DataTable } from '@/components/data-table/data-table';
import type { OffsetPagination } from '@/components/data-table/types';
import { PhoneInput } from '@/components/forms/phone-input';
import { IinInput } from '@/components/forms/iin-input';
import { EntityCombobox } from '@/components/forms/entity-combobox';
import type { ComboboxOption } from '@/components/forms/entity-combobox';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonLine, SkeletonBox } from '@/components/feedback/skeleton';
import { useEnrollmentsList, useCreateEnrollment } from '@/hooks/use-enrollments';
import { useStaffList } from '@/hooks/use-staff';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { formatDate, formatPhone, getInitials } from '@/lib/format';
import { toI18nKey } from '@/lib/error-map';
import { cn } from '@/lib/cn';
import { DEFAULT_TIMEZONE, SEARCH_DEBOUNCE_MS } from '@/lib/constants';

type EnrollmentListData = NonNullable<ReturnType<typeof useEnrollmentsList>['data']>;
type Enrollment = EnrollmentListData['data'][number];
type EnrollmentStatus = Enrollment['status'];

const PAGE_SIZE = 20;
const EMPTY_ENROLLMENTS: Enrollment[] = [];

const KANBAN_COLUMNS: Array<{
  id: EnrollmentStatus;
  tone: 'info' | 'warning' | 'success' | 'neutral';
}> = [
  { id: 'new', tone: 'info' },
  { id: 'in_processing', tone: 'warning' },
  { id: 'waitlist', tone: 'warning' },
  { id: 'card_created', tone: 'success' },
  { id: 'cancelled', tone: 'neutral' },
];

const STATUS_BADGE_VARIANT: Record<EnrollmentStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  new: 'info',
  in_processing: 'warning',
  waitlist: 'warning',
  card_created: 'success',
  cancelled: 'neutral',
  archive: 'neutral',
};

function computeAgeMonths(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

function timeSinceLabel(dateStr: string, tz: string): string {
  return formatDate(dateStr, tz);
}

const CreateLeadSchema = z.object({
  contactName: z.string().min(1),
  contactPhone: z.string().regex(/^\+7\d{10}$/),
  childName: z.string().optional(),
  childDob: z.string().optional(),
  childIin: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{12}$/.test(v.replace(/\s/g, '')), {
      message: 'IIN must be exactly 12 digits',
    }),
  source: z.string().optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
});

type CreateLeadForm = z.infer<typeof CreateLeadSchema>;

export default function EnrollmentsListPage() {
  const { t } = useTranslation('enrollments');
  const tStaff = useTranslation('staff').t;
  const tErrors = useTranslation('errors').t;
  const navigate = useNavigate();
  const tz = DEFAULT_TIMEZONE;

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const kanbanFilters = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      page: 1,
      limit: 100,
    }),
    [debouncedSearch],
  );

  const tableFilters = useMemo(
    () => ({
      status: statusFilter !== 'all' ? (statusFilter as EnrollmentStatus) : undefined,
      q: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [debouncedSearch, page, statusFilter],
  );

  const listQuery = useEnrollmentsList(viewMode === 'kanban' ? kanbanFilters : tableFilters);
  const allData = listQuery.data?.data ?? EMPTY_ENROLLMENTS;
  const total = listQuery.data?.total ?? 0;

  const isFiltered = statusFilter !== 'all' || !!debouncedSearch;

  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setSearchInput('');
    setDebouncedSearch('');
    setPage(1);
  }, []);

  const createMutation = useCreateEnrollment();
  const staffQuery = useStaffList({ is_active: true });
  const staffList = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);

  const fetchStaffOptions = useCallback(
    async (query: string): Promise<ComboboxOption[]> => {
      const lowerQ = query.toLowerCase();
      return staffList
        .filter((s) => {
          if (!s.full_name) return !lowerQ;
          return !lowerQ || s.full_name.toLowerCase().includes(lowerQ);
        })
        .map((s) => ({
          value: s.id,
          label: s.full_name ?? '—',
          subLabel: tStaff(`role.${s.role}`),
          icon: (
            <Avatar size="sm">
              <AvatarFallback className="text-[9px]">
                {s.full_name ? getInitials(s.full_name) : '?'}
              </AvatarFallback>
            </Avatar>
          ),
        }));
    },
    [staffList, tStaff],
  );

  const staffMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of staffList) {
      map.set(s.id, s.full_name ?? '—');
      map.set(s.user_id, s.full_name ?? '—');
    }
    return map;
  }, [staffList]);

  const form = useForm<CreateLeadForm>({
    resolver: zodResolver(CreateLeadSchema),
    defaultValues: {
      contactName: '',
      contactPhone: '',
      childName: '',
      childDob: '',
      childIin: '',
      source: '',
      notes: '',
      assignedTo: '',
    },
  });

  function handleCreateSubmit(data: CreateLeadForm) {
    createMutation.mutate(
      {
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        childName: data.childName || undefined,
        childDob: data.childDob || undefined,
        childIin: data.childIin?.replace(/\s/g, '') || undefined,
        source: data.source || undefined,
        notes: data.notes || undefined,
        assignedTo: data.assignedTo || undefined,
      },
      {
        onSuccess: (enrollment) => {
          toast.success(t('create.success'));
          setCreateOpen(false);
          form.reset();
          navigate(`/enrollments/${enrollment.id}`);
        },
        onError: (error) => {
          const mapped = mapValidationErrors(error, form.setError);
          if (!mapped) {
            toast.error(tErrors(toI18nKey(error)));
          }
        },
      },
    );
  }

  const activeCount = allData.filter(
    (e) => e.status !== 'archive' && e.status !== 'cancelled',
  ).length;

  const columns: ColumnDef<Enrollment, unknown>[] = useMemo(
    () => [
      {
        id: 'childName',
        header: () => t('columns.child_name'),
        cell: ({ row }) => (
          <div className="font-semibold text-[color:var(--text-1)]">
            {row.original.childName ?? t('no_data')}
          </div>
        ),
      },
      {
        id: 'contactName',
        header: () => t('columns.contact_name'),
        cell: ({ row }) => (
          <div>
            <div className="text-[color:var(--text-2)]">{row.original.contactName}</div>
            <div className="font-mono text-[12px] text-[color:var(--text-3)]">
              {formatPhone(row.original.contactPhone)}
            </div>
          </div>
        ),
      },
      {
        id: 'status',
        header: () => t('columns.status'),
        cell: ({ row }) => (
          <Badge variant={STATUS_BADGE_VARIANT[row.original.status]}>
            {t(`status.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        id: 'source',
        header: () => t('columns.source'),
        cell: ({ row }) =>
          row.original.source ? (
            <Badge variant="neutral">{row.original.source}</Badge>
          ) : (
            <span className="text-[color:var(--text-4)]">{t('no_data')}</span>
          ),
      },
      {
        id: 'statusChangedAt',
        header: () => t('columns.status_changed_at'),
        cell: ({ row }) => (
          <span className="tabular-nums text-[color:var(--text-3)]">
            {formatDate(row.original.statusChangedAt, tz)}
          </span>
        ),
      },
    ],
    [t, tz],
  );

  const pagination: OffsetPagination = useMemo(
    () => ({
      mode: 'offset',
      page,
      pageSize: PAGE_SIZE,
      total,
      onPageChange: setPage,
    }),
    [page, total],
  );

  const rowActions = useMemo(
    () => [
      {
        label: t('detail.actions.edit'),
        icon: <EyeIcon className="size-4" />,
        onClick: (row: Enrollment) => navigate(`/enrollments/${row.id}`),
      },
    ],
    [navigate, t],
  );

  const toolbar = (
    <>
      <div className="relative w-[280px]">
        <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-4)]" />
        <Input
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t('search_placeholder')}
          className="pl-9"
        />
      </div>
      <Select
        value={statusFilter}
        onValueChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('columns.status')}</SelectItem>
          <SelectItem value="new">{t('status.new')}</SelectItem>
          <SelectItem value="in_processing">{t('status.in_processing')}</SelectItem>
          <SelectItem value="waitlist">{t('status.waitlist')}</SelectItem>
          <SelectItem value="card_created">{t('status.card_created')}</SelectItem>
          <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
          <SelectItem value="archive">{t('status.archive')}</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  const { isMobile } = useBreakpoint();

  if (isMobile) {
    const stageChips: Array<{ value: string; label: string; count?: number; tone?: string }> = [
      {
        value: 'all',
        label: t('mobile_filter_all', { defaultValue: 'Все' }),
        count: allData.length,
      },
      { value: 'new', label: t('status.new'), tone: 'info' },
      { value: 'in_processing', label: t('status.in_processing'), tone: 'warning' },
      { value: 'waitlist', label: t('status.waitlist') },
    ];

    const filteredLeads =
      statusFilter === 'all' ? allData : allData.filter((e) => e.status === statusFilter);

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
              {t('title')}
            </h1>
            <div className="mt-0.5 truncate text-[13px] text-[color:var(--text-3)]">
              {t('subtitle', { count: String(activeCount) })}
            </div>
          </div>
          <button
            type="button"
            className="m-iconbtn primary"
            onClick={() => setCreateOpen(true)}
            aria-label={t('create_button')}
          >
            <PlusIcon />
          </button>
        </div>

        {/* Segmented */}
        <div className="m-segmented" style={{ marginBottom: 4 }}>
          <button
            type="button"
            className={cn(viewMode === 'kanban' && 'on')}
            onClick={() => setViewMode('kanban')}
          >
            {t('view_toggle.kanban')}
          </button>
          <button
            type="button"
            className={cn(viewMode === 'table' && 'on')}
            onClick={() => setViewMode('table')}
          >
            {t('view_toggle.table')}
          </button>
        </div>

        {/* Chips */}
        <div className="m-chips">
          {stageChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={cn('m-chip', statusFilter === chip.value && 'active')}
              onClick={() => {
                setStatusFilter(chip.value);
                setPage(1);
              }}
            >
              {chip.label}
              {chip.count !== undefined && <span className="m-chip-count">{chip.count}</span>}
            </button>
          ))}
        </div>

        {/* Lead cards */}
        {listQuery.isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonBox key={i} height={80} />
            ))}
          </div>
        ) : listQuery.isError ? (
          <ErrorState onRetry={() => void listQuery.refetch()} />
        ) : filteredLeads.length === 0 ? (
          <EmptyState
            title={t('empty_title')}
            text={t('empty_description')}
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-4" />
                {t('create_button')}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {filteredLeads.map((lead) => (
              <button
                key={lead.id}
                type="button"
                className="m-lead"
                onClick={() => navigate(`/enrollments/${lead.id}`)}
              >
                <div className={cn('m-lead-strip', STATUS_BADGE_VARIANT[lead.status])} />
                <div className="m-avatar child" style={{ marginLeft: 6 }}>
                  {getInitials(lead.childName ?? lead.contactName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="m-row-title">{lead.childName ?? lead.contactName}</div>
                  <div className="m-row-sub">{lead.contactName}</div>
                  {lead.source && (
                    <div className="mt-1 flex gap-2 text-[11px] text-[color:var(--text-3)]">
                      <span>{lead.source}</span>
                      <span>· {formatDate(lead.statusChangedAt, tz)}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant={STATUS_BADGE_VARIANT[lead.status]}>
                    {t(`status.${lead.status}`)}
                  </Badge>
                  <ChevronRightIcon className="m-row-chev size-3.5" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Create Lead Dialog (shared) */}
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) form.reset();
          }}
        >
          <DialogContent className="sm:max-w-[520px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
            <DialogHeader className="px-[22px] pt-[18px] pb-3">
              <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
                {t('create.title')}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit(handleCreateSubmit)}
              className="flex flex-col gap-4 px-[22px] pb-[18px]"
            >
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('create.contact_name')}
                  <span className="text-[color:var(--danger)]"> *</span>
                </Label>
                <Input
                  {...form.register('contactName')}
                  placeholder={t('create.contact_name_placeholder')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('create.contact_phone')}
                  <span className="text-[color:var(--danger)]"> *</span>
                </Label>
                <Controller
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <PhoneInput
                      value={field.value}
                      onChange={field.onChange}
                      hasError={!!form.formState.errors.contactPhone}
                      placeholder={t('create.contact_phone_placeholder')}
                    />
                  )}
                />
              </div>
              <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false);
                    form.reset();
                  }}
                >
                  {t('create.cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {t('create.submit')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {t('title')}
          </h1>
          <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
            {t('subtitle', { count: String(viewMode === 'kanban' ? activeCount : total) })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-[var(--r-md)] border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-[var(--primary)] text-[color:var(--on-primary)]'
                  : 'bg-[var(--bg-elev)] text-[color:var(--text-2)] hover:bg-[var(--bg-sunken)]'
              }`}
            >
              {t('view_toggle.kanban')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                viewMode === 'table'
                  ? 'bg-[var(--primary)] text-[color:var(--on-primary)]'
                  : 'bg-[var(--bg-elev)] text-[color:var(--text-2)] hover:bg-[var(--bg-sunken)]'
              }`}
            >
              {t('view_toggle.table')}
            </button>
          </div>

          {viewMode === 'kanban' && (
            <Button variant="outline" onClick={() => setSearchOpen(!searchOpen)}>
              <SearchIcon className="size-4" />
              {t('search_placeholder')}
            </Button>
          )}

          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" />
            {t('create_button')}
          </Button>
        </div>
      </div>

      {/* Search bar for kanban */}
      {viewMode === 'kanban' && searchOpen && (
        <div className="relative w-full max-w-[400px]">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-4)]" />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('search_placeholder')}
            className="pl-9"
            autoFocus
          />
        </div>
      )}

      {/* Kanban view */}
      {viewMode === 'kanban' && (
        <KanbanView
          data={allData}
          isLoading={listQuery.isPending}
          isError={listQuery.isError}
          onRetry={() => void listQuery.refetch()}
          onCreateClick={() => setCreateOpen(true)}
          navigate={navigate}
          t={t}
          tz={tz}
          staffMap={staffMap}
        />
      )}

      {/* Table view */}
      {viewMode === 'table' && (
        <DataTable<Enrollment>
          columns={columns}
          data={allData}
          pagination={pagination}
          isLoading={listQuery.isPending}
          isError={listQuery.isError}
          onRetry={() => void listQuery.refetch()}
          isFiltered={isFiltered}
          onResetFilters={resetFilters}
          emptyTitle={t('empty_title')}
          emptyDescription={t('empty_description')}
          emptyAction={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="size-4" />
              {t('create_button')}
            </Button>
          }
          filteredEmptyTitle={t('filtered_empty_title')}
          filteredEmptyDescription={t('filtered_empty_description')}
          onRowClick={(row) => navigate(`/enrollments/${row.id}`)}
          rowActions={rowActions}
          toolbar={toolbar}
        />
      )}

      {/* Create Lead Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) form.reset();
        }}
      >
        <DialogContent className="sm:max-w-[520px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('create.title')}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(handleCreateSubmit)}
            className="flex flex-col gap-4 px-[22px] pb-[18px]"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('create.contact_name')}
                  <span className="text-[color:var(--danger)]"> *</span>
                </Label>
                <Input
                  {...form.register('contactName')}
                  placeholder={t('create.contact_name_placeholder')}
                  aria-invalid={!!form.formState.errors.contactName}
                />
                {form.formState.errors.contactName && (
                  <p className="text-[12px] text-[color:var(--danger-fg)]">
                    {form.formState.errors.contactName.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('create.contact_phone')}
                  <span className="text-[color:var(--danger)]"> *</span>
                </Label>
                <Controller
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <PhoneInput
                      value={field.value}
                      onChange={field.onChange}
                      hasError={!!form.formState.errors.contactPhone}
                      placeholder={t('create.contact_phone_placeholder')}
                    />
                  )}
                />
                {form.formState.errors.contactPhone && (
                  <p className="text-[12px] text-[color:var(--danger-fg)]">
                    {form.formState.errors.contactPhone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('create.child_name')}
                </Label>
                <Input
                  {...form.register('childName')}
                  placeholder={t('create.child_name_placeholder')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('create.child_dob')}
                </Label>
                <Input type="date" {...form.register('childDob')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('create.child_iin')}
                </Label>
                <Controller
                  control={form.control}
                  name="childIin"
                  render={({ field }) => (
                    <IinInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder={t('create.child_iin_placeholder')}
                      aria-invalid={!!form.formState.errors.childIin}
                    />
                  )}
                />
                {form.formState.errors.childIin && (
                  <p className="text-[12px] text-[color:var(--danger-fg)]">
                    {form.formState.errors.childIin.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('create.source')}
                </Label>
                <Input {...form.register('source')} placeholder={t('create.source_placeholder')} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('create.assigned_to')}
              </Label>
              <Controller
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <EntityCombobox
                    value={field.value || null}
                    onChange={(val) => field.onChange(val ?? '')}
                    fetchOptions={fetchStaffOptions}
                    placeholder={t('create.assigned_to_placeholder')}
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('create.notes')}
              </Label>
              <Textarea
                {...form.register('notes')}
                rows={3}
                placeholder={t('create.notes_placeholder')}
                className="min-h-[80px] resize-y border-[var(--border)] bg-[var(--bg-elev)] text-[14px] text-[color:var(--text-1)] placeholder:text-[color:var(--text-4)] focus:border-[var(--primary)] focus:shadow-[var(--focus-ring)]"
              />
            </div>

            <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  form.reset();
                }}
                className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
              >
                {t('create.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {t('create.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface KanbanViewProps {
  data: Enrollment[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onCreateClick: () => void;
  navigate: ReturnType<typeof useNavigate>;
  t: (key: string, opts?: Record<string, string>) => string;
  tz: string;
  staffMap: Map<string, string>;
}

function KanbanView({
  data,
  isLoading,
  isError,
  onRetry,
  onCreateClick,
  navigate,
  t,
  tz,
  staffMap,
}: KanbanViewProps) {
  if (isError) {
    return <ErrorState onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className="grid auto-cols-[280px] grid-flow-col gap-[14px] overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((col) => (
          <div
            key={col.id}
            className="flex flex-col rounded-[var(--r-lg)] bg-[var(--bg-sunken)] border border-[var(--line)]"
          >
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-[14px] py-3">
              <SkeletonLine width={80} height={14} />
              <SkeletonLine width={24} height={14} />
            </div>
            <div className="flex flex-col gap-2 p-[10px]">
              <SkeletonBox height={100} />
              <SkeletonBox height={100} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={t('empty_title')}
        text={t('empty_description')}
        action={
          <Button size="sm" onClick={onCreateClick}>
            <PlusIcon className="size-4" />
            {t('create_button')}
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid auto-cols-[280px] grid-flow-col gap-[14px] overflow-x-auto pb-2">
      {KANBAN_COLUMNS.map((col) => {
        const items = data.filter((e) => e.status === col.id);
        return (
          <div
            key={col.id}
            className="flex flex-col rounded-[var(--r-lg)] bg-[var(--bg-sunken)] border border-[var(--line)] max-h-[calc(100vh-220px)]"
          >
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-[14px] py-3">
              <Badge variant={col.tone}>{t(`status.${col.id}`)}</Badge>
              <span className="rounded-[var(--r-pill)] bg-[var(--bg-elev)] px-[7px] py-[1px] text-[11px] font-bold text-[color:var(--text-3)]">
                {items.length}
              </span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={onCreateClick}
                className="flex size-6 items-center justify-center rounded-[var(--r-sm)] text-[color:var(--text-3)] hover:bg-[var(--bg-elev)] hover:text-[color:var(--text-1)]"
              >
                <PlusIcon className="size-3.5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-[10px]">
              {items.length === 0 && (
                <div className="py-5 text-center text-[13px] text-[color:var(--text-4)]">
                  {t('kanban.empty_column')}
                </div>
              )}
              {items.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => navigate(`/enrollments/${lead.id}`)}
                  t={t}
                  tz={tz}
                  staffMap={staffMap}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface LeadCardProps {
  lead: Enrollment;
  onClick: () => void;
  t: (key: string) => string;
  tz: string;
  staffMap: Map<string, string>;
}

function LeadCard({ lead, onClick, t, tz, staffMap }: LeadCardProps) {
  const ageMonths = computeAgeMonths(lead.childDob);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-elev)] p-3 text-left shadow-[var(--shyraq-shadow-1)] transition-[transform,box-shadow] duration-75 hover:-translate-y-px hover:shadow-[var(--shyraq-shadow-2)]"
    >
      <div className="text-[13.5px] font-semibold leading-[1.3] text-[color:var(--text-1)]">
        {lead.childName ?? lead.contactName}
      </div>
      {lead.childDob && (
        <div className="mt-1 text-[12px] text-[color:var(--text-3)]">
          {formatDate(lead.childDob, tz)}
          {ageMonths !== null && ` · ${ageMonths} ${t('card.months')}`}
        </div>
      )}
      <div className="mt-2">
        <div className="text-[12px] font-semibold text-[color:var(--text-2)]">
          {lead.contactName}
        </div>
        <div className="mt-0.5 font-mono text-[12px] text-[color:var(--text-3)]">
          {formatPhone(lead.contactPhone)}
        </div>
      </div>
      <div className="mt-[10px] flex items-center justify-between">
        {lead.source ? <Badge variant="neutral">{lead.source}</Badge> : <span />}
        <div className="flex items-center gap-2">
          {lead.assignedTo ? (
            <Avatar size="sm">
              <AvatarFallback className="text-[9px]">
                {staffMap.get(lead.assignedTo) ? getInitials(staffMap.get(lead.assignedTo)!) : '—'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="text-[12px] text-[color:var(--text-4)]">{t('card.not_assigned')}</span>
          )}
          <span className="text-[11px] text-[color:var(--text-4)]">
            {timeSinceLabel(lead.statusChangedAt, tz)}
          </span>
        </div>
      </div>
    </button>
  );
}
