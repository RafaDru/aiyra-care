-- Lembrete periódico de reimport ConecteSUS (6–12 meses)

ALTER TABLE care_reminders DROP CONSTRAINT IF EXISTS care_reminders_reminder_kind_check;
ALTER TABLE care_reminders ADD CONSTRAINT care_reminders_reminder_kind_check
  CHECK (reminder_kind IN ('measurement', 'medication', 'sus_reimport'));
