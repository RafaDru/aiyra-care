-- Titular do perfil: backfill owner_account_id para cadastros feitos pela UI
-- (POST /patients não gravava owner; só completeProfile gravava).
-- Fonte: membership self, depois grant cujo account_id = granted_by, depois membership mais antiga.

UPDATE patients p
SET owner_account_id = src.account_id
FROM (
  SELECT DISTINCT ON (patient_id) patient_id, account_id
  FROM (
    SELECT g.patient_id, g.account_id, 0 AS rank, g.created_at
    FROM patient_access_grants g
    WHERE g.revoked_at IS NULL AND g.membership_role = 'self'
    UNION ALL
    SELECT g.patient_id, g.account_id, 1 AS rank, g.created_at
    FROM patient_access_grants g
    WHERE g.revoked_at IS NULL AND g.granted_by IS NOT NULL AND g.account_id = g.granted_by
    UNION ALL
    SELECT pm.patient_id, pm.account_id, 2 AS rank, pm.created_at
    FROM patient_memberships pm
  ) candidates
  ORDER BY patient_id, rank, created_at
) src
WHERE p.owner_account_id IS NULL
  AND p.id = src.patient_id;
