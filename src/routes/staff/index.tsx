import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { PlusIcon, SearchIcon, EyeIcon, DownloadIcon, ChevronRightIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/data-table/data-table';
import { Fab } from '@/components/ui/fab';
import { PhoneInput } from '@/components/forms/phone-input';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useStaffList, useCreateStaff } from '@/hooks/use-staff';
import { useGroups, useAssignGroupMentor } from '@/hooks/use-groups';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/cn';
import { formatPhone, getInitials } from '@/lib/format';
import { toI18nKey } from '@/lib/error-map';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';

type StaffListData = NonNullable<ReturnType<typeof useStaffList>['data']>;
type StaffMember = StaffListData[number];
type StaffRole = StaffMember['role'];
type SpecialistType =
  | 'psychologist'
  | 'speech_therapist'
  | 'music_teacher'
  | 'physical_ed'
  | 'nutritionist';

const GROUP_NONE = '__none__';
const SPECIALIST_TYPES: SpecialistType[] = [
  'psychologist',
  'speech_therapist',
  'music_teacher',
  'physical_ed',
  'nutritionist',
];

function statusVariant(isActive: boolean): 'success' | 'neutral' {
  return isActive ? 'success' : 'neutral';
}

function roleVariant(role: StaffRole): 'default' | 'neutral' {
  return role === 'admin' ? 'default' : 'neutral';
}

const CreateStaffSchema = z.object({
  full_name: z.string().min(1),
  phone: z.string().regex(/^\+7\d{10}$/),
  role: z.enum(['admin', 'mentor', 'specialist', 'reception']),
  specialist_type: z.string().optional(),
  hired_at: z.string().optional(),
  group_id: z.string().optional(),
});

type CreateStaffForm = z.infer<typeof CreateStaffSchema>;

export default function StaffListPage() {
  const { t } = useTranslation('staff');
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [specFilter, setSpecFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [createOpen, setCreateOpen] = useState(false);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const filters = useMemo(
    () => ({
      role: roleFilter !== 'all' ? (roleFilter as StaffRole) : undefined,
      is_active: activeFilter !== 'all' ? activeFilter === 'active' : undefined,
      specialist_type: specFilter !== 'all' ? (specFilter as SpecialistType) : undefined,
      search: debouncedSearch || undefined,
    }),
    [roleFilter, activeFilter, specFilter, debouncedSearch],
  );

  const staffQuery = useStaffList(filters);
  const groupsQuery = useGroups({ archived: false });
  const allStaff = useStaffList();
  const data = staffQuery.data ?? [];
  const allData = useMemo(() => allStaff.data ?? [], [allStaff.data]);

  const activeCount = useMemo(() => allData.filter((s) => s.is_active).length, [allData]);
  const mentorCount = useMemo(() => allData.filter((s) => s.role === 'mentor').length, [allData]);
  const specialistCount = useMemo(
    () => allData.filter((s) => s.role === 'specialist').length,
    [allData],
  );

  const isFiltered =
    roleFilter !== 'all' || activeFilter !== 'all' || specFilter !== 'all' || !!debouncedSearch;

  const resetFilters = useCallback(() => {
    setRoleFilter('all');
    setActiveFilter('all');
    setSpecFilter('all');
    setSearchInput('');
    setDebouncedSearch('');
  }, []);

  const columns: ColumnDef<StaffMember, unknown>[] = useMemo(
    () => [
      {
        id: 'avatar',
        header: () => null,
        cell: ({ row }) => (
          <Avatar size="default">
            <AvatarFallback>{getInitials(row.original.full_name)}</AvatarFallback>
          </Avatar>
        ),
        size: 56,
        enableSorting: false,
      },
      {
        id: 'full_name',
        header: () => t('columns.full_name'),
        cell: ({ row }) => (
          <strong className="text-[color:var(--text-1)]">{row.original.full_name ?? '—'}</strong>
        ),
      },
      {
        id: 'phone',
        header: () => t('columns.phone'),
        cell: ({ row }) => (
          <span className="font-mono text-[color:var(--text-3)]">
            {row.original.phone ? formatPhone(row.original.phone) : '—'}
          </span>
        ),
      },
      {
        id: 'role',
        header: () => t('columns.role'),
        cell: ({ row }) => (
          <Badge variant={roleVariant(row.original.role)}>{t(`role.${row.original.role}`)}</Badge>
        ),
      },
      {
        id: 'specialist_type',
        header: () => t('columns.specialist_type'),
        cell: ({ row }) =>
          row.original.specialist_type ? (
            t(`specialist_type.${row.original.specialist_type}`)
          ) : (
            <span className="text-[color:var(--text-4)]">{'—'}</span>
          ),
      },
      {
        id: 'groups',
        header: () => t('columns.groups'),
        cell: () => <span className="text-[color:var(--text-4)]">{'—'}</span>,
      },
      {
        id: 'status',
        header: () => t('columns.status'),
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.is_active)} dot>
            {t(`status.${row.original.is_active ? 'active' : 'inactive'}`)}
          </Badge>
        ),
      },
    ],
    [t],
  );

  const rowActions = useMemo(
    () => [
      {
        label: t('actions.view'),
        icon: <EyeIcon className="size-4" />,
        onClick: (row: StaffMember) => navigate(`/staff/${row.id}`),
      },
    ],
    [navigate, t],
  );

  const toolbar = (
    <>
      <div className="relative w-[240px]">
        <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-4)]" />
        <Input
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t('search_placeholder')}
          className="pl-9"
        />
      </div>
      <Select value={roleFilter} onValueChange={setRoleFilter}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.all_roles')}</SelectItem>
          <SelectItem value="admin">{t('role.admin')}</SelectItem>
          <SelectItem value="mentor">{t('role.mentor')}</SelectItem>
          <SelectItem value="specialist">{t('role.specialist')}</SelectItem>
          <SelectItem value="reception">{t('role.reception')}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={activeFilter} onValueChange={setActiveFilter}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.all_statuses')}</SelectItem>
          <SelectItem value="active">{t('filters.active')}</SelectItem>
          <SelectItem value="inactive">{t('filters.inactive')}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={specFilter} onValueChange={setSpecFilter}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.all_specialties')}</SelectItem>
          {SPECIALIST_TYPES.map((st) => (
            <SelectItem key={st} value={st}>
              {t(`specialist_type.${st}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex-1" />
      <Button variant="outline" disabled>
        <DownloadIcon className="size-4" />
        {t('export')}
      </Button>
    </>
  );

  const roleChips: { value: string; label: string; count?: number }[] = useMemo(
    () => [
      { value: 'all', label: t('filters.all_roles'), count: allData.length },
      { value: 'mentor', label: t('role.mentor'), count: mentorCount },
      { value: 'specialist', label: t('role.specialist'), count: specialistCount },
    ],
    [t, allData.length, mentorCount, specialistCount],
  );

  if (isMobile) {
    return (
      <>
        <MobileTopBar
          title={t('title')}
          sub={t('mobile.header_sub', { count: activeCount })}
          action={
            <button
              type="button"
              className="m-iconbtn primary"
              onClick={() => setCreateOpen(true)}
              aria-label={t('create_button')}
            >
              <PlusIcon />
            </button>
          }
        />

        <div className="flex flex-col gap-3">
          <div className="m-search">
            <SearchIcon />
            <input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('search_placeholder')}
            />
          </div>

          <div className="m-chips">
            {roleChips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                className={cn('m-chip', roleFilter === chip.value && 'active')}
                onClick={() => setRoleFilter(chip.value)}
              >
                {chip.label}
                {chip.count !== undefined && <span className="m-chip-count">{chip.count}</span>}
              </button>
            ))}
          </div>

          <div className="m-card flush">
            {data.map((s) => (
              <div
                key={s.id}
                className="m-list-row"
                style={{ opacity: s.is_active ? 1 : 0.55 }}
                onClick={() => navigate(`/staff/${s.id}`)}
              >
                <div className="m-avatar staff">{getInitials(s.full_name)}</div>
                <div className="min-w-0">
                  <div className="m-row-title">{s.full_name}</div>
                  <div className="m-row-sub flex items-center gap-1.5" style={{ marginTop: 3 }}>
                    <Badge
                      variant={roleVariant(s.role)}
                      className="text-[10.5px]"
                      style={{ padding: '1px 6px' }}
                    >
                      {t(`role.${s.role}`)}
                    </Badge>
                    <span className="text-[color:var(--text-3)]">· —</span>
                  </div>
                </div>
                {!s.is_active && (
                  <span className="text-[11px] text-[color:var(--text-4)]">
                    {t('status.inactive')}
                  </span>
                )}
                {s.is_active && <ChevronRightIcon className="m-row-chev size-4" />}
              </div>
            ))}
          </div>

          <Fab onClick={() => setCreateOpen(true)} aria-label={t('create_button')}>
            <PlusIcon />
          </Fab>

          <CreateStaffModal
            open={createOpen}
            onOpenChange={setCreateOpen}
            groups={groupsQuery.data ?? []}
          />
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {t('title')}
          </h1>
          <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
            {t('subtitle', {
              active: String(activeCount),
              mentors: String(mentorCount),
              specialists: String(specialistCount),
            })}
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" />
          {t('create_button')}
        </Button>
      </div>

      <DataTable<StaffMember>
        columns={columns}
        data={data}
        isLoading={staffQuery.isPending}
        isError={staffQuery.isError}
        onRetry={() => void staffQuery.refetch()}
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
        onRowClick={(row) => navigate(`/staff/${row.id}`)}
        rowClassName={(row) => (!row.is_active ? 'opacity-60' : undefined)}
        rowActions={rowActions}
        toolbar={toolbar}
      />

      <CreateStaffModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        groups={groupsQuery.data ?? []}
      />
    </div>
  );
}

type GroupItem = NonNullable<ReturnType<typeof useGroups>['data']>[number];

function CreateStaffModal({
  open,
  onOpenChange,
  groups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupItem[];
}) {
  const { t } = useTranslation('staff');
  const tErrors = useTranslation('errors').t;
  const navigate = useNavigate();
  const createStaff = useCreateStaff();

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [currentRole, setCurrentRole] = useState<string>('mentor');
  const assignMentor = useAssignGroupMentor(selectedGroupId || '__unused__');

  const form = useForm<CreateStaffForm>({
    resolver: zodResolver(CreateStaffSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      role: 'mentor',
      specialist_type: undefined,
      hired_at: '',
      group_id: GROUP_NONE,
    },
  });

  function handleClose() {
    onOpenChange(false);
    form.reset();
    setSelectedGroupId('');
    setCurrentRole('mentor');
  }

  function handleSubmit(data: CreateStaffForm) {
    const body = {
      full_name: data.full_name,
      phone: data.phone,
      role: data.role,
      specialist_type:
        data.role === 'specialist' && data.specialist_type
          ? (data.specialist_type as SpecialistType)
          : undefined,
      hired_at: data.hired_at || undefined,
    };

    const wantsGroupAssign =
      data.role === 'mentor' && data.group_id && data.group_id !== GROUP_NONE;

    if (wantsGroupAssign) {
      setSelectedGroupId(data.group_id!);
    }

    createStaff.mutate(body, {
      onSuccess: (created) => {
        if (wantsGroupAssign) {
          assignMentor.mutate(
            { staff_member_id: created.id },
            {
              onSuccess: () => {
                toast.success(t('create.success'));
                handleClose();
                navigate(`/staff/${created.id}`);
              },
              onError: (assignErr) => {
                toast.success(t('create.success'));
                toast.warning(t('create.group_assign_failed'));
                console.error(assignErr);
                handleClose();
                navigate(`/staff/${created.id}`);
              },
            },
          );
        } else {
          toast.success(t('create.success'));
          handleClose();
          navigate(`/staff/${created.id}`);
        }
      },
      onError: (error) => {
        const mapped = mapValidationErrors(error, form.setError);
        if (!mapped) {
          toast.error(tErrors(toI18nKey(error)));
        }
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[600px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('create.title')}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4 px-[22px] pb-[18px]"
        >
          <div className="flex gap-2.5 rounded-[var(--r-md)] border border-[color-mix(in_oklab,var(--info)_20%,transparent)] bg-[var(--info-soft)] p-3 text-[12px] text-[color:var(--info-fg)]">
            <span>{t('create.welcome_sms_banner')}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('create.full_name')}
                <span className="text-[color:var(--danger)]"> *</span>
              </Label>
              <Input
                {...form.register('full_name')}
                placeholder={t('create.full_name_placeholder')}
                aria-invalid={!!form.formState.errors.full_name}
              />
              {form.formState.errors.full_name && (
                <p className="text-[12px] text-[color:var(--danger-fg)]">
                  {form.formState.errors.full_name.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('create.phone')}
                <span className="text-[color:var(--danger)]"> *</span>
              </Label>
              <Controller
                control={form.control}
                name="phone"
                render={({ field, fieldState }) => (
                  <>
                    <PhoneInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t('create.phone_placeholder')}
                      hasError={!!fieldState.error}
                    />
                    {fieldState.error && (
                      <p className="text-[12px] text-[color:var(--danger-fg)]">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('create.role')}
                <span className="text-[color:var(--danger)]"> *</span>
              </Label>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      setCurrentRole(v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t('role.admin')}</SelectItem>
                      <SelectItem value="mentor">{t('role.mentor')}</SelectItem>
                      <SelectItem value="specialist">{t('role.specialist')}</SelectItem>
                      <SelectItem value="reception">{t('role.reception')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('create.hired_at')}
              </Label>
              <Input type="date" {...form.register('hired_at')} />
            </div>
          </div>

          {currentRole === 'specialist' && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('create.specialist_type')}
                <span className="text-[color:var(--danger)]"> *</span>
              </Label>
              <Controller
                control={form.control}
                name="specialist_type"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('create.specialist_type_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALIST_TYPES.map((st) => (
                        <SelectItem key={st} value={st}>
                          {t(`specialist_type.${st}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {currentRole === 'mentor' && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('create.group_label')}
              </Label>
              <Controller
                control={form.control}
                name="group_id"
                render={({ field }) => (
                  <Select
                    value={field.value || GROUP_NONE}
                    onValueChange={(v) => {
                      field.onChange(v);
                      setSelectedGroupId(v === GROUP_NONE ? '' : v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={GROUP_NONE}>{t('create.group_not_assign')}</SelectItem>
                      {groups
                        .filter((g) => !g.archived_at)
                        .map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name} &middot; {g.capacity}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <span className="text-[12px] text-[color:var(--text-3)]">
                {t('create.group_hint')}
              </span>
            </div>
          )}

          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('create.cancel')}
            </Button>
            <Button type="submit" disabled={createStaff.isPending || assignMentor.isPending}>
              {t('create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
