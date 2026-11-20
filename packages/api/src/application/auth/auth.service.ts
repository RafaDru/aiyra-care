import type { AuthProviderPort, AuthUser } from '../../domain/auth/auth-provider.port.js'
import type { AppAccountRepository, PatientMembershipRepository } from '../../domain/auth/app-account.repository.js'
import type { CareCircleRepository } from '../../domain/care-circle/care-circle.repository.js'
import { AppAccount } from '../../domain/auth/app-account.entity.js'
import type { PatientService } from '../patient/patient.service.js'
import type { MeasurementService } from '../measurement/measurement.service.js'
import type { CompleteProfileInput } from '../../infrastructure/http/auth/auth.schema.js'
import type { AccountProfileRepository } from '../../domain/account-profile/account-profile.repository.js'
import { ConflictError } from '../../domain/errors.js'
import type { Patient } from '../../domain/patient/patient.entity.js'
import { isValidSelfProfileCpf } from '../../domain/patient/self-profile-cpf.js'

export type SyncAccountResult = {
  account: AppAccount
  isNew: boolean
  needsProfile: boolean
  /** Perfil titular OK, mas falta círculo ou paciente acessível (onboarding Anel A). */
  needsOnboardingSetup: boolean
}

export type CompleteProfileResult = {
  patient: Patient
  needsProfile: false
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** Não deixa o fallback de e-mail do IdP sobrescrever nome definido no onboarding. */
function mergeAccountDisplayName(
  existing: string | null,
  fromProvider: string | null | undefined,
  email: string | null | undefined,
): string | null {
  const provider = fromProvider?.trim() || null
  const kept = existing?.trim() || null
  const emailNorm = email?.trim() || null
  const providerUsable =
    Boolean(provider) && provider !== emailNorm && !looksLikeEmail(provider ?? '')
  if (providerUsable) return provider
  if (kept && kept !== emailNorm && !looksLikeEmail(kept)) return kept
  return kept ?? provider
}

export class AuthService {
  constructor(
    private readonly authProvider: AuthProviderPort,
    private readonly accounts: AppAccountRepository,
    private readonly memberships: PatientMembershipRepository,
    private readonly patients: PatientService,
    private readonly measurements?: MeasurementService,
    private readonly accountProfiles?: AccountProfileRepository,
    private readonly careCircles?: CareCircleRepository,
    private readonly providerName = 'supabase',
  ) {}

  async verifyToken(accessToken: string): Promise<AuthUser | null> {
    return this.authProvider.verifyAccessToken(accessToken)
  }

  private async needsProfile(accountId: string): Promise<boolean> {
    const selfPatientId = await this.memberships.findSelfPatientId(accountId)
    if (!selfPatientId) return true
    const patient = await this.patients.findById(selfPatientId)
    return !isValidSelfProfileCpf(patient.cpf)
  }

  /** Gate MVP: titular completo + ≥1 care_circle + ≥1 paciente na conta. */
  async needsOnboardingSetup(accountId: string): Promise<boolean> {
    if (await this.needsProfile(accountId)) return false
    if (!this.careCircles) return false
    const circles = await this.careCircles.listForAccount(accountId)
    if (circles.length === 0) return true
    const patientIds = await this.memberships.listAccessiblePatientIds(accountId)
    return patientIds.length === 0
  }

  private async syncFlags(accountId: string) {
    const needsProfile = await this.needsProfile(accountId)
    const needsOnboardingSetup = needsProfile ? false : await this.needsOnboardingSetup(accountId)
    return { needsProfile, needsOnboardingSetup }
  }

  /** Escolhe a conta canônica quando o e-mail aparece em mais de um auth_subject (ex.: Google após cadastro por convite). */
  private async pickCanonicalAccountId(candidates: readonly { id: string }[]): Promise<string> {
    let bestId = candidates[0]!.id
    let bestScore = -1
    for (const candidate of candidates) {
      const selfId = await this.memberships.findSelfPatientId(candidate.id)
      let score = 0
      if (selfId) {
        const patient = await this.patients.findById(selfId)
        score = isValidSelfProfileCpf(patient.cpf) ? 2 : 1
      }
      if (score > bestScore) {
        bestScore = score
        bestId = candidate.id
      }
    }
    return bestId
  }

  private async mergeProviderMetadata(
    account: AppAccount,
    user: AuthUser,
  ): Promise<AppAccount> {
    const updated = AppAccount.restore({
      ...account.toJSON(),
      email: user.email ?? account.email,
      displayName: mergeAccountDisplayName(
        account.displayName,
        user.displayName,
        user.email ?? account.email,
      ),
      avatarUrl: user.avatarUrl ?? account.avatarUrl,
      updatedAt: new Date(),
    })
    return this.accounts.update(updated)
  }

  async syncAccountFromToken(accessToken: string): Promise<SyncAccountResult | null> {
    const user = await this.verifyToken(accessToken)
    if (!user) return null

    const emailNorm = user.email?.trim().toLowerCase() ?? null

    const existing = await this.accounts.findByAuthSubject(this.providerName, user.id)
    if (existing) {
      if (emailNorm) {
        const sameEmail = await this.accounts.listByEmail(this.providerName, emailNorm)
        const others = sameEmail.filter((a) => a.id !== existing.id)
        if (others.length > 0) {
          const canonicalId = await this.pickCanonicalAccountId([existing, ...others])
          if (canonicalId !== existing.id) {
            await this.accounts.retireAuthSubject(existing.id)
            const relinked = await this.accounts.relinkAuthSubject(
              canonicalId,
              this.providerName,
              user.id,
            )
            const saved = await this.mergeProviderMetadata(relinked, user)
            const flags = await this.syncFlags(saved.id)
            return { account: saved, isNew: false, ...flags }
          }
        }
      }
      const saved = await this.mergeProviderMetadata(existing, user)
      const flags = await this.syncFlags(saved.id)
      return {
        account: saved,
        isNew: false,
        ...flags,
      }
    }

    if (emailNorm) {
      const sameEmail = await this.accounts.listByEmail(this.providerName, emailNorm)
      if (sameEmail.length > 0) {
        const canonicalId = await this.pickCanonicalAccountId(sameEmail)
        const relinked = await this.accounts.relinkAuthSubject(
          canonicalId,
          this.providerName,
          user.id,
        )
        const saved = await this.mergeProviderMetadata(relinked, user)
        const flags = await this.syncFlags(saved.id)
        return { account: saved, isNew: false, ...flags }
      }
    }

    const created = await this.accounts.save(
      AppAccount.create({
        authProvider: this.providerName,
        authSubject: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      }),
    )
    return {
      account: created,
      isNew: true,
      needsProfile: true,
      needsOnboardingSetup: false,
    }
  }

  async completeProfile(accountId: string, data: CompleteProfileInput): Promise<CompleteProfileResult> {
    const existingSelfId = await this.memberships.findSelfPatientId(accountId)
    if (existingSelfId) {
      const existing = await this.patients.findById(existingSelfId)
      if (isValidSelfProfileCpf(existing.cpf)) {
        throw new ConflictError('Perfil já cadastrado para esta conta')
      }
    }

    const patientCore = {
      name: data.name,
      socialName: data.socialName?.trim() || null,
      birthDate: data.birthDate,
      gender: data.gender,
      bloodType: data.bloodType,
      weightKg: data.weightKg,
      heightCm: data.heightCm,
      cpf: data.cpf,
      cns: data.cns,
    }
    const patient = existingSelfId
      ? await this.patients.update(existingSelfId, patientCore)
      : await this.patients.create(patientCore)
    await this.patients.setOwnerAccountId(patient.id, accountId)
    await this.memberships.ensureMembership(accountId, patient.id, 'self')

    const account = await this.accounts.findById(accountId)
    if (account) {
      const withName = AppAccount.restore({
        ...account.toJSON(),
        displayName: data.name.trim(),
        updatedAt: new Date(),
      })
      await this.accounts.update(withName)
    }

    if (this.measurements && (data.weightKg != null || data.heightCm != null)) {
      await this.measurements.seedInitialAnthropometry(patient.id, {
        weightKg: data.weightKg,
        heightCm: data.heightCm,
      })
    }

    if (this.accountProfiles && (data.phone || data.address)) {
      const whatsapp = data.phoneIsWhatsapp && data.phone ? data.phone : undefined
      await this.accountProfiles.upsert(accountId, {
        fullName: data.name.trim(),
        phone: data.phone ?? null,
        phoneSecondary: data.phoneSecondary ?? null,
        whatsapp: whatsapp ?? null,
        cpf: data.cpf,
        birthDate: data.birthDate,
        gender: data.gender,
        city: data.address?.city ?? null,
        state: data.address?.state ?? null,
        postalCode: data.address?.postalCode ?? null,
        street: data.address?.street ?? null,
        streetNumber: data.address?.number ?? null,
        addressComplement: data.address?.complement ?? null,
        district: data.address?.district ?? null,
        preferredContact: data.phoneIsWhatsapp ? 'whatsapp' : data.phone ? 'phone' : null,
      })
    }

    return { patient, needsProfile: false }
  }
}
