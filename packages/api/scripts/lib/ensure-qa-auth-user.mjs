const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function findUserByEmail(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(`listUsers: ${error.message}`)
  return data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null
}

/** Cria ou atualiza usuário QA no Supabase com retry (rate limit / corrida no CI). */
export async function ensureQaAuthUser(admin, email, password) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const existing = await findUserByEmail(admin, email)
      if (existing) {
        const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
        })
        if (error) throw new Error(`updateUserById: ${error.message}`)
        return data.user.id
      }
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (error) throw new Error(`createUser: ${error.message || JSON.stringify(error)}`)
      return data.user.id
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`ensureQaAuthUser ${email} — tentativa ${attempt}/4:`, msg)
      if (attempt === 4) throw err
      await sleep(2000 * attempt)
    }
  }
  throw new Error(`ensureQaAuthUser falhou para ${email}`)
}
