import type { AuthProviderPort, AuthUser } from '../../domain/auth/auth-provider.port.js'
import type { AppAccountRepository, PatientMembershipRepository } from '../../domain/auth/app-account.repository.js'
import { AppAccount } from '../../domain/auth/app-account.entity.js'
import type { PatientService } from '../patient/patient.service.js'
import type { MeasurementService } from '../measurement/measurement.service.js'
import type { CompleteProfileInput } from '../../infrastructure/http/auth/auth.schema.js'
import { ConflictError } from '../../domain/errors.js'
import type { Patient } from '../../domain/patient/patient.entity.js'

export type SyncAccountResult = {
  account: AppAccount
  isNew: boolean
  needsProfile: boolean
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
    private readonly providerName = 'supabase',
  ) {}

  async verifyToken(accessToken: string): Promise<AuthUser | null> {
    return this.authProvider.verifyAccessToken(accessToken)
  }

  private async needsProfile(accountId: string): Promise<boolean> {
    return !(await this.memberships.hasSelfProfile(accountId))
  }

  async syncAccountFromToken(accessToken: string): Promise<SyncAccountResult | null> {
    const user = await this.verifyToken(accessToken)
    if (!user) return null

    const existing = await this.accounts.findByAuthSubject(this.providerName, user.id)
    if (existing) {
      const updated = AppAccount.restore({
        ...existing.toJSON(),
        email: user.email ?? existing.email,
        displayName: mergeAccountDisplayName(
          existing.displayName,
          user.displayName,
          user.email ?? existing.email,
        ),
        avatarUrl: user.avatarUrl ?? existing.avatarUrl,
        updatedAt: new Date(),
      })
      const saved = await this.accounts.update(updated)
      return {
        account: saved,
        isNew: false,
        needsProfile: await this.needsProfile(saved.id),
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
    }
  }

  async completeProfile(accountId: string, data: CompleteProfileInput): Promise<CompleteProfileResult> {
    if (await this.memberships.hasSelfProfile(accountId)) {
      throw new ConflictError('Perfil já cadastrado para esta conta')
    }

    const patient = await this.patients.create({
      name: data.name,
      birthDate: data.birthDate,
      gender: data.gender,
      bloodType: data.bloodType,
      weightKg: data.weightKg,
      heightCm: data.heightCm,
      cpf: data.cpf,
      cns: data.cns,
    })
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

    return { patient, needsProfile: false }
  }
}
