import { describe, expect, it } from 'vitest';
import {
  DiagnosticTemplateSchemaSchema,
  DiagnosticTemplateResponseDtoSchema,
  DiagnosticTemplateListResponseSchema,
} from './diagnostic-templates';

describe('DiagnosticTemplateSchemaSchema', () => {
  it('parses a valid template schema with all field types', () => {
    const schema = {
      sections: [
        {
          title: 'Speech',
          fields: [
            { key: 'score', label: 'Score', type: 'number', required: true, min: 0, max: 10 },
            { key: 'notes', label: 'Notes', type: 'text', required: false },
            { key: 'passed', label: 'Passed', type: 'boolean', required: true },
            {
              key: 'level',
              label: 'Level',
              type: 'select',
              required: true,
              options: ['low', 'medium', 'high'],
            },
            {
              key: 'areas',
              label: 'Areas',
              type: 'multiselect',
              required: false,
              options: ['phonetics', 'grammar', 'vocabulary'],
            },
            { key: 'exam_date', label: 'Exam Date', type: 'date', required: false },
            { key: 'rating', label: 'Rating', type: 'scale', required: true, min: 1, max: 5 },
          ],
        },
      ],
    };
    const result = DiagnosticTemplateSchemaSchema.parse(schema);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].fields).toHaveLength(7);
  });

  it('parses empty sections array', () => {
    const result = DiagnosticTemplateSchemaSchema.parse({ sections: [] });
    expect(result.sections).toEqual([]);
  });

  it('rejects invalid field type', () => {
    const schema = {
      sections: [
        {
          title: 'Test',
          fields: [{ key: 'x', label: 'X', type: 'invalid_type', required: true }],
        },
      ],
    };
    expect(() => DiagnosticTemplateSchemaSchema.parse(schema)).toThrow();
  });

  it('rejects missing required field properties', () => {
    const schema = {
      sections: [
        {
          title: 'Test',
          fields: [{ key: 'x', label: 'X' }],
        },
      ],
    };
    expect(() => DiagnosticTemplateSchemaSchema.parse(schema)).toThrow();
  });

  it('accepts fields without optional properties', () => {
    const schema = {
      sections: [
        {
          title: 'Minimal',
          fields: [{ key: 'a', label: 'A', type: 'text', required: false }],
        },
      ],
    };
    const result = DiagnosticTemplateSchemaSchema.parse(schema);
    expect(result.sections[0].fields[0].options).toBeUndefined();
    expect(result.sections[0].fields[0].min).toBeUndefined();
    expect(result.sections[0].fields[0].max).toBeUndefined();
  });
});

describe('DiagnosticTemplateResponseDtoSchema', () => {
  const validTemplate = {
    id: 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
    kindergarten_id: '00000000-0000-0000-0000-000000000001',
    specialist_type: 'speech_therapist',
    name: 'Speech assessment 3-5',
    description: null,
    version: 1,
    is_active: true,
    schema: { sections: [] },
    created_by: 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb',
    created_at: '2026-01-15T08:00:00.000Z',
    updated_at: '2026-03-20T10:30:00.000Z',
  };

  it('parses a valid template response', () => {
    const result = DiagnosticTemplateResponseDtoSchema.parse(validTemplate);
    expect(result.specialist_type).toBe('speech_therapist');
    expect(result.version).toBe(1);
    expect(result.is_active).toBe(true);
  });

  it('handles nullable description', () => {
    const result = DiagnosticTemplateResponseDtoSchema.parse({
      ...validTemplate,
      description: 'A description',
    });
    expect(result.description).toBe('A description');
  });

  it('handles null description', () => {
    const result = DiagnosticTemplateResponseDtoSchema.parse(validTemplate);
    expect(result.description).toBeNull();
  });
});

describe('DiagnosticTemplateListResponseSchema', () => {
  const validTemplate = {
    id: 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
    kindergarten_id: '00000000-0000-0000-0000-000000000001',
    specialist_type: 'psychologist',
    name: 'Psych eval',
    description: null,
    version: 2,
    is_active: true,
    schema: { sections: [] },
    created_by: 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb',
    created_at: '2026-01-15T08:00:00.000Z',
    updated_at: '2026-03-20T10:30:00.000Z',
  };

  it('parses list response with items and null cursor', () => {
    const result = DiagnosticTemplateListResponseSchema.parse({
      items: [validTemplate],
      next_cursor: null,
    });
    expect(result.items).toHaveLength(1);
    expect(result.next_cursor).toBeNull();
  });

  it('parses list response with cursor', () => {
    const result = DiagnosticTemplateListResponseSchema.parse({
      items: [validTemplate],
      next_cursor: 'abc123',
    });
    expect(result.next_cursor).toBe('abc123');
  });

  it('parses empty list', () => {
    const result = DiagnosticTemplateListResponseSchema.parse({
      items: [],
      next_cursor: null,
    });
    expect(result.items).toEqual([]);
  });
});
