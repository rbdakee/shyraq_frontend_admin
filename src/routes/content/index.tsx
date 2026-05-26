// TODO(B12): wire useContent hook when B12 (Content desktop) is built
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, StarIcon, HeartIcon, MailIcon, EyeIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { Fab } from '@/components/ui/fab';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { getInitials } from '@/lib/format';

interface PlaceholderPost {
  id: string;
  author: string;
  grp: string;
  ts: string;
  title: string;
  body: string;
  img: boolean;
  likes: number;
  comments: number;
  status: 'published' | 'scheduled' | 'draft';
  pinned?: boolean;
}

const PLACEHOLDER_POSTS: PlaceholderPost[] = [
  {
    id: '1',
    author: 'Динара О.',
    grp: 'Звёздочки',
    ts: '15 мин',
    title: 'Сегодня лепили из пластилина',
    body: 'Наши малыши сделали целый зоопарк из глины. Завтра принесём в группу — приходите смотреть!',
    img: true,
    likes: 18,
    comments: 4,
    status: 'published',
  },
  {
    id: '2',
    author: 'Жанар К.',
    grp: 'Солнышко',
    ts: '2 ч',
    title: 'Музыкальное занятие',
    body: 'Сегодня учили колыбе��ьную «Бесік жыры». Дети поют замечательно!',
    img: false,
    likes: 12,
    comments: 2,
    status: 'published',
  },
  {
    id: '3',
    author: 'Айгуль Т.',
    grp: 'Всем родителям',
    ts: 'Вчера',
    title: 'Праздни�� 1 июня — программа',
    body: 'Дорогие родители! Делимся программой Дня защиты детей.',
    img: true,
    likes: 34,
    comments: 11,
    status: 'published',
    pinned: true,
  },
  {
    id: '4',
    author: 'Динара О.',
    grp: 'Звёздочки',
    ts: 'Завтра в 09:00',
    title: 'Утренник: подготовка',
    body: 'Напоминаем: завтра репетиция к выпускному. Форма — белый верх, тёмный низ.',
    img: false,
    likes: 0,
    comments: 0,
    status: 'scheduled',
  },
];

type ContentTab = 'feed' | 'scheduled' | 'drafts';

export default function ContentPage() {
  const { t } = useTranslation('common');
  const { isMobile } = useBreakpoint();
  const [tab, setTab] = useState<ContentTab>('feed');

  if (!isMobile) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="text-xl font-bold text-[color:var(--text-1)]">
          {t('shell.section_in_development')}
        </h1>
      </div>
    );
  }

  const filteredPosts = PLACEHOLDER_POSTS.filter((p) => {
    if (tab === 'feed') return p.status === 'published';
    if (tab === 'scheduled') return p.status === 'scheduled';
    return p.status === 'draft';
  });

  const scheduledCount = PLACEHOLDER_POSTS.filter((p) => p.status === 'scheduled').length;

  return (
    <div className="flex flex-col gap-3">
      <MobileTopBar
        title={t('mobile_content_title')}
        sub={t('mobile_content_sub')}
        back
        action={
          <button type="button" className="m-iconbtn primary" aria-label={t('actions.create')}>
            <PlusIcon />
          </button>
        }
      />

      <div className="m-segmented" style={{ marginBottom: 12 }}>
        <button type="button" className={tab === 'feed' ? 'on' : ''} onClick={() => setTab('feed')}>
          {t('mobile_content_tab_feed')}
        </button>
        <button
          type="button"
          className={tab === 'scheduled' ? 'on' : ''}
          onClick={() => setTab('scheduled')}
        >
          {t('mobile_content_tab_scheduled')}
          {scheduledCount > 0 && (
            <span
              style={{
                marginLeft: 5,
                background: 'var(--bg-sunken)',
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 999,
              }}
            >
              {scheduledCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className={tab === 'drafts' ? 'on' : ''}
          onClick={() => setTab('drafts')}
        >
          {t('mobile_content_tab_drafts')}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredPosts.map((p) => (
          <div
            key={p.id}
            className="m-card"
            style={{ padding: 0, overflow: 'hidden', position: 'relative' }}
          >
            {p.pinned && (
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  background: 'var(--primary)',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  zIndex: 1,
                }}
              >
                <StarIcon style={{ width: 11, height: 11 }} />
                {t('mobile_content_pinned')}
              </div>
            )}
            <div style={{ padding: '14px 14px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="m-avatar staff sm">{getInitials(p.author)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.author}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {p.grp} · {p.ts}
                </div>
              </div>
              {p.status === 'scheduled' && (
                <Badge variant="info" dot className="text-[10.5px]">
                  {t('mobile_content_status_scheduled')}
                </Badge>
              )}
            </div>
            <div style={{ padding: '10px 14px' }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14.5,
                  marginBottom: 4,
                  letterSpacing: '-0.005em',
                }}
              >
                {p.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{p.body}</div>
            </div>
            {p.img && (
              <div
                style={{
                  height: 140,
                  margin: '0 14px',
                  borderRadius: 8,
                  background: 'var(--bg-sunken)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: 'var(--text-4)',
                }}
              >
                {t('mobile_content_photo_placeholder')}
              </div>
            )}
            {p.status === 'published' && (
              <div
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  gap: 14,
                  fontSize: 12.5,
                  color: 'var(--text-3)',
                  borderTop: '1px solid var(--line)',
                  marginTop: 12,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <HeartIcon style={{ width: 14, height: 14 }} />
                  {p.likes}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MailIcon style={{ width: 14, height: 14 }} />
                  {p.comments}
                </span>
                <span style={{ marginLeft: 'auto' }}>
                  <EyeIcon style={{ width: 14, height: 14 }} />
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <Fab aria-label={t('actions.create')}>
        <PlusIcon />
      </Fab>
    </div>
  );
}
