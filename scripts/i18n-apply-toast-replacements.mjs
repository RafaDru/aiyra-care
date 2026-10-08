#!/usr/bin/env node
/** Mechanical replacements for toast/modal i18n — run once per branch. */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const web = join(root, 'packages/web/src')

const filePatches = [
  {
    file: 'pages/patient/tabs/DocumentsTab.tsx',
    addImport: "import { useTranslation } from 'react-i18next'\n",
    ensureHook: true,
    reps: [
      ["message.success('OCR revisado e salvo')", "message.success(t('toast.ocrReviewSaved'))"],
      ["message.info('Manuscrito detectado: OCR local é limitado. Abrindo interpretação por IA…')", "message.info(t('toast.handwritingLimitedOcr'))"],
      ["message.success('Arquivo salvo com revisão')", "message.success(t('toast.fileSavedWithReview'))"],
      ["message.success('Arquivo excluído')", "message.success(t('toast.fileDeleted'))"],
      ["message.error(err instanceof Error ? err.message : 'Erro ao salvar revisão')", "message.error(err instanceof Error ? err.message : t('toast.revisionSaveError'))"],
      ['title="Excluir este arquivo?"', "title={t('modals.deleteFileConfirm')}"],
      ['title="Interpretar manuscrito (LLM)"', "title={t('modals.interpretHandwriting')}"],
    ],
  },
  {
    file: 'pages/patient/tabs/IntegrationsTab.tsx',
    addImport: "import { useTranslation } from 'react-i18next'\n",
    ensureHook: true,
    reps: [
      ["message.info('Primeira conexão ou sessão expirada — Sincronizar pode abrir o portal')", "message.info(t('toast.integrationSessionHint'))"],
      ["message.info('Vincule Unimed, Amil ou Mater Dei em Nova integração')", "message.info(t('toast.integrationLinkHint'))"],
      ["message.success('Carteirinha atualizada')", "message.success(t('toast.healthCardUpdated'))"],
      ["message.error(err instanceof Error ? err.message : 'Erro ao atualizar carteirinha')", "message.error(err instanceof Error ? err.message : t('toast.healthCardUpdateError'))"],
      ["message.success('Vínculo removido')", "message.success(t('toast.linkRemoved'))"],
      ["message.error('Erro ao remover vínculo')", "message.error(t('toast.linkRemoveError'))"],
      ["message.info('Abra a aba Carteira para QR / Token Unimed')", "message.info(t('toast.openWalletForQr'))"],
      ['title="Número da carteirinha"', "title={t('modals.cardNumber')}"],
      ['label="Nº da carteirinha"', "label={t('modals.cardNumber')}"],
      ['placeholder="Ex: 094995656"', "placeholder={t('form.cardExample')}"],
    ],
  },
  {
    file: 'components/scraper/InterpretHandwritingModal.tsx',
    addImport: "import { useTranslation } from 'react-i18next'\n",
    ensureHook: true,
    reps: [
      ["message.success('Medicações cadastradas — revise na aba Medicações')", "message.success(t('toast.medsRegisteredReview'))"],
      ["message.error(err instanceof Error ? err.message : 'Erro na interpretação')", "message.error(err instanceof Error ? err.message : t('toast.interpretError'))"],
      ["message.error(err instanceof Error ? err.message : 'Erro ao cadastrar medicações')", "message.error(err instanceof Error ? err.message : t('toast.registerMedsError'))"],
      ['title="Análise da IA"', "title={t('modals.aiAnalysis')}"],
    ],
  },
  {
    file: 'components/patient/ConsultVisitWizardModal.tsx',
    addImport: "import { useTranslation } from 'react-i18next'\n",
    ensureHook: true,
    reps: [
      ["message.error(err instanceof Error ? err.message : 'Falha ao gerar link')", "message.error(err instanceof Error ? err.message : t('toast.consultLinkError'))"],
      ["message.warning('Informe um e-mail válido do médico')", "message.warning(t('toast.consultInvalidDoctorEmail'))"],
      ["message.error(err instanceof Error ? err.message : 'Falha ao enviar e-mail')", "message.error(err instanceof Error ? err.message : t('toast.consultEmailSendError'))"],
      ['placeholder="medico@clinica.com.br"', "placeholder={t('form.doctorEmail')}"],
      ['placeholder="Dr. Silva"', "placeholder={t('form.doctorName')}"],
    ],
  },
  {
    file: 'components/patient/EntityClinicalLinksExpandedPanel.tsx',
    addImport: "import { useTranslation } from 'react-i18next'\n",
    ensureHook: true,
    reps: [
      ["message.info('Este tipo ainda não tem aba dedicada no perfil.')", "message.info(t('toast.noDedicatedTab'))"],
    ],
  },
  {
    file: 'components/patient/InvestigationWizardModal.tsx',
    addImport: "import { useTranslation } from 'react-i18next'\n",
    ensureHook: true,
    reps: [
      ["message.warning('Preencha os campos obrigatórios desta etapa')", "message.warning(t('toast.investigationRequiredFields'))"],
      ["message.warning('Informe o título da investigação na primeira etapa')", "message.warning(t('toast.investigationTitleRequired'))"],
      ["message.error(e instanceof Error ? e.message : 'Não foi possível abrir a investigação')", "message.error(e instanceof Error ? e.message : t('toast.investigationOpenError'))"],
      ['title="Nova investigação"', "title={t('modals.newInvestigation')}"],
    ],
  },
  {
    file: 'components/patient/HealthThreadsPanel.tsx',
    addImport: "import { useTranslation } from 'react-i18next'\n",
    ensureHook: true,
    reps: [
      [".catch(() => message.error('Não foi possível carregar itens em acompanhamento'))", ".catch(() => message.error(t('toast.followUpLoadError')))"],
      ["message.success('Registro salvo')", "message.success(t('toast.recordSaved'))"],
      ["message.error(e instanceof Error ? e.message : 'Erro ao salvar')", "message.error(e instanceof Error ? e.message : t('toast.saveError'))"],
      ["message.success(status === 'resolved' ? 'Marcado como concluído' : 'Marcado como descartado')", "message.success(status === 'resolved' ? t('toast.markedResolved') : t('toast.markedDiscarded'))"],
      ["message.error(e instanceof Error ? e.message : 'Erro ao atualizar')", "message.error(e instanceof Error ? e.message : t('toast.updateError'))"],
      ["message.success('Removido')", "message.success(t('toast.removed'))"],
      ["message.success('Investigação aberta')", "message.success(t('toast.investigationOpened'))"],
      ["message.success('Plano de acompanhamento registrado')", "message.success(t('toast.followUpPlanRegistered'))"],
      ['title="Em acompanhamento"', "title={t('modals.inFollowUp')}"],
    ],
  },
  {
    file: 'components/document/OcrRegionReviewModal.tsx',
    addImport: "import { useTranslation } from 'react-i18next'\n",
    ensureHook: true,
    reps: [
      ["message.success('Carteira interpretada — revise vacinas e anotações manuscritas')", "message.success(t('toast.walletInterpreted'))"],
      ["message.error(err instanceof Error ? err.message : 'Erro na interpretação')", "message.error(err instanceof Error ? err.message : t('toast.interpretError'))"],
      ["message.info('Nenhuma vacina com dados suficientes para cadastro automático')", "message.info(t('toast.vaccinesInsufficientData'))"],
      ["message.error(err instanceof Error ? err.message : 'Erro ao cadastrar vacinas')", "message.error(err instanceof Error ? err.message : t('toast.vaccinesRegisterError'))"],
      ['title="Diminuir zoom"', "title={t('modals.zoomOut')}"],
      ['title="Aumentar zoom"', "title={t('modals.zoomIn')}"],
    ],
  },
  {
    file: 'components/scraper/RegisterAmilDependentModal.tsx',
    reps: [
      ["message.error(err instanceof Error ? err.message : 'Erro ao cadastrar')", "message.error(err instanceof Error ? err.message : t('toast.registerDependentError'))"],
      ['title="Cadastrar dependente do plano"', "title={t('modals.registerAmilDependent')}"],
      ['placeholder="000.000.000-00"', "placeholder={t('form.cpfMask')}"],
    ],
  },
  {
    file: 'components/patient/PatientClinicalExportModal.tsx',
    addImport: "import { useTranslation } from 'react-i18next'\n",
    ensureHook: true,
    reps: [
      [".catch((err) => message.error(err instanceof Error ? err.message : 'Falha ao carregar export'))", ".catch((err) => message.error(err instanceof Error ? err.message : t('toast.exportLoadError')))"],
      ["message.error(err instanceof Error ? err.message : 'Falha ao criar link')", "message.error(err instanceof Error ? err.message : t('toast.shareLinkError'))"],
    ],
  },
  {
    file: 'pages/patient/tabs/ExamsTab.tsx',
    reps: [
      ["message.error(e instanceof Error ? e.message : 'Erro ao abrir arquivo')", "message.error(e instanceof Error ? e.message : t('toast.openFileError'))"],
    ],
  },
  {
    file: 'components/ui/EntityFormModal.tsx',
    addImport: "import { useTranslation } from 'react-i18next'\n",
    ensureHook: true,
    reps: [
      ["message.error(err instanceof Error ? err.message : 'Erro desconhecido')", "message.error(err instanceof Error ? err.message : t('common.unknownError'))"],
    ],
  },
  {
    file: 'components/scraper/SyncProgressModal.tsx',
    reps: [
      ['title="Algumas etapas falharam"', "title={t('modals.syncStepsFailed')}"],
      ['title="Erro na sincronização"', "title={t('modals.syncError')}"],
    ],
  },
  {
    file: 'components/patient/LinkRoleHelpModal.tsx',
    reps: [['title="Papéis do vínculo na trilha"', "title={t('modals.linkRolesHelp')}"]],
  },
  {
    file: 'components/patient/TaskWizardModal.tsx',
    reps: [['title="Novo plano de acompanhamento"', "title={t('modals.newFollowUpPlan')}"]],
  },
  {
    file: 'components/patient/PatientContextPanel.tsx',
    reps: [['title="Resumo clínico"', "title={t('modals.clinicalSummary')}"]],
  },
  {
    file: 'components/integrations/NewIntegrationModal.tsx',
    reps: [
      ['title="Nova integração"', "title={t('modals.newIntegration')}"],
      ['placeholder="Buscar integração…"', "placeholder={t('form.searchIntegration')}"],
    ],
  },
  {
    file: 'components/integrations/IntegrationsSyncSidebar.tsx',
    reps: [['title="Sincronizações"', "title={t('modals.syncJobs')}"]],
  },
  {
    file: 'components/integrations/AmilSyncOptionsModal.tsx',
    reps: [
      ['title="Sincronizar Amil — atendimentos"', "title={t('modals.amilSyncVisits')}"],
      ['placeholder="Ex: 094995656"', "placeholder={t('form.cardExample')}"],
    ],
  },
]

function ensureUseTranslation(src, patch) {
  let out = src
  if (patch.addImport && !out.includes('useTranslation')) {
    const firstImport = out.indexOf('import ')
    out = patch.addImport + out
  }
  if (patch.ensureHook && !out.includes('const { t } = useTranslation()')) {
    const fnMatch = out.match(/export function (\w+)\([^)]*\)\s*\{/)
    const arrowMatch = out.match(/export const (\w+)\s*=\s*\([^)]*\)\s*=>\s*\{/)
    const m = fnMatch || arrowMatch
    if (m) {
      const insertAt = out.indexOf('{', out.indexOf(m[0])) + 1
      out = out.slice(0, insertAt) + '\n  const { t } = useTranslation()' + out.slice(insertAt)
    }
  }
  return out
}

for (const patch of filePatches) {
  const path = join(web, patch.file)
  let src = readFileSync(path, 'utf8')
  for (const [from, to] of patch.reps) {
    if (!src.includes(from)) {
      console.warn(`SKIP (not found) ${patch.file}: ${from.slice(0, 50)}`)
      continue
    }
    src = src.replace(from, to)
  }
  src = ensureUseTranslation(src, patch)
  writeFileSync(path, src)
  console.log('patched', patch.file)
}
