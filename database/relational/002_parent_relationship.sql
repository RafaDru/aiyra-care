ALTER TABLE patients ADD COLUMN parent_ids UUID[] DEFAULT '{}';
CREATE INDEX idx_patients_parents ON patients USING GIN(parent_ids);

ALTER TABLE patients ADD COLUMN cpf VARCHAR(11) UNIQUE;
ALTER TABLE patients ADD COLUMN cns VARCHAR(15);
CREATE INDEX idx_patients_cpf ON patients(cpf);
