import { Alert, Typography } from 'antd'

const { Text } = Typography

/** Orientação quando o sync Hermes usa portal unificado Grupo Fleury (OTP no Chrome). */
export function FleuryOtpSyncHint() {
  return (
    <Alert
      type="info"
      showIcon
      style={{ marginBottom: 8, fontSize: 12 }}
      message="Grupo Fleury — login com código"
      description={
        <ol style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 11 }}>
          <li>Um <Text strong>Chrome</Text> abriu com o portal Precision Care.</li>
          <li>Digite seu <Text strong>CPF</Text> (já pode estar preenchido).</li>
          <li>Solicite o código por <Text strong>SMS, e-mail ou WhatsApp</Text>.</li>
          <li>Digite o código no portal e aguarde a lista de resultados.</li>
          <li>Não feche o Chrome até o sync terminar nesta tela.</li>
        </ol>
      }
    />
  )
}
