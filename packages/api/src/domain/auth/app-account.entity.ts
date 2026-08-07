export interface AppAccountProps {
  authProvider?: string
  authSubject: string
  email?: string | null
  displayName?: string | null
  avatarUrl?: string | null
}

export interface AppAccountData {
  id: string
  authProvider: string
  authSubject: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export class AppAccount {
  private constructor(private readonly data: AppAccountData) {}

  static create(props: AppAccountProps, id?: string): AppAccount {
    return new AppAccount({
      id: id ?? crypto.randomUUID(),
      authProvider: props.authProvider ?? 'supabase',
      authSubject: props.authSubject,
      email: props.email ?? null,
      displayName: props.displayName ?? null,
      avatarUrl: props.avatarUrl ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static restore(data: AppAccountData): AppAccount {
    return new AppAccount(data)
  }

  get id(): string { return this.data.id }
  get authProvider(): string { return this.data.authProvider }
  get authSubject(): string { return this.data.authSubject }
  get email(): string | null { return this.data.email }
  get displayName(): string | null { return this.data.displayName }
  get avatarUrl(): string | null { return this.data.avatarUrl }

  toJSON(): AppAccountData {
    return { ...this.data }
  }
}
