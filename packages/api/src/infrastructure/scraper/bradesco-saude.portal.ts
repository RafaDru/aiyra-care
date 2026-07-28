import { GenericAgentPortalAdapter } from './generic-agent.portal.js'

export class BradescoSaudePortalAdapter extends GenericAgentPortalAdapter {
  constructor() {
    super({
      portalType: 'bradesco_saude',
      label: 'Bradesco Saúde',
      loginUrl: 'https://www.bradescosaude.com.br/',
      baseUrl: 'https://www.bradescosaude.com.br/',
    })
  }
}
