#!/usr/bin/env node
/**
 * Phase 1 rebrand slices 4–5 — docs only.
 * Platform: Ananeri · Agent UI: Neri · Keep @aiyra-care / aiyra-care repo ids.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

/** @param {string} rel */
function shouldSkip(rel) {
  if (rel.includes('node_modules')) return true
  if (rel.startsWith('docs/brand/')) return true
  if (rel === 'docs/HISTORICO.md') return true
  if (rel === 'docs/roadmap.json') return false
  if (rel === 'docs/ROADMAP.md') return true
  if (/docs\/testing\/suites\/ava-/.test(rel)) return true
  if (/docs\/testing\/suites\/mobile-ava-/.test(rel)) return true
  if (/automations-aiyra/.test(rel)) return false
  if (rel === 'docs/AIYRACARE_DESIGN.md') return true
  if (rel === 'docs/LOGO_BRIEF.md') return true
  return false
}

const GLOBS = [
  'docs/help',
  'docs/features',
  'docs/legal',
  'docs/product',
  'docs/ops',
  'docs/discovery',
  'AGENTS.md',
  'docs/README.md',
  'docs/PROJETO.md',
  'docs/project-context.json',
  'docs/product-terminology.md',
  'docs/LEGAL_COMPLIANCE.md',
  'docs/OPS_SOLO_OPERATOR_CHARTER.md',
  'docs/CURSOR_AGENT_OPS.md',
  'docs/CURSOR_WORKSPACE.md',
  'docs/CURSOR_WORK_MODEL.md',
  'docs/DOCUMENTATION_SYSTEM.md',
  'docs/ECOSYSTEM.md',
  'docs/AGENTS_APOIO.md',
  'docs/AVA_VISION.md',
  'docs/AVA_OPERATIONAL.md',
  'docs/AVA_PATIENT_LENS.md',
  'docs/AVA_EXPRESSIONS.md',
  'docs/MOBILE_WEB_DUAL_DELIVERY.md',
  'docs/MOBILE_EVOLUTION_BLOCKS.md',
  'docs/LLM_USAGE.md',
  'docs/FOCO_ATUAL.md',
  'docs/regulatory-adherence-plan.md',
  'docs/product/REBRAND_STATUS.md',
  'docs/testing/suites/auth-entry-flow.md',
  'docs/testing/suites/onboarding-flow.md',
  'docs/testing/suites/mobile-shell-smoke.md',
  'docs/ACCOUNT_AND_PLAN.md',
  'docs/EXAM_OCR.md',
  'docs/FAMILY_ACCESS_MODEL.md',
  'docs/FEATURE_REVIEW_FRAMEWORK.md',
  'docs/FLEURY_PRECISION_CARE.md',
  'docs/CURSOR_RTK.md',
  'docs/OBSERVABILITY.md',
  'docs/OPERATION_MODEL.md',
  'docs/ROADMAP.md',
  'docs/SUPABASE.md',
  'docs/testing/QA_PROCESS.md',
  'docs/ops-agentic-operating-model.md',
  'docs/infra/OPS_ALERT_CHANNELS.md',
  'docs/legal/AIYRACARE_DOSSIE_JURIDICO.md',
  'docs/automations-aiyra-correcao-dev-instructions.md',
  'docs/automations-aiyra-infra-env-regularization-instructions.md',
  'docs/automations-aiyra-revisor-dev-instructions.md',
  'docs/automations-aiyra-triador-dev-instructions.md',
  'docs/automations-aiyra-triador-sre-instructions.md',
  'docs/roadmap.json',
]

/** @param {string} dir */
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (/\.(md|json|html)$/.test(name)) out.push(full)
  }
  return out
}

/** @param {string} line */
function lineKeepsAiyraCare(line) {
  return (
    /@aiyra-care/i.test(line) ||
    /aiyra-care/i.test(line) ||
    /AIYRACARE_DOSSIE/i.test(line) ||
    /npm scope/i.test(line) ||
    /Phase 3A defer/i.test(line) ||
    /sem rename/i.test(line) ||
    /monorepo `aiyra-care`/i.test(line)
  )
}

/** @param {string} text */
function transform(text) {
  const lines = text.split('\n')
  const out = lines.map((line) => {
    if (line.includes('Grep audit:')) return line
    let l = line
    if (!lineKeepsAiyraCare(l)) {
      l = l.replace(/\bAiyra Care\b/g, 'Ananeri')
      if (!lineKeepsAiyraCare(l)) {
        l = l.replace(/\bAiyraCare\b/g, 'Ananeri')
      }
    }
    l = l.replace(/\bassistente Ava\b/gi, 'agente Neri')
    l = l.replace(/\bAssistente Ava\b/g, 'Agente Neri')
    l = l.replace(/\bbase de conhecimento da Ava\b/gi, 'base de conhecimento da Neri')
    l = l.replace(/\bRAG Ava\b/g, 'RAG Neri')
    l = l.replace(/\borb Ava\b/gi, 'orb Neri')
    l = l.replace(/\bFAB Ava\b/g, 'FAB Neri')
    l = l.replace(/\b«Ava»\b/g, '«Neri»')
    l = l.replace(/\bresumo Ava\b/gi, 'resumo Neri')
    l = l.replace(/\betapa Ava\b/gi, 'etapa Neri')
    l = l.replace(/\bPasso Ava\b/g, 'Passo Neri')
    l = l.replace(/\bAva-first\b/g, 'Neri-first')
    l = l.replace(/\bPergunte à Ava\b/g, 'Pergunte à Neri')
    l = l.replace(/\bPergunte a Ava\b/g, 'Pergunte à Neri')
    l = l.replace(/\bmensagens Ava\b/g, 'mensagens Neri')
    l = l.replace(/\bAgente Virtual Aiyra\b/g, 'Agente Neri')
    l = l.replace(/\bAgentes de apoio \(Ava\)\b/g, 'Agente de apoio (Neri)')
    l = l.replace(/\bAgentes RAG\b/g, 'Agentes RAG') // unchanged
    l = l.replace(/\blogin AiyraCare\b/gi, 'login Ananeri')
    l = l.replace(/\bConhecer o Ananeri\b/g, 'Conhecer o Ananeri') // idempotent
    l = l.replace(/\bEntrar\/Login\/Aiyra\b/g, 'Entrar/Login/Ananeri')
    l = l.replace(/\bTexto Entrar\/Login\/Aiyra\b/g, 'Texto Entrar/Login/Ananeri')
    l = l.replace(/\bCommand Hub Care\b/g, 'Command Hub Ananeri')
    l = l.replace(/\bplataforma interna Ananeri\b/g, 'plataforma interna Ananeri')
    return l
  })
  return out.join('\n')
}

const files = new Set()
for (const g of GLOBS) {
  const abs = path.join(ROOT, g)
  if (!fs.existsSync(abs)) continue
  if (fs.statSync(abs).isDirectory()) {
    for (const f of walk(abs)) files.add(f)
  } else files.add(abs)
}

let changed = 0
for (const abs of files) {
  const rel = path.relative(ROOT, abs).replace(/\\/g, '/')
  if (shouldSkip(rel)) continue
  const before = fs.readFileSync(abs, 'utf8')
  const after = transform(before)
  if (after !== before) {
    fs.writeFileSync(abs, after)
    changed++
    console.log('updated', rel)
  }
}
console.log(`\n${changed} files updated`)
