import { describe, expect, it } from 'vitest';
import {
  CustomDiscountResponseDtoSchema,
  CustomDiscountApplicationResponseDtoSchema,
  DiscountTypeEnum,
  DiscountStatusEnum,
  TargetTypeEnum,
} from './custom-discounts';

const validDiscount = {
  id: 'd1a2b3c4-0001-0001-0001-000000000001',
  kindergarten_id: '00000000-0000-0000-0000-000000000001',
  name: { ru: 'Скидка на 8 марта', kz: '8 наурыз жеңілдігі' },
  description: { ru: 'Описание', kz: 'Сипаттама' },
  discount_type: 'percentage',
  amount: 15,
  conditions: {
    op: 'all_of',
    rules: [
      { type: 'siblings_count', value: 2 },
      { type: 'prepayment_months', value: 3 },
    ],
  },
  target_type: 'all',
  target_ids: null,
  valid_from: '2026-03-01',
  valid_until: '2026-03-31',
  max_uses_per_child: 1,
  total_max_uses: 100,
  used_count: 42,
  priority: 100,
  stackable: false,
  notify_on_activation: true,
  notification_title: { ru: 'Скидка!', kz: 'Жеңілдік!' },
  notification_body: { ru: 'Подробности...', kz: 'Толығырақ...' },
  status: 'active',
  created_by: 'u1a2b3c4-0001-0001-0001-000000000001',
  created_at: '2026-02-15T09:00:00.000Z',
  updated_at: '2026-03-01T10:00:00.000Z',
};

describe('CustomDiscountResponseDtoSchema', () => {
  it('parses a valid discount with conditions JSONB', () => {
    const result = CustomDiscountResponseDtoSchema.parse(validDiscount);
    expect(result.id).toBe(validDiscount.id);
    expect(result.conditions).toEqual(validDiscount.conditions);
    expect(result.amount).toBe(15);
    expect(result.status).toBe('active');
  });

  it('parses discount with empty conditions', () => {
    const discount = { ...validDiscount, conditions: {} };
    const result = CustomDiscountResponseDtoSchema.parse(discount);
    expect(result.conditions).toEqual({});
  });

  it('parses discount with age_range conditions', () => {
    const discount = {
      ...validDiscount,
      target_type: 'age_range',
      conditions: { type: 'age_range', age_from: 12, age_to: 36 },
    };
    const result = CustomDiscountResponseDtoSchema.parse(discount);
    expect(result.conditions).toEqual({
      type: 'age_range',
      age_from: 12,
      age_to: 36,
    });
  });

  it('parses discount with nested conditions', () => {
    const discount = {
      ...validDiscount,
      conditions: {
        op: 'any_of',
        rules: [
          { type: 'birthday_month', value: 3 },
          { type: 'first_invoice', value: true },
        ],
      },
    };
    const result = CustomDiscountResponseDtoSchema.parse(discount);
    expect(result.conditions.op).toBe('any_of');
  });

  it('parses discount with all nullable fields as null', () => {
    const discount = {
      ...validDiscount,
      description: null,
      target_ids: null,
      valid_until: null,
      max_uses_per_child: null,
      total_max_uses: null,
      notification_title: null,
      notification_body: null,
      created_by: null,
    };
    const result = CustomDiscountResponseDtoSchema.parse(discount);
    expect(result.description).toBeNull();
    expect(result.notification_title).toBeNull();
  });

  it('parses all discount_type enum values', () => {
    for (const dt of DiscountTypeEnum.options) {
      const discount = { ...validDiscount, discount_type: dt };
      expect(CustomDiscountResponseDtoSchema.parse(discount).discount_type).toBe(dt);
    }
  });

  it('parses all status enum values', () => {
    for (const s of DiscountStatusEnum.options) {
      const discount = { ...validDiscount, status: s };
      expect(CustomDiscountResponseDtoSchema.parse(discount).status).toBe(s);
    }
  });

  it('parses all target_type enum values', () => {
    for (const tt of TargetTypeEnum.options) {
      const discount = { ...validDiscount, target_type: tt };
      expect(CustomDiscountResponseDtoSchema.parse(discount).target_type).toBe(tt);
    }
  });

  it('rejects unknown status', () => {
    const discount = { ...validDiscount, status: 'unknown' };
    expect(() => CustomDiscountResponseDtoSchema.parse(discount)).toThrow();
  });

  it('rejects missing required fields', () => {
    const { id: _id, ...noId } = validDiscount;
    void _id;
    expect(() => CustomDiscountResponseDtoSchema.parse(noId)).toThrow();
  });
});

describe('CustomDiscountApplicationResponseDtoSchema', () => {
  const validApplication = {
    id: 'a1a2b3c4-0001-0001-0001-000000000001',
    kindergarten_id: '00000000-0000-0000-0000-000000000001',
    custom_discount_id: 'd1a2b3c4-0001-0001-0001-000000000001',
    invoice_id: 'i1a2b3c4-0001-0001-0001-000000000001',
    invoice_line_item_id: null,
    child_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    amount_applied: 18000,
    applied_at: '2026-03-05T14:30:00.000Z',
  };

  it('parses a valid application', () => {
    const result = CustomDiscountApplicationResponseDtoSchema.parse(validApplication);
    expect(result.id).toBe(validApplication.id);
    expect(result.amount_applied).toBe(18000);
  });

  it('parses application with line_item_id', () => {
    const app = {
      ...validApplication,
      invoice_line_item_id: 'l1a2b3c4-0001-0001-0001-000000000001',
    };
    const result = CustomDiscountApplicationResponseDtoSchema.parse(app);
    expect(result.invoice_line_item_id).toBe('l1a2b3c4-0001-0001-0001-000000000001');
  });

  it('rejects missing required fields', () => {
    const { child_id: _cid, ...noChild } = validApplication;
    void _cid;
    expect(() => CustomDiscountApplicationResponseDtoSchema.parse(noChild)).toThrow();
  });
});
