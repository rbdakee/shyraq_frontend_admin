import { AppError } from '@/api/errors';

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getErrorCode(error: unknown): string {
  if (error instanceof AppError) return error.code;
  return 'unknown_error';
}

export function toI18nKey(error: unknown): string {
  if (error instanceof AppError) return `errors:${error.code}`;
  return 'errors:unknown_error';
}

// WHY this registry exists: backend error codes are stable contract (HANDOFF §2.3).
// New domain codes are added per-batch as modules land (B4–B15). The set drives the
// errors i18n namespace — every listed code must have a key in locales/ru/errors.json
// and locales/kk/errors.json. Codes are grouped by their HANDOFF source section.
export const KNOWN_ERROR_CODES = [
  // infrastructure / auth (§3)
  'unknown_error',
  'validation_error',
  'invalid_refresh',
  'otp_expired_or_missing',
  'invalid_otp',
  'invalid_phone_format',
  'otp_rate_limit',
  'otp_locked',
  'no_active_roles',
  'pending_role_select',
  'role_not_available',
  'role_select_not_required',
  'not_invited',
  'no_role_for_app',
  // children §5
  'child_not_found',
  'archived_child_not_transferable',
  'child_already_archived',
  'child_not_archived',
  'child_activation_requires_tariff',
  'invalid_child_status_transition',
  'child_already_in_group',
  'archive_reason_required',
  'guardian_not_found',
  'invalid_guardian_status_transition',
  'max_approval_rights_exceeded',
  // enrollments §6
  'enrollment_not_found',
  'enrollment_invalid_transition',
  'enrollment_already_converted',
  'enrollment_locked',
  'enrollment_missing_card_fields',
  // groups §7
  'group_not_found',
  'group_has_active_children',
  'invalid_age_range',
  // staff §8
  'staff_not_found',
  'staff_phone_conflict',
  'staff_inactive',
  'invalid_specialist_type',
  'role_not_assignable',
  'mentor_one_active_group_violation',
  'group_primary_conflict',
  // specialist-types dictionary (N12)
  'specialist_type_unknown',
  'specialist_type_not_found',
  'specialist_type_code_taken',
  'specialist_type_name_required',
  'specialist_type_system_immutable',
  'specialist_type_in_use',
  // locations/cameras §9
  'location_not_found',
  'location_in_use',
  'camera_not_found',
  // schedule §10
  'schedule_template_not_found',
  'slot_not_found',
  'slot_time_conflict',
  'source_week_snapshot_not_found',
  'invalid_date_range',
  // meal plans §11
  'meal_plan_not_found',
  'meal_plan_already_exists',
  'meal_item_not_found',
  'invalid_meal_type',
  // content §12
  'file_required',
  'file_upload_error',
  'file_too_large',
  'media_type_invalid',
  'content_post_not_found',
  'content_post_status_invalid',
  'content_target_invalid',
  'content_already_published',
  'content_cannot_delete_published',
  'content_scheduled_for_in_past',
  // invoices/payments §13
  'invoice_not_found',
  'invoice_already_paid',
  'invoice_status_invalid',
  // tariffs §14
  'tariff_plan_not_found',
  'tariff_assignment_not_found',
  'tariff_plan_inactive',
  'tariff_assignment_overlap',
  'tariff_plan_overlap',
  // holidays §15
  'holiday_already_exists',
  'holiday_not_found',
  // kindergarten settings §25
  'fiscal_settings_forbidden',
  'kindergarten_not_found',
  // kindergarten logo (N11)
  'logo_required',
  'logo_type_invalid',
  'logo_too_large',
  // refunds §16
  'refund_not_found',
  'payment_not_found',
  'refund_already_processed',
  'refund_status_invalid',
  'kaspi_refund_requires_history_ack',
  // kaspi onboarding §25a
  'kaspi_already_connected',
  'kaspi_app_version_outdated',
  'kaspi_unknown_process',
  'kaspi_otp_invalid',
  'kaspi_invalid_phone',
  'kaspi_finish_failed',
  // custom discounts §18
  'custom_discount_not_found',
  'custom_discount_status_invalid',
  // parent requests §19
  'parent_request_not_found',
  'parent_request_already_processed',
  'parent_request_cursor_invalid',
  'parent_request_forbidden',
  // attendance §20
  'attendance_event_not_found',
  'no_active_session_for_device',
  'qr_token_not_found',
  'qr_token_expired',
  'qr_token_revoked',
  'qr_rate_limit_exceeded',
  'pickup_user_not_allowed',
  'staff_member_not_found',
  // diagnostic templates §21
  'diagnostic_template_not_found',
  'template_has_entries',
  // lifecycle DLQ §24
  'lifecycle_job_not_found',
  'lifecycle_job_not_in_failed_state',
  'forbidden',
  // qr/security §23
  'user_not_found',
  'user_no_relationship_to_kindergarten',
] as const;
