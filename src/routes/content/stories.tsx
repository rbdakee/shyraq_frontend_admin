import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  PlusIcon,
  Trash2Icon,
  EyeIcon,
  PlayIcon,
  ImageIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { ContentSectionTabs } from './_components/content-section-tabs';
import { ContentPageHeader } from './_components/content-page-header';
import { useStories, useCreateStory, useDeleteStory } from '@/hooks/use-stories';
import type { GroupStory } from '@/hooks/use-stories';
import { useGroups } from '@/hooks/use-groups';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { resolveJsonbI18n, type JsonbI18n } from '@/lib/jsonb-i18n';
import { toI18nKey } from '@/lib/error-map';
import { cn } from '@/lib/cn';

const CAPTION_MAX = 500;
const ALL_GROUPS = '__all__';

function captionText(caption: GroupStory['caption'], locale: 'ru' | 'kk'): string {
  if (!caption) return '';
  if (typeof caption === 'string') return caption;
  return resolveJsonbI18n(caption as JsonbI18n, locale);
}

// Stories expire 24 h after creation. Show whole hours left, or an "expired" flag.
function hoursLeft(expiresAt: string): number {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return Math.floor(diffMs / (60 * 60 * 1000));
}

export default function StoriesPage() {
  const { t, i18n } = useTranslation('content');
  const locale = i18n.language as 'ru' | 'kk';
  const { isMobile } = useBreakpoint();

  const [groupFilter, setGroupFilter] = useState<string>(ALL_GROUPS);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const groupsQuery = useGroups();
  const groupNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groupsQuery.data ?? []) map.set(g.id, g.name);
    return map;
  }, [groupsQuery.data]);

  const storiesQuery = useStories(groupFilter !== ALL_GROUPS ? { group_id: groupFilter } : {});
  const stories = storiesQuery.data ?? [];

  const deleteMutation = useDeleteStory();

  function handleDelete() {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success(t('stories.delete_success'));
        setDeleteId(null);
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  return (
    <>
      <ContentPageHeader />
      <div className={isMobile ? 'flex flex-col gap-4' : 'page'}>
        <div className="mb-4">
          <ContentSectionTabs active="stories" />
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_GROUPS}>{t('stories.filter_all_groups')}</SelectItem>
              {(groupsQuery.data ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" />
            {t('stories.add')}
          </Button>
        </div>

        {storiesQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-[var(--r-lg)]" />
            ))}
          </div>
        ) : storiesQuery.isError ? (
          <ErrorState onRetry={() => void storiesQuery.refetch()} />
        ) : stories.length === 0 ? (
          <EmptyState
            title={t('stories.empty')}
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <PlusIcon className="mr-1 size-4" />
                {t('stories.add')}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {stories.map((s) => (
              <StoryCard
                key={s.id}
                story={s}
                groupName={groupNameById.get(s.group_id) ?? ''}
                caption={captionText(s.caption, locale)}
                onDelete={() => setDeleteId(s.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateStoryDialog open={createOpen} onOpenChange={setCreateOpen} />

      <DestructiveConfirm
        open={deleteId !== null}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
        title={t('stories.delete_confirm_title')}
        description={t('stories.delete_confirm_body')}
        confirmLabel={t('stories.delete_confirm_action')}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </>
  );
}

function StoryCard({
  story,
  groupName,
  caption,
  onDelete,
}: {
  story: GroupStory;
  groupName: string;
  caption: string;
  onDelete: () => void;
}) {
  const { t } = useTranslation('content');
  const left = hoursLeft(story.expires_at);
  const isVideo = story.media_type === 'video';

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)]">
      <a
        href={story.media_url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-[var(--bg-sunken)]"
      >
        {isVideo ? (
          <div className="flex flex-col items-center gap-1.5 text-[color:var(--text-4)]">
            <PlayIcon className="size-8" />
            <span className="text-[11px]">{t('stories.video_label')}</span>
          </div>
        ) : (
          <img
            src={story.media_url}
            alt={caption}
            className="size-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute left-2 top-2">
          <Badge variant={left <= 0 ? 'neutral' : 'success'} dot className="text-[10px]">
            {left <= 0 ? t('stories.expired') : t('stories.expires_in', { hours: left })}
          </Badge>
        </div>
      </a>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <div className="truncate text-[12.5px] font-semibold text-[color:var(--text-1)]">
          {groupName || '—'}
        </div>
        {caption && (
          <div className="line-clamp-2 text-[11.5px] text-[color:var(--text-3)]">{caption}</div>
        )}
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="flex items-center gap-1 text-[11px] text-[color:var(--text-4)]">
            <EyeIcon className="size-3.5" />
            {t('stories.views', { count: story.views })}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-[color:var(--danger)] hover:bg-[var(--danger-soft)]"
            onClick={onDelete}
            aria-label={t('stories.delete')}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateStoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation('content');
  const createMutation = useCreateStory();
  const groupsQuery = useGroups();
  const inputRef = useRef<HTMLInputElement>(null);

  const [groupId, setGroupId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [groupError, setGroupError] = useState(false);
  const [fileError, setFileError] = useState(false);

  function reset() {
    setGroupId('');
    setFile(null);
    setCaption('');
    setGroupError(false);
    setFileError(false);
  }

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSubmit() {
    let bad = false;
    if (!groupId) {
      setGroupError(true);
      bad = true;
    }
    if (!file) {
      setFileError(true);
      bad = true;
    }
    if (bad || !file) return;

    createMutation.mutate(
      { group_id: groupId, file, caption: caption.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t('stories.create.success'));
          handleClose(false);
        },
        onError: (err) => {
          toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          console.error(err);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('stories.create.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-[22px] pb-[18px]">
          {/* Group */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('stories.create.group')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Select
              value={groupId}
              onValueChange={(v) => {
                setGroupId(v);
                setGroupError(false);
              }}
            >
              <SelectTrigger aria-invalid={groupError}>
                <SelectValue placeholder={t('stories.create.group_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {(groupsQuery.data ?? []).map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('stories.create.file')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            {file ? (
              <div className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-sunken)] px-3 py-2">
                {file.type.startsWith('video/') ? (
                  <PlayIcon className="size-4 shrink-0 text-[color:var(--text-4)]" />
                ) : (
                  <ImageIcon className="size-4 shrink-0 text-[color:var(--text-4)]" />
                )}
                <span className="min-w-0 flex-1 truncate text-[13px] text-[color:var(--text-1)]">
                  {file.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setFile(null)}
                  aria-label={t('stories.create.cancel')}
                >
                  <XIcon className="size-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[var(--r-lg)] border-2 border-dashed border-[var(--border)] bg-[var(--bg-sunken)] p-6 transition-colors hover:border-[var(--primary)]',
                  fileError && 'border-[var(--danger)]',
                )}
              >
                <UploadIcon className="size-5 text-[color:var(--text-4)]" />
                <span className="text-[13px] font-semibold text-[color:var(--text-2)]">
                  {t('stories.create.file_choose')}
                </span>
                <span className="text-[11.5px] text-[color:var(--text-4)]">
                  {t('stories.create.file_hint')}
                </span>
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f) {
                  setFile(f);
                  setFileError(false);
                }
                e.target.value = '';
              }}
            />
          </div>

          {/* Caption */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('stories.create.caption')}
            </Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))}
              rows={2}
              placeholder={t('stories.create.caption_placeholder')}
            />
          </div>
        </div>

        <DialogFooter className="rounded-b-[var(--r-xl)] border-t border-[var(--line)] px-[22px] py-[14px]">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
          >
            {t('stories.create.cancel')}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending}>
            {t('stories.create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
