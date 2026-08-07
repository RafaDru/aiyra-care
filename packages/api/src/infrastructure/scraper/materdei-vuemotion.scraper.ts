import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import type { APIRequestContext } from 'playwright'
import { MATER_DEI_PROXY } from './materdei-sync.scraper.js'

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const VUE_MOTION_DOMAIN = `${MATER_DEI_PROXY.surgical}/surgical/domain`
const MIN_IMAGE_BYTES = 12_000
const DIRECT_FETCH_CONCURRENCY = 4

export interface VueMotionScrapedImage {
  buffer: Buffer
  mimeType: string
  filename: string
  groupId?: string
  imageUid?: string
  imageIndex?: string
  byteLength: number
}

export interface VueMotionSeriesResult {
  viewerUrl: string
  images: VueMotionScrapedImage[]
  groups: Array<{ groupId: number; name: string; estimatedCount?: number }>
  warnings: string[]
}

interface ParsedImageId {
  groupId: number
  gdaId: number
  imageUid: string
  imageIndex: number
  orientationId: number
}

/** URL do visualizador VueMotion (Carestream) para exame de imagem. */
export async function fetchMaterDeiVueMotionViewerUrl(
  request: APIRequestContext,
  accessToken: string,
  accessionRef: string | number,
): Promise<string | null> {
  const res = await request.get(VUE_MOTION_DOMAIN, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    params: { accession_number: String(accessionRef) },
  })
  if (!res.ok()) return null
  const json = await res.json() as { url?: string }
  return json.url?.startsWith('http') ? json.url : null
}

function parseImageIdentifier(url: string): { groupId?: string; gdaId?: string; imageUid?: string; imageIndex?: string } {
  try {
    const q = new URL(url).searchParams.get('ImageIdentifier')
    if (!q) return {}
    const parts = q.split('|')
    return {
      groupId: parts[0],
      gdaId: parts[1],
      imageUid: parts[2],
      imageIndex: parts[3],
    }
  } catch {
    return {}
  }
}

function formatImageIdentifier(id: ParsedImageId): string {
  return `${id.groupId}|${id.gdaId}|${id.imageUid}|${id.imageIndex}|false|${id.orientationId}`
}

function parseGroupCounts(groups: Array<{ GroupID?: number; GroupName?: string }>): VueMotionSeriesResult['groups'] {
  return groups.map((g) => {
    const name = g.GroupName ?? ''
    const m = name.match(/#(\d+)\s*$/)
    return {
      groupId: g.GroupID ?? -1,
      name,
      estimatedCount: m ? Number(m[1]) : undefined,
    }
  })
}

function extractImageIdentifiers(json: unknown): ParsedImageId[] {
  const results: ParsedImageId[] = []
  const seen = new Set<string>()

  function walk(obj: unknown, groupId?: number) {
    if (!obj || typeof obj !== 'object') return
    if (Array.isArray(obj)) {
      for (const item of obj) walk(item, groupId)
      return
    }
    const record = obj as Record<string, unknown>
    if (typeof record.group_ID === 'number') groupId = record.group_ID
    if (record.ImageIdentifier && typeof record.ImageIdentifier === 'object') {
      const id = record.ImageIdentifier as Record<string, unknown>
      const imageUid = id.ImageUID != null ? String(id.ImageUID) : ''
      if (groupId != null && imageUid) {
        const parsed: ParsedImageId = {
          groupId,
          gdaId: Number(id.GDAID ?? 101),
          imageUid,
          imageIndex: Number(id.ImageIndex ?? 0),
          orientationId: Number(id.OrientationID ?? 1),
        }
        const key = `${parsed.groupId}:${parsed.imageUid}:${parsed.imageIndex}`
        if (!seen.has(key)) {
          seen.add(key)
          results.push(parsed)
        }
      }
    }
    for (const v of Object.values(record)) walk(v, groupId)
  }

  walk(json)
  return results
}

function pickTargetGroupIds(groups: VueMotionSeriesResult['groups']): number[] {
  const sliceGroups = groups.filter((g) => {
    if (!g.estimatedCount || g.estimatedCount < 8) return false
    if (/SCOUT|Tudo em um/i.test(g.name)) return false
    return true
  })
  const preferred = sliceGroups.filter((g) => /TORAX|SEIOS/i.test(g.name))
  if (preferred.length > 0) return preferred.map((g) => g.groupId)
  return sliceGroups
    .sort((a, b) => (b.estimatedCount ?? 0) - (a.estimatedCount ?? 0))
    .slice(0, 2)
    .map((g) => g.groupId)
}

function extractSvRenderBase(url: string): string | null {
  const m = url.match(/(https?:\/\/[^/]+\/vuemotion\/portal\/SVRender\/[a-f0-9-]+)/i)
  return m?.[1] ?? null
}

function storeImage(
  images: Map<string, VueMotionScrapedImage>,
  buffer: Buffer,
  ct: string,
  id: { groupId?: string; imageUid?: string; imageIndex?: string },
): void {
  if (buffer.length < MIN_IMAGE_BYTES) return
  if (ct.includes('json')) return
  const key = `${id.groupId ?? 'g'}:${id.imageUid ?? buffer.length}`
  if (images.has(key)) return
  const ext = ct.includes('png') ? 'png' : 'jpg'
  images.set(key, {
    buffer,
    mimeType: ct.split(';')[0]?.trim() || 'image/jpeg',
    filename: `slice-${id.groupId ?? '0'}-${id.imageUid ?? images.size}.${ext}`,
    groupId: id.groupId,
    imageUid: id.imageUid,
    imageIndex: id.imageIndex,
    byteLength: buffer.length,
  })
}

function buildGetImageUrl(templateUrl: string, id: ParsedImageId, requestId: number): string {
  const url = new URL(templateUrl)
  url.searchParams.set('ImageIdentifier', formatImageIdentifier(id))
  url.searchParams.set('Dummy', String(Date.now() + requestId))
  url.searchParams.set('RequestID', String(requestId))
  return url.toString()
}

async function waitForGroupTemplate(
  page: Page,
  state: CollectState,
  groupId: number,
  timeoutMs = 20_000,
): Promise<string | null> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const tpl = state.getImageTemplate
    if (tpl) {
      const id = parseImageIdentifier(tpl)
      if (id.groupId === String(groupId)) return tpl
    }
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(350)
  }
  const tpl = state.getImageTemplate
  if (tpl && parseImageIdentifier(tpl).groupId === String(groupId)) return tpl
  return null
}

async function focusViewerViewport(page: Page): Promise<void> {
  try {
    await page.mouse.click(720, 420)
    await page.waitForTimeout(400)
  } catch { /* ignore */ }
}

async function selectSeriesGroup(page: Page, group: { name: string }): Promise<boolean> {
  const hash = group.name.match(/#(\d+)/)?.[1]
  const candidates = [
    group.name.trim(),
    group.name.replace(/^\d+\s*:\s*/, '').trim(),
    group.name.replace(/^\d+\s*:\s*\d+\s*:\s*/, '').replace(/\s*#\d+\s*$/, '').trim(),
    hash ? `#${hash}` : '',
  ].filter((c) => c.length > 2)

  for (const label of candidates) {
    try {
      const pattern = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      const el = page.locator('div, span, td, li, a').filter({ hasText: pattern }).first()
      await el.click({ timeout: 6000 })
      await page.waitForTimeout(2500)
      return true
    } catch { /* tenta próximo label */ }
  }
  return false
}

async function fetchImagesDirect(
  context: BrowserContext,
  page: Page,
  templateUrl: string | null,
  identifiers: ParsedImageId[],
  images: Map<string, VueMotionScrapedImage>,
): Promise<string | null> {
  let template = templateUrl
  let requestCounter = 0
  for (let i = 0; i < identifiers.length; i += DIRECT_FETCH_CONCURRENCY) {
    const batch = identifiers.slice(i, i + DIRECT_FETCH_CONCURRENCY)
    await Promise.all(batch.map(async (id) => {
      const key = `${id.groupId}:${id.imageUid}:${id.imageIndex}`
      if (images.has(`${id.groupId}:${id.imageUid}`)) return
      if (!template) return
      requestCounter += 1
      const url = buildGetImageUrl(template, id, requestCounter)
      try {
        const result = await page.evaluate(async (fetchUrl) => {
          const r = await fetch(fetchUrl)
          const buf = await r.arrayBuffer()
          return {
            ok: r.ok,
            ct: r.headers.get('content-type') ?? '',
            len: buf.byteLength,
            bytes: r.ok && buf.byteLength > 0 ? Array.from(new Uint8Array(buf)) : [],
          }
        }, url)
        if (!result.ok || result.len < MIN_IMAGE_BYTES || result.ct.includes('json')) return
        const buffer = Buffer.from(result.bytes)
        storeImage(images, buffer, result.ct, {
          groupId: String(id.groupId),
          imageUid: id.imageUid,
          imageIndex: String(id.imageIndex),
        })
      } catch { /* ignore */ }
    }))
  }
  return template
}

interface CollectState {
  images: Map<string, VueMotionScrapedImage>
  groups: VueMotionSeriesResult['groups']
  svRenderBase: string | null
  getImageTemplate: string | null
  handlePayloads: unknown[]
}

function beginCollectFromPage(page: Page): CollectState {
  const state: CollectState = {
    images: new Map(),
    groups: [],
    svRenderBase: null,
    getImageTemplate: null,
    handlePayloads: [],
  }

  page.on('response', async (res) => {
    const url = res.url()
    if (url.includes('JsonEndpoint/GetImage') && res.status() === 200) {
      if (url.includes('RenderingParams')) state.getImageTemplate = url
      try {
        const buffer = Buffer.from(await res.body())
        const ct = res.headers()['content-type'] ?? 'image/jpeg'
        const id = parseImageIdentifier(url)
        storeImage(state.images, buffer, ct, id)
      } catch { /* ignore */ }
    }
    if (!state.svRenderBase) {
      const base = extractSvRenderBase(url)
      if (base) state.svRenderBase = base
    }
    if (url.includes('JsonEndpoint/HandleRequest') && res.status() === 200) {
      try {
        const json = await res.json()
        state.handlePayloads.push(json)
        const typed = json as { __type?: string; GroupInfoList?: Array<{ GroupID?: number; GroupName?: string }> }
        if (typed.__type === 'GroupListResult' && Array.isArray(typed.GroupInfoList)) {
          state.groups = parseGroupCounts(typed.GroupInfoList)
        }
      } catch { /* ignore */ }
    }
  })

  return state
}

async function finishCollectFromPage(
  page: Page,
  context: BrowserContext,
  state: CollectState,
  maxScrollSteps: number,
): Promise<{
  images: Map<string, VueMotionScrapedImage>
  groups: VueMotionSeriesResult['groups']
  svRenderBase: string | null
  handlePayloads: unknown[]
  getImageTemplate: string | null
}> {
  const { images, groups, handlePayloads } = state
  let { svRenderBase, getImageTemplate } = state

  try {
    await page.waitForResponse(
      (r) => r.url().includes('JsonEndpoint/HandleRequest') && r.status() === 200,
      { timeout: 90_000 },
    )
  } catch { /* continua */ }

  await page.waitForTimeout(3000)

  const allIds = handlePayloads.flatMap((p) => extractImageIdentifiers(p))
  const targetGroups = groups.filter((g) => pickTargetGroupIds(groups).includes(g.groupId))

  for (const group of targetGroups) {
    state.getImageTemplate = null
    await selectSeriesGroup(page, group)
    await focusViewerViewport(page)
    const groupTemplate = await waitForGroupTemplate(page, state, group.groupId)

    const groupIds = allIds.filter((id) => id.groupId === group.groupId)
    if (groupIds.length > 0 && groupTemplate) {
      await fetchImagesDirect(context, page, groupTemplate, groupIds, images)
    }

    const expected = group.estimatedCount ?? 0
    const groupImageCount = [...images.values()].filter((img) => img.groupId === String(group.groupId)).length
    if (expected > 0 && groupImageCount < expected * 0.6) {
      for (let i = 0; i < expected + 15; i++) {
        await page.keyboard.press('ArrowDown')
        await page.waitForTimeout(280)
      }
      await page.waitForTimeout(2000)
    }
  }

  if (images.size < 10) {
    for (let i = 0; i < Math.min(maxScrollSteps, 80); i++) {
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(250)
    }
    await page.waitForTimeout(2000)
  }

  return { images, groups, svRenderBase, handlePayloads, getImageTemplate: state.getImageTemplate ?? getImageTemplate }
}

/**
 * Abre VueMotion no Chrome e coleta JPEGs via GetImage (série de cortes TC/RX).
 */
export async function scrapeMaterDeiVueMotionSeries(
  viewerUrl: string,
  opts?: { maxScrollSteps?: number; headless?: boolean },
): Promise<VueMotionSeriesResult> {
  const warnings: string[] = []
  const maxScrollSteps = opts?.maxScrollSteps ?? 200
  let browser: Browser | null = null

  try {
    browser = await chromium.launch({
      headless: opts?.headless ?? true,
      channel: 'chrome',
      args: ['--disable-blink-features=AutomationControlled'],
    })
    const context = await browser.newContext({ userAgent: CHROME_UA, viewport: { width: 1400, height: 900 } })
    const page = await context.newPage()

    const collectState = beginCollectFromPage(page)
    await page.goto(viewerUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    await page.waitForTimeout(12_000)

    const { images, groups, svRenderBase, handlePayloads, getImageTemplate } = await finishCollectFromPage(
      page,
      context,
      collectState,
      maxScrollSteps,
    )

    if (!svRenderBase) warnings.push('SVRender base URL não detectada')
    if (!getImageTemplate) warnings.push('Template GetImage não capturado — usando apenas interceptação')
    if (handlePayloads.length === 0) warnings.push('HandleRequest não capturado — sessão VueMotion incompleta')

    const allIds = handlePayloads.flatMap((p) => extractImageIdentifiers(p))
    const targetGroupIds = pickTargetGroupIds(groups)
    if (allIds.length === 0) warnings.push('Nenhum ImageIdentifier nos payloads VueMotion')
    else if (targetGroupIds.length > 0) {
      const fetched = allIds.filter((id) => targetGroupIds.includes(id.groupId)).length
      warnings.push(`Série alvo: ${targetGroupIds.join(',')} (${fetched} cortes identificados, ${images.size} baixados)`)
    }

    if (images.size === 0) {
      warnings.push('VueMotion não retornou imagens (GetImage)')
    }

    await context.close()
    return {
      viewerUrl,
      images: [...images.values()],
      groups,
      warnings,
    }
  } catch (err) {
    warnings.push(err instanceof Error ? err.message : String(err))
    return { viewerUrl, images: [], groups: [], warnings }
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}

export async function scrapeMaterDeiVueMotionForExam(
  request: APIRequestContext,
  accessToken: string,
  examOrderItemId: string | number,
  opts?: { maxScrollSteps?: number },
): Promise<VueMotionSeriesResult> {
  const viewerUrl = await fetchMaterDeiVueMotionViewerUrl(request, accessToken, examOrderItemId)
  if (!viewerUrl) {
    return {
      viewerUrl: '',
      images: [],
      groups: [],
      warnings: ['URL do VueMotion não disponível (surgical/domain)'],
    }
  }
  return scrapeMaterDeiVueMotionSeries(viewerUrl, opts)
}
