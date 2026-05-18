export type EnrollmentStatus =
  | 'new'
  | 'in_processing'
  | 'waitlist'
  | 'card_created'
  | 'cancelled'
  | 'archive';

export const ALLOWED_TRANSITIONS: Readonly<Record<EnrollmentStatus, readonly EnrollmentStatus[]>> =
  {
    new: ['in_processing'],
    in_processing: ['waitlist', 'card_created', 'cancelled'],
    waitlist: ['in_processing'],
    card_created: ['archive'],
    cancelled: ['archive'],
    archive: [],
  };

export const ALL_TRANSITION_TARGETS: readonly EnrollmentStatus[] = [
  'in_processing',
  'waitlist',
  'card_created',
  'cancelled',
  'archive',
];

export const TRANSITION_ACTION_KEYS: Readonly<Record<string, string>> = {
  in_processing: 'detail.actions.to_in_processing',
  waitlist: 'detail.actions.to_waitlist',
  cancelled: 'detail.actions.to_cancelled',
  archive: 'detail.actions.to_archive',
};
