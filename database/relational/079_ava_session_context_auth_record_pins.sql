-- Extend Ava session pins for mobile/web G1 accelerators (authorization, medical_record).

ALTER TABLE ava_session_context DROP CONSTRAINT IF EXISTS ava_session_context_entity_type_check;

ALTER TABLE ava_session_context ADD CONSTRAINT ava_session_context_entity_type_check
  CHECK (entity_type IN (
    'exam',
    'exam_order',
    'exam_result_item',
    'exam_marker',
    'authorization',
    'medical_record'
  ));
