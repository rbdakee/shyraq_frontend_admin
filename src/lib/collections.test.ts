import { describe, it, expect } from 'vitest';
import { uniqueById } from './collections';

describe('uniqueById', () => {
  it('returns an empty array unchanged', () => {
    expect(uniqueById([])).toEqual([]);
  });

  it('keeps unique items in order', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(uniqueById(items)).toEqual(items);
  });

  it('drops later duplicates, first occurrence wins', () => {
    const items = [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
      { id: 'a', v: 3 },
    ];
    expect(uniqueById(items)).toEqual([
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
    ]);
  });
});
