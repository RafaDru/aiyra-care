import { GenericAgentPortalAdapter } from './generic-agent.portal.js'

export class UnimedPortalAdapter extends GenericAgentPortalAdapter {
  constructor() {
    super({
      portalType: 'unimed',
      label: 'Unimed BH',
      loginUrl: 'https://acesso.unimedbh.com.br/',
      baseUrl: 'https://app.unimedbh.com.br',
    })
  }
}
