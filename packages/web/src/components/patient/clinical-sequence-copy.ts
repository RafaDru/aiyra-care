/** UI copy for care sequence — resolved via i18n (pt-BR / en). */

import i18n from '../../i18n/index.js'

const PREFIX = 'clinicalSequence.'

function seq(key: string): string {
  return i18n.t(`${PREFIX}${key}`)
}

export const CLINICAL_SEQUENCE_COPY = {
  get flowSectionTitle() {
    return seq('flowSectionTitle')
  },
  get flowEmpty() {
    return seq('flowEmpty')
  },
  get connectButton() {
    return seq('connectButton')
  },
  get connectButtonHint() {
    return seq('connectButtonHint')
  },
  get modalTitle() {
    return seq('modalTitle')
  },
  get modalHint() {
    return seq('modalHint')
  },
  get fromLabel() {
    return seq('fromLabel')
  },
  get toLabel() {
    return seq('toLabel')
  },
  get relationLabel() {
    return seq('relationLabel')
  },
  get relationPlaceholder() {
    return seq('relationPlaceholder')
  },
  get relationLoading() {
    return seq('relationLoading')
  },
  get submit() {
    return seq('submit')
  },
  get created() {
    return seq('created')
  },
  get removed() {
    return seq('removed')
  },
  get columnTitle() {
    return seq('columnTitle')
  },
  get associate() {
    return seq('associate')
  },
  get popoverTitle() {
    return seq('popoverTitle')
  },
  get expandTitle() {
    return seq('expandTitle')
  },
  get expandEmpty() {
    return seq('expandEmpty')
  },
  get expandHint() {
    return seq('expandHint')
  },
  get sequenceCount() {
    return seq('sequenceCount')
  },
  get goToEntity() {
    return seq('goToEntity')
  },
  get peerOutgoing() {
    return seq('peerOutgoing')
  },
  get peerIncoming() {
    return seq('peerIncoming')
  },
  get entityModalTitle() {
    return seq('entityModalTitle')
  },
  get entityModalHint() {
    return seq('entityModalHint')
  },
  get drawerFallbackTitle() {
    return seq('drawerFallbackTitle')
  },
  get drawerNotFound() {
    return seq('drawerNotFound')
  },
  get drawerLoadError() {
    return seq('drawerLoadError')
  },
  get timelineSectionTitle() {
    return seq('timelineSectionTitle')
  },
  get timelineSectionHint() {
    return seq('timelineSectionHint')
  },
  get noteSectionTitle() {
    return seq('noteSectionTitle')
  },
  get notePlaceholder() {
    return seq('notePlaceholder')
  },
  get noteSaved() {
    return seq('noteSaved')
  },
  get diagnosisConverted() {
    return seq('diagnosisConverted')
  },
  get allergyConverted() {
    return seq('allergyConverted')
  },
  get targetPickerPlaceholder() {
    return seq('targetPickerPlaceholder')
  },
}
