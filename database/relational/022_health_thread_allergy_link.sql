-- Permitir vínculo de alergia confirmada a partir de hipótese

ALTER TABLE health_thread_links DROP CONSTRAINT IF EXISTS health_thread_links_entity_type_check;

ALTER TABLE health_thread_links ADD CONSTRAINT health_thread_links_entity_type_check
  CHECK (entity_type IN (
    'exam', 'medical_record', 'authorization', 'diagnosis', 'document', 'appointment', 'allergy'
  ));
