import { describe, expect, it } from 'vitest';
import {
  InvoiceResponseDtoSchema,
  InvoiceLineItemResponseDtoSchema,
  InvoiceTypeEnum,
  InvoiceStatusEnum,
} from './invoices';

const validLineItem = {
  id: 'l1a2b3c4-0004-0004-0004-000000000004',
  invoice_id: 'i1a2b3c4-0005-0005-0005-000000000005',
  kindergarten_id: '00000000-0000-0000-0000-000000000001',
  description: 'Ежемесячная плата — июнь 2026',
  tariff_plan_id: 'f1a2b3c4-0001-0001-0001-000000000001',
  quantity: 1,
  unit_price: 120000,
  line_total: 120000,
  created_at: '2026-05-01T09:00:00.000Z',
};

const validInvoice = {
  id: 'i1a2b3c4-0005-0005-0005-000000000005',
  kindergarten_id: '00000000-0000-0000-0000-000000000001',
  child_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  payment_account_id: 'p1a2b3c4-0006-0006-0006-000000000006',
  tariff_plan_id: 'f1a2b3c4-0001-0001-0001-000000000001',
  invoice_type: 'monthly',
  period_start: '2026-06-01',
  period_end: '2026-06-30',
  amount_due: 120000,
  discount_pct: 10,
  discount_reason: 'Скидка многодетной семье',
  amount_after_discount: 108000,
  amount_paid: 0,
  amount_remaining: 108000,
  status: 'pending',
  due_date: '2026-06-25',
  description: 'Ежемесячная плата за июнь 2026',
  prorated_for_days: null,
  created_at: '2026-05-01T09:00:00.000Z',
  updated_at: '2026-05-01T09:00:00.000Z',
};

describe('InvoiceLineItemResponseDtoSchema', () => {
  it('parses a valid line item', () => {
    const result = InvoiceLineItemResponseDtoSchema.parse(validLineItem);
    expect(result.id).toBe(validLineItem.id);
    expect(result.quantity).toBe(1);
    expect(result.unit_price).toBe(120000);
    expect(result.line_total).toBe(120000);
  });

  it('parses a line item with null tariff_plan_id', () => {
    const item = { ...validLineItem, tariff_plan_id: null };
    const result = InvoiceLineItemResponseDtoSchema.parse(item);
    expect(result.tariff_plan_id).toBeNull();
  });

  it('rejects missing required fields', () => {
    const { description: _d, ...noDesc } = validLineItem;
    void _d;
    expect(() => InvoiceLineItemResponseDtoSchema.parse(noDesc)).toThrow();
  });
});

describe('InvoiceResponseDtoSchema', () => {
  it('parses a valid invoice with all nullable fields populated', () => {
    const result = InvoiceResponseDtoSchema.parse(validInvoice);
    expect(result.id).toBe(validInvoice.id);
    expect(result.invoice_type).toBe('monthly');
    expect(result.status).toBe('pending');
    expect(result.discount_pct).toBe(10);
    expect(result.discount_reason).toBe('Скидка многодетной семье');
    expect(result.description).toBe('Ежемесячная плата за июнь 2026');
    expect(result.prorated_for_days).toBeNull();
  });

  it('parses an invoice with all nullable fields as null', () => {
    const invoice = {
      ...validInvoice,
      tariff_plan_id: null,
      discount_pct: null,
      discount_reason: null,
      description: null,
      prorated_for_days: null,
    };
    const result = InvoiceResponseDtoSchema.parse(invoice);
    expect(result.tariff_plan_id).toBeNull();
    expect(result.discount_pct).toBeNull();
    expect(result.discount_reason).toBeNull();
    expect(result.description).toBeNull();
    expect(result.prorated_for_days).toBeNull();
  });

  it('parses an invoice with line_items array', () => {
    const invoice = { ...validInvoice, line_items: [validLineItem] };
    const result = InvoiceResponseDtoSchema.parse(invoice);
    expect(result.line_items).toHaveLength(1);
    expect(result.line_items![0]!.id).toBe(validLineItem.id);
  });

  it('parses an invoice without line_items (list endpoint)', () => {
    const result = InvoiceResponseDtoSchema.parse(validInvoice);
    expect(result.line_items).toBeUndefined();
  });

  it('parses all invoice_type enum values', () => {
    for (const t of InvoiceTypeEnum.options) {
      const invoice = { ...validInvoice, invoice_type: t };
      expect(InvoiceResponseDtoSchema.parse(invoice).invoice_type).toBe(t);
    }
  });

  it('parses all status enum values', () => {
    for (const s of InvoiceStatusEnum.options) {
      const invoice = { ...validInvoice, status: s };
      expect(InvoiceResponseDtoSchema.parse(invoice).status).toBe(s);
    }
  });

  it('rejects unknown invoice_type', () => {
    const invoice = { ...validInvoice, invoice_type: 'unknown' };
    expect(() => InvoiceResponseDtoSchema.parse(invoice)).toThrow();
  });

  it('rejects unknown status', () => {
    const invoice = { ...validInvoice, status: 'unknown' };
    expect(() => InvoiceResponseDtoSchema.parse(invoice)).toThrow();
  });

  it('rejects missing required fields', () => {
    const { id: _id, ...noId } = validInvoice;
    void _id;
    expect(() => InvoiceResponseDtoSchema.parse(noId)).toThrow();
  });
});
