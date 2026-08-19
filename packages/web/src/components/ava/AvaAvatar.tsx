import { AvaNeuralOverlay } from './AvaNeuralOverlay.js'
import './ava-avatar.css'

interface Props {
  size?: number
  className?: string
  /** Overlay neural animado no cabelo (marca Aiyra). */
  neural?: boolean
  /** Animação suave da rede; respeita prefers-reduced-motion. */
  animated?: boolean
  /** Glow + rede neural contínua (LLM analisando). */
  analyzing?: boolean
  /** Alias de analyzing — compatibilidade. */
  thinking?: boolean
}

/** Avatar da Ava — PNG circular + rede neural + glow quando LLM ativa. */
export function AvaAvatar({
  size = 48,
  className,
  neural = true,
  animated = true,
  analyzing = false,
  thinking = false,
}: Props) {
  const isAnalyzing = analyzing || thinking

  const shellClasses = [
    'ava-avatar-shell',
    isAnalyzing && 'ava-avatar-shell--analyzing',
    className,
  ].filter(Boolean).join(' ')

  const avatarClasses = [
    'ava-avatar',
    animated && 'ava-avatar--animated',
    isAnalyzing && 'ava-avatar--analyzing',
  ].filter(Boolean).join(' ')

  return (
    <span className={shellClasses} style={{ width: size, height: size }}>
      <span className={avatarClasses}>
        <img
          className="ava-avatar__photo"
          src="/brand/ava-avatar.png"
          alt="Ava"
          width={size}
          height={size}
        />
        {neural && <AvaNeuralOverlay analyzing={isAnalyzing} />}
      </span>
    </span>
  )
}
