import type { FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import { DocumentController } from './document.controller.js'
import { DocumentService } from '../../../application/document/document.service.js'
import { DocumentPgRepository } from '../../persistence/document.pg.repository.js'
import { GcsFileStorage } from '../../storage/gcs.storage.js'
import { GoogleVisionOcrProvider } from '../../ocr/google-vision.ocr.js'
import { PythonOcrAdapter } from '../../ocr/python-ocr.adapter.js'
import { CompositeOcrProvider } from '../../ocr/composite-ocr.provider.js'
import { pgPool } from '../../../db/postgres.js'

export async function documentRoutes(app: FastifyInstance) {
  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } })

  const ocr = new CompositeOcrProvider(new PythonOcrAdapter(), new GoogleVisionOcrProvider())
  const service = new DocumentService(new DocumentPgRepository(pgPool), new GcsFileStorage(), ocr)
  const controller = new DocumentController(service)
  app.post('/documents', controller.create.bind(controller))
  app.post('/documents/upload', controller.upload.bind(controller))
  app.get('/documents', controller.findAll.bind(controller))
  app.get('/documents/:id', controller.findById.bind(controller))
  app.patch('/documents/:id', controller.update.bind(controller))
  app.delete('/documents/:id', controller.delete.bind(controller))
}
