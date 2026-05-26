import { describe, expect, it } from 'vitest';
import { resolveJsonbI18n } from './jsonb-i18n';

describe('resolveJsonbI18n', () => {
  describe('locale ru', () => {
    it('returns ru value when locale is ru', () => {
      expect(resolveJsonbI18n({ ru: 'Привет', kz: 'Сәлем' }, 'ru')).toBe('Привет');
    });

    it('returns empty string when ru is missing and locale is ru', () => {
      expect(resolveJsonbI18n({ kz: 'Сәлем' }, 'ru')).toBe('');
    });

    it('returns empty string when ru is empty string', () => {
      expect(resolveJsonbI18n({ ru: '', kz: 'Сәлем' }, 'ru')).toBe('');
    });
  });

  describe('locale kk → reads kz key (the key nuance)', () => {
    it('returns kz value when locale is kk', () => {
      expect(resolveJsonbI18n({ ru: 'Привет', kz: 'Сәлем' }, 'kk')).toBe('Сәлем');
    });

    it('does NOT return ru when kz is present and locale is kk', () => {
      const result = resolveJsonbI18n({ ru: 'should not appear', kz: 'Сәлем' }, 'kk');
      expect(result).toBe('Сәлем');
    });
  });

  describe('fallback: kk requested but kz missing → ru', () => {
    it('falls back to ru when kz is missing', () => {
      expect(resolveJsonbI18n({ ru: 'Привет' }, 'kk')).toBe('Привет');
    });

    it('falls back to ru when kz is empty string', () => {
      expect(resolveJsonbI18n({ ru: 'Привет', kz: '' }, 'kk')).toBe('Привет');
    });
  });

  describe('fallback: both ru and kz missing → empty string', () => {
    it('returns empty string when both ru and kz are missing', () => {
      expect(resolveJsonbI18n({}, 'kk')).toBe('');
    });

    it('returns empty string when both ru and kz are missing, locale ru', () => {
      expect(resolveJsonbI18n({}, 'ru')).toBe('');
    });

    it('returns empty string when ru is missing and kz is empty, locale kk', () => {
      expect(resolveJsonbI18n({ kz: '' }, 'kk')).toBe('');
    });
  });

  describe('null / undefined input', () => {
    it('returns empty string for null', () => {
      expect(resolveJsonbI18n(null, 'ru')).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(resolveJsonbI18n(undefined, 'kk')).toBe('');
    });
  });

  describe('locale kk → reads kk key (new MultiLangTextDto)', () => {
    it('returns kk value when kk is present', () => {
      expect(resolveJsonbI18n({ ru: 'Привет', kk: 'Сәлем' }, 'kk')).toBe('Сәлем');
    });

    it('falls through to kz when kk is empty', () => {
      expect(resolveJsonbI18n({ ru: 'Привет', kk: '', kz: 'Сәлем-kz' }, 'kk')).toBe('Сәлем-kz');
    });

    it('kk wins over kz when both present (BCP 47 canonical for new DTOs)', () => {
      expect(resolveJsonbI18n({ ru: 'Привет', kk: 'Сәлем-kk', kz: 'Сәлем-kz' }, 'kk')).toBe(
        'Сәлем-kk',
      );
    });

    it('falls back to kz when kk is missing', () => {
      expect(resolveJsonbI18n({ ru: 'Привет', kz: 'Сәлем-kz' }, 'kk')).toBe('Сәлем-kz');
    });

    it('locale ru ignores kk even if present', () => {
      expect(resolveJsonbI18n({ ru: 'Привет', kk: 'Сәлем-kk' }, 'ru')).toBe('Привет');
    });
  });

  describe('extra keys ignored', () => {
    it('ignores unknown extra keys on the object', () => {
      const value = { ru: 'Привет', kz: 'Сәлем', en: 'Hello' } as {
        ru: string;
        kz: string;
        kk?: string;
      };
      expect(resolveJsonbI18n(value, 'ru')).toBe('Привет');
      expect(resolveJsonbI18n(value, 'kk')).toBe('Сәлем');
    });
  });
});
