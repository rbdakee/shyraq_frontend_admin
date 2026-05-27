import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlusIcon, LayersIcon, IdCardIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBox } from '@/components/feedback/skeleton';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useGroups, useGroupChildren, useGroupActiveMentor } from '@/hooks/use-groups';
import { useStaff } from '@/hooks/use-staff';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/cn';
import { getInitials } from '@/lib/format';
import { CreateGroupDialog } from './create-group-dialog';

function GroupCard({
  groupId,
  groupName,
  capacity,
  ageMin,
  ageMax,
}: {
  groupId: string;
  groupName: string;
  capacity: number;
  ageMin: number | null;
  ageMax: number | null;
}) {
  const { t } = useTranslation('groups');
  const navigate = useNavigate();
  const childrenQuery = useGroupChildren(groupId);
  const mentorQuery = useGroupActiveMentor(groupId);

  const kids = childrenQuery.data?.data.length ?? 0;
  const pct = capacity > 0 ? (kids / capacity) * 100 : 0;
  const tone = kids > capacity ? 'danger' : pct > 85 ? 'warning' : '';

  const mentorStaffId = mentorQuery.data?.staff_member_id;

  return (
    <div
      className="cursor-pointer rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4 shadow-[var(--shyraq-shadow-1)] transition-shadow hover:shadow-[var(--shyraq-shadow-2)]"
      onClick={() => navigate(`/groups/${groupId}`)}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[15px] font-semibold text-[color:var(--text-1)]">{groupName}</div>
          <div className="text-[12px] text-[color:var(--text-3)]">
            {ageMin !== null && ageMax !== null
              ? t('card.age_range', { min: ageMin, max: ageMax })
              : '—'}
          </div>
        </div>
        {kids > capacity && <Badge variant="error">{t('card.overflow')}</Badge>}
        {kids === capacity && kids > 0 && <Badge variant="warning">{t('card.full')}</Badge>}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[12px] text-[color:var(--text-3)]">
          <span>{t('card.capacity', { kids, capacity })}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-sunken)]">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              tone === 'danger'
                ? 'bg-[var(--danger)]'
                : tone === 'warning'
                  ? 'bg-[var(--warning)]'
                  : 'bg-[var(--primary)]',
            )}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      <MentorBlock staffMemberId={mentorStaffId ?? null} />
    </div>
  );
}

function MentorBlock({ staffMemberId }: { staffMemberId: string | null }) {
  const { t } = useTranslation('groups');

  if (!staffMemberId) {
    return (
      <div className="mt-3 flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-full bg-[var(--bg-sunken)]">
          <LayersIcon className="size-4 text-[color:var(--text-4)]" />
        </div>
        <div>
          <div className="text-[13px] font-semibold text-[color:var(--text-3)]">
            {t('card.no_mentor')}
          </div>
        </div>
      </div>
    );
  }

  return <MentorBlockResolved staffId={staffMemberId} />;
}

function MentorBlockResolved({ staffId }: { staffId: string }) {
  const { t } = useTranslation('groups');
  const staffQuery = useStaff(staffId);
  const name = staffQuery.data?.full_name ?? '—';

  return (
    <div className="mt-3 flex items-center gap-2.5">
      <Avatar size="sm">
        <AvatarFallback>{name !== '—' ? getInitials(name) : '?'}</AvatarFallback>
      </Avatar>
      <div>
        <div className="text-[13px] font-semibold text-[color:var(--text-2)]">{name}</div>
        <div className="text-[11px] text-[color:var(--text-3)]">{t('card.mentor_label')}</div>
      </div>
    </div>
  );
}

function MobileGroupCard({
  group,
  navigate,
  t,
}: {
  group: {
    id: string;
    name: string;
    capacity: number;
    age_range_min: number | null;
    age_range_max: number | null;
  };
  navigate: (path: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const childrenQuery = useGroupChildren(group.id);
  const mentorQuery = useGroupActiveMentor(group.id);
  const mentorStaffId = mentorQuery.data?.staff_member_id;

  const kids = childrenQuery.data?.data.length ?? 0;
  const pct = group.capacity > 0 ? Math.min(100, (kids / group.capacity) * 100) : 0;
  const isOver = kids > group.capacity;

  return (
    <div className="m-card" style={{ padding: 14 }} onClick={() => navigate(`/groups/${group.id}`)}>
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--bg-sunken)] text-xl">
            <LayersIcon className="size-5 text-[color:var(--primary)]" />
          </div>
          <div>
            <div className="text-[15px] font-bold">{group.name}</div>
            <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
              {group.age_range_min !== null && group.age_range_max !== null
                ? t('card.age_range', { min: group.age_range_min, max: group.age_range_max })
                : '—'}
            </div>
          </div>
        </div>
        {isOver && (
          <Badge variant="error" className="text-[10.5px]">
            {t('card.overflow')}
          </Badge>
        )}
      </div>
      <div className="mb-2 flex items-center gap-1.5 text-[12px] text-[color:var(--text-3)]">
        <IdCardIcon className="size-[13px]" />
        <MobileMentorName staffId={mentorStaffId ?? null} />
      </div>
      <div className="mb-[5px] flex justify-between text-[12px] text-[color:var(--text-3)]">
        <span>{t('mobile.capacity_label')}</span>
        <span>
          <strong
            className="text-[color:var(--text-1)]"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {kids}
          </strong>{' '}
          / {group.capacity}
        </span>
      </div>
      <div className="cap-bar">
        <div
          className="cap-fill"
          style={{
            width: `${pct}%`,
            background:
              pct >= 100 ? 'var(--danger)' : pct >= 85 ? 'var(--warning)' : 'var(--success)',
          }}
        />
      </div>
    </div>
  );
}

function MobileMentorName({ staffId }: { staffId: string | null }) {
  const { t } = useTranslation('groups');
  const staffQuery = useStaff(staffId ?? '');
  if (!staffId) return <span>{t('card.no_mentor')}</span>;
  return <span>{staffQuery.data?.full_name ?? '—'}</span>;
}

export default function GroupsListPage() {
  const { t } = useTranslation('groups');
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [createOpen, setCreateOpen] = useState(false);

  const groupsQuery = useGroups({ archived: false });
  const groups = groupsQuery.data ?? [];

  if (groupsQuery.isPending) {
    return (
      <div className="flex flex-col gap-[14px]">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-7 w-32 animate-pulse rounded bg-[var(--bg-sunken)]" />
            <div className="mt-1 h-4 w-48 animate-pulse rounded bg-[var(--bg-sunken)]" />
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[14px]">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonBox key={i} height={170} />
          ))}
        </div>
      </div>
    );
  }

  if (groupsQuery.isError) {
    return <ErrorState onRetry={() => void groupsQuery.refetch()} />;
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col gap-[14px]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
              {t('title')}
            </h1>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" />
            {t('create_button')}
          </Button>
        </div>
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
        <CreateGroupDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={(id) => navigate(`/groups/${id}`)}
        />
      </div>
    );
  }

  const totalChildren = 0;
  const overflowCount = 0;

  if (isMobile) {
    return (
      <>
        <MobileTopBar
          title={t('title')}
          sub={t('mobile.header_sub', { count: groups.length })}
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
          <div
            className="m-kpi-row"
            style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}
          >
            <div className="m-kpi" style={{ padding: '10px 12px' }}>
              <div className="m-kpi-label" style={{ fontSize: 9.5 }}>
                {t('mobile.kpi_groups')}
              </div>
              <div className="m-kpi-value" style={{ fontSize: 18 }}>
                {groups.length}
              </div>
            </div>
            <div className="m-kpi" style={{ padding: '10px 12px' }}>
              <div className="m-kpi-label" style={{ fontSize: 9.5 }}>
                {t('mobile.kpi_children')}
              </div>
              <div className="m-kpi-value" style={{ fontSize: 18 }}>
                {totalChildren}
              </div>
            </div>
            <div className="m-kpi" style={{ padding: '10px 12px' }}>
              <div className="m-kpi-label" style={{ fontSize: 9.5, color: 'var(--danger-fg)' }}>
                {t('mobile.kpi_overflow')}
              </div>
              <div className="m-kpi-value" style={{ fontSize: 18, color: 'var(--danger-fg)' }}>
                {overflowCount}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {groups.map((g) => (
              <MobileGroupCard key={g.id} group={g} navigate={navigate} t={t} />
            ))}
          </div>

          <CreateGroupDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSuccess={(id) => navigate(`/groups/${id}`)}
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
            {t('subtitle', { count: groups.length })}
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" />
          {t('create_button')}
        </Button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[14px]">
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            groupId={g.id}
            groupName={g.name}
            capacity={g.capacity}
            ageMin={g.age_range_min}
            ageMax={g.age_range_max}
          />
        ))}
      </div>

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={(id) => navigate(`/groups/${id}`)}
      />
    </div>
  );
}
