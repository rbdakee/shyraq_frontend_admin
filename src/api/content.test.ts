import { describe, expect, it } from 'vitest';
import { buildContentFormData } from './content';

describe('buildContentFormData', () => {
  it('appends scalar fields as form-data', () => {
    const fd = buildContentFormData({
      content_type: 'news',
      target_type: 'all',
      title: 'Hello',
    });
    expect(fd.get('content_type')).toBe('news');
    expect(fd.get('target_type')).toBe('all');
    expect(fd.get('title')).toBe('Hello');
  });

  it('skips undefined and null scalar fields', () => {
    const fd = buildContentFormData({
      content_type: 'qundylyq',
      target_type: 'group',
      target_group_id: undefined,
      target_child_id: undefined,
    });
    expect(fd.has('target_group_id')).toBe(false);
    expect(fd.has('target_child_id')).toBe(false);
  });

  it('JSON-stringifies object fields (title_i18n, body_i18n, metadata)', () => {
    const titleI18n = { ru: 'Привет', kk: 'Сәлем' };
    const bodyI18n = { ru: 'Текст', kk: 'Мәтін' };
    const metadata = { month: '2026-05', theme: 'Құрмет' };

    const fd = buildContentFormData({
      content_type: 'qundylyq',
      target_type: 'all',
      title_i18n: titleI18n,
      body_i18n: bodyI18n,
      metadata,
    });

    expect(fd.get('title_i18n')).toBe(JSON.stringify(titleI18n));
    expect(fd.get('body_i18n')).toBe(JSON.stringify(bodyI18n));
    expect(fd.get('metadata')).toBe(JSON.stringify(metadata));
  });

  it('does not add object fields when undefined', () => {
    const fd = buildContentFormData({
      content_type: 'news',
      target_type: 'all',
    });
    expect(fd.has('title_i18n')).toBe(false);
    expect(fd.has('body_i18n')).toBe(false);
    expect(fd.has('metadata')).toBe(false);
  });

  it('appends files under plural "files" key', () => {
    const file1 = new File(['a'], 'photo1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['b'], 'photo2.png', { type: 'image/png' });

    const fd = buildContentFormData({ content_type: 'news', target_type: 'all' }, [file1, file2]);

    const all = fd.getAll('files');
    expect(all).toHaveLength(2);
    expect((all[0] as File).name).toBe('photo1.jpg');
    expect((all[1] as File).name).toBe('photo2.png');
  });

  it('works without files param', () => {
    const fd = buildContentFormData({
      content_type: 'news',
      target_type: 'all',
    });
    expect(fd.getAll('files')).toHaveLength(0);
  });
});
