import { GenericAgentPortalAdapter } from './generic-agent.portal.js'

export class AmilPortalAdapter extends GenericAgentPortalAdapter {
  constructor() {
    super({
      portalType: 'amil',
      label: 'Amil',
      loginUrl: 'https://www.amil.com.br/',
      baseUrl: 'https://www.amil.com.br/',
    })
  }
}
