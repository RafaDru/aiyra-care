import { describe, it, expect, vi } from 'vitest'
import { ConecteSUSImportService } from '../src/application/conectesus/conectesus-import.service.js'

describe('ConecteSUSImportService', () => {
  it('imports new vaccines and skips duplicates', async () => {
    const patients = {
      findById: vi.fn().mockResolvedValue({
        cpf: '52998224725',
        cns: null,
        toJSON: () => ({}),
      }),
      update: vi.fn(),
    }
    const vaccines = {
      findAll: vi.fn().mockResolvedValue([
        {
          vaccineName: 'BCG',
          applicationDate: new Date('2020-01-15'),
          toJSON: () => ({}),
        },
      ]),
      create: vi.fn().mockResolvedValue({}),
    }
    const exams = {
      findAll: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
    }

    const svc = new ConecteSUSImportService(
      patients as never,
      vaccines as never,
      exams as never,
    )

    const result = await svc.importForPatient('p1', {
      vaccines: [
        { vaccineName: 'BCG', applicationDate: '2020-01-15', dose: '1' },
        { vaccineName: 'Penta', applicationDate: '2020-03-10', dose: '1' },
      ],
      exams: [],
    })

    expect(result.importedVaccines).toBe(1)
    expect(result.skipped).toBe(1)
    expect(vaccines.create).toHaveBeenCalledOnce()
  })
})
