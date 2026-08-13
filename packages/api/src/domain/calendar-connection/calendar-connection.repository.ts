import type { CalendarConnection } from './calendar-connection.entity.js'

export interface CalendarConnectionRepository {
  findByAccountPatient(accountId: string, patientId: string, provider?: string): Promise<CalendarConnection | null>
  upsert(connection: CalendarConnection): Promise<CalendarConnection>
  update(connection: CalendarConnection): Promise<CalendarConnection>
  deleteByAccountPatient(accountId: string, patientId: string, provider?: string): Promise<void>
}
