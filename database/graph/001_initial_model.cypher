// Open Health - Neo4J Schema

CREATE CONSTRAINT patient_id IF NOT EXISTS FOR (p:Patient) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT doctor_crm IF NOT EXISTS FOR (d:Doctor) REQUIRE d.crm IS UNIQUE;
CREATE CONSTRAINT health_thread_id IF NOT EXISTS FOR (t:HealthThread) REQUIRE t.id IS UNIQUE;
CREATE CONSTRAINT hypothesis_id IF NOT EXISTS FOR (h:Hypothesis) REQUIRE h.id IS UNIQUE;
CREATE INDEX condition_name IF NOT EXISTS FOR (c:Condition) ON (c.name);
CREATE INDEX medication_name IF NOT EXISTS FOR (m:Medication) ON (m.generic_name);
CREATE INDEX health_thread_kind IF NOT EXISTS FOR (t:HealthThread) ON (t.kind);

// === NODE LABELS ===
// Patient, Doctor, Condition, Medication, Allergen, Symptom,
// Diagnosis, Treatment, Appointment, Document, ExamType, Vaccine,
// Clinic, Specialty, HealthThread, Hypothesis, Exam, MedicalRecord,
// Authorization, LinkedEntity

// === RELATIONSHIP PATTERNS ===
// (:Patient)-[:HAS_CONDITION {diagnosed_date, status}]->(:Condition)
// (:Patient)-[:ALLERGIC_TO {severity, reaction}]->(:Allergen)
// (:Patient)-[:TOOK_VACCINE {date, dose}]->(:Vaccine)
// (:Patient)-[:HAS_GROWTH {date, weight, height}]->(:GrowthRecord)
// (:Patient)-[:HAS_THREAD]->(:HealthThread)
// (:HealthThread)-[:HAS_HYPOTHESIS]->(:Hypothesis)
// (:HealthThread)-[:SUPPORTS]->(:Exam|:MedicalRecord)
// (:HealthThread)-[:RULED_OUT]->(:Hypothesis)
// (:Hypothesis)-[:CONFIRMED_AS]->(:Diagnosis|:Allergen)
// (:HealthThread)-[:LINKS {role, label}]->(:Exam|:Diagnosis|...)
// (:Doctor)-[:SPECIALIZES_IN]->(:Specialty)
// (:Doctor)-[:ATTENDED]->(:Appointment {date, reason, notes})
// (:Appointment)-[:FOR]->(:Patient)
// (:Appointment)-[:AT]->(:Clinic)
// (:Patient)-[:PRESCRIBED {dosage, frequency, start, end}]->(:Medication)
// (:Medication)-[:INTERACTS_WITH {severity, description}]->(:Medication)
// (:Symptom)-[:LED_TO]->(:Diagnosis {code, date})
// (:Diagnosis)-[:RESULTED_IN]->(:Treatment {description, start, end})
// (:Document)-[:MENTIONS]->(:Patient|Condition|Medication|Doctor)
// (:Exam)-[:FOR_PATIENT]->(:Patient)
// (:Exam)-[:ORDERED_BY]->(:Doctor)
// (:Exam)-[:INCLUDES]->(:ExamType)

// === QUERY EXAMPLES ===

// Histórico completo de uma criança:
// MATCH (p:Patient {id: $patientId})
// OPTIONAL MATCH (p)-[r:HAS_CONDITION]->(c:Condition)
// OPTIONAL MATCH (p)-[a:ALLERGIC_TO]->(al:Allergen)
// OPTIONAL MATCH (p)-[:PRESCRIBED]->(m:Medication)
// OPTIONAL MATCH (p)-[:TOOK_VACCINE]->(v:Vaccine)
// RETURN p, collect(DISTINCT c) AS conditions, collect(DISTINCT al) AS allergies,
//        collect(DISTINCT m) AS medications, collect(DISTINCT v) AS vaccines

// Interações medicamentosas:
// MATCH (m1:Medication)<-[:PRESCRIBED]-(p:Patient {id: $patientId})
// MATCH (m1)-[interact:INTERACTS_WITH]->(m2:Medication)
// RETURN m1.generic_name, m2.generic_name, interact.severity, interact.description

// Linha do tempo de atendimentos:
// MATCH (p:Patient {id: $patientId})<-[:FOR]-(a:Appointment)<-[:ATTENDED]-(d:Doctor)
// RETURN a.date, a.reason, d.name, a.notes
// ORDER BY a.date DESC
