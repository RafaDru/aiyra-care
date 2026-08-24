-- Backfill do lastro documental: vincula marcadores órfãos ao documento do exame
UPDATE exam_result_items eri
SET source_document_id = sub.doc_id
FROM (
  SELECT eri2.id AS item_id,
    (regexp_match(e.notes::text, '"documentId":"([0-9a-f-]{36})"'))[1]::uuid AS doc_id
  FROM exam_result_items eri2
  JOIN exams e ON e.id = eri2.exam_id
  WHERE eri2.source_document_id IS NULL
    AND e.notes IS NOT NULL
) AS sub
WHERE eri.id = sub.item_id AND sub.doc_id IS NOT NULL;
