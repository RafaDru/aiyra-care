import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { AvaNeuralOverlay } from './AvaNeuralOverlay.js'
import {
  type AvaExpression,
  resolveAvaExpressionConfig,
} from './ava-expressions.js'
import './ava-avatar.css'

const DEFAULT_SOFT_CROSSFADE_MS = 2200
const DEFAULT_CHAT_CROSSFADE_MS = 1000

type FadePhase = 'stable' | 'pre' | 'active'
export type AvaCrossfadeVariant = 'full' | 'lite'

interface Props {
  size?: number
  className?: string
  expression?: AvaExpression
  neural?: boolean
  animated?: boolean
  analyzing?: boolean
  thinking?: boolean
  /** Crossfade entre PNGs (dock full, chat lite). */
  softCrossfade?: boolean
  crossfadeMs?: number
  crossfadeVariant?: AvaCrossfadeVariant
}

interface VisualLayer {
  key: string
  expression: AvaExpression
  src: string
  shellClass?: string
}

function buildVisualLayer(expression: AvaExpression): VisualLayer {
  const config = resolveAvaExpressionConfig(expression)
  return {
    key: `${expression}|${config.src}`,
    expression,
    src: config.src,
    shellClass: config.shellClass,
  }
}

function layerIsShown(index: number, layerCount: number, phase: FadePhase): boolean {
  if (layerCount <= 1) return true
  const isOutgoing = index === 0
  const isIncoming = index === layerCount - 1
  if (phase === 'pre') return isOutgoing
  if (phase === 'active') return isIncoming
  return isIncoming
}

/** Avatar — PNG por expressão; crossfade opcional com glow esfumaçado. */
export function AvaAvatar({
  size = 48,
  className,
  expression = 'present',
  neural = true,
  animated = true,
  analyzing = false,
  thinking = false,
  softCrossfade = false,
  crossfadeMs,
  crossfadeVariant = 'full',
}: Props) {
  const isAnalyzing = analyzing || thinking
  const isLiteCrossfade = crossfadeVariant === 'lite'
  const resolvedCrossfadeMs =
    crossfadeMs ?? (isLiteCrossfade ? DEFAULT_CHAT_CROSSFADE_MS : DEFAULT_SOFT_CROSSFADE_MS)

  const targetLayer = useMemo(() => buildVisualLayer(expression), [expression])
  const config = resolveAvaExpressionConfig(expression)

  const [layers, setLayers] = useState<VisualLayer[]>(() => [targetLayer])
  const [fadePhase, setFadePhase] = useState<FadePhase>('stable')

  const morphing = softCrossfade && (fadePhase === 'pre' || fadePhase === 'active')

  useEffect(() => {
    if (!softCrossfade) {
      setLayers([targetLayer])
      setFadePhase('stable')
      return
    }
    setLayers((prev) => {
      const top = prev[prev.length - 1]
      if (top.key === targetLayer.key) return prev
      return [top, targetLayer]
    })
  }, [targetLayer, softCrossfade])

  useEffect(() => {
    if (!softCrossfade || layers.length <= 1) {
      if (!softCrossfade) setLayers([targetLayer])
      setFadePhase('stable')
      return
    }

    setFadePhase('pre')
    let innerRaf = 0
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        setFadePhase('active')
      })
    })

    const top = layers[layers.length - 1]
    const timer = window.setTimeout(() => {
      setLayers([top])
      setFadePhase('stable')
    }, resolvedCrossfadeMs)

    return () => {
      cancelAnimationFrame(outerRaf)
      cancelAnimationFrame(innerRaf)
      window.clearTimeout(timer)
    }
  }, [layers, softCrossfade, resolvedCrossfadeMs, targetLayer])

  const shellClasses = [
    'ava-avatar-shell',
    morphing && !isLiteCrossfade && 'ava-avatar-shell--soft-morph',
    config.shellClass,
    className,
  ].filter(Boolean).join(' ')

  const avatarClasses = [
    'ava-avatar',
    animated && 'ava-avatar--animated',
    isAnalyzing && 'ava-avatar--analyzing',
    morphing && isLiteCrossfade && 'ava-avatar--soft-morph-lite',
    morphing && !isLiteCrossfade && 'ava-avatar--soft-morph',
  ].filter(Boolean).join(' ')

  const shellStyle = {
    width: size,
    height: size,
    '--ava-crossfade-duration': `${resolvedCrossfadeMs}ms`,
  } as CSSProperties

  const displayLayers = softCrossfade ? layers : [targetLayer]
  const showCrossfade = softCrossfade && morphing

  return (
    <span className={shellClasses} style={shellStyle}>
      {morphing && (
        <>
          {!isLiteCrossfade && <span className="ava-avatar__morph-smoke" aria-hidden="true" />}
          <span
            className={[
              'ava-avatar__morph-veil',
              isLiteCrossfade && 'ava-avatar__morph-veil--lite',
            ].filter(Boolean).join(' ')}
            aria-hidden="true"
          />
        </>
      )}
      <span
        className={avatarClasses}
        style={{ '--ava-crossfade-duration': `${resolvedCrossfadeMs}ms` } as CSSProperties}
      >
        <span className="ava-avatar__layers">
          {displayLayers.map((layer, index) => {
            const shown = softCrossfade
              ? layerIsShown(index, displayLayers.length, fadePhase)
              : true
            const layerClasses = [
              'ava-avatar__layer',
              `ava-avatar__layer--expr-${layer.expression}`,
              shown ? 'ava-avatar__layer--shown' : 'ava-avatar__layer--hidden',
              showCrossfade && !isLiteCrossfade && index === 0 && 'ava-avatar__layer--outgoing',
              showCrossfade && !isLiteCrossfade && index === displayLayers.length - 1 && 'ava-avatar__layer--incoming',
            ].filter(Boolean).join(' ')

            const isTop = index === displayLayers.length - 1

            return (
              <span key={`${layer.key}-${index}`} className={layerClasses}>
                <span className="ava-avatar__photo-frame">
                  <img
                    className="ava-avatar__photo"
                    src={layer.src}
                    alt={isTop ? 'Ava' : ''}
                    width={size}
                    height={size}
                  />
                </span>
              </span>
            )
          })}
        </span>
        {neural && (
          <AvaNeuralOverlay analyzing={isAnalyzing} transitioning={morphing && !isLiteCrossfade} />
        )}
      </span>
    </span>
  )
}
