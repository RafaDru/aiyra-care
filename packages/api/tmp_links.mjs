import pg from 'pg'
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare' })
const links = await pool.query('SELECT il.id, p.name, il.email, il.portal_type, il.last_sync_at FROM integration_links il JOIN patients p ON p.id=il.patient_id ORDER BY p.name, il.portal_type')
console.log('links', links.rows)
const exams = await pool.query('SELECT p.name, count(*)::int AS n FROM exams e JOIN patients p ON p.id=e.patient_id GROUP BY p.name')
console.log('exam counts', exams.rows)
await pool.end()
