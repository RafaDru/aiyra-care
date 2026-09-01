import { Tooltip } from 'antd'
import {
  brandOrFallback,
  brandLogoForVariant,
  brandAvatarBorderRadius,
  shrinkLogoFrame,
  resolveAvatarDisplay,
  type BrandKey,
} from './brand-config.js'

interface Props {
  brand: BrandKey | string
  size?: number
  variant?: 'avatar' | 'inline' | 'banner' | 'cardHeader'
  /** Ajustes visuais da aba Integrações */
  context?: 'default' | 'integrations'
  /** Logo menor dentro do chip padronizado */
  compact?: boolean
  /** Tamanho máximo (px) quando compact */
  compactMax?: number
}

function LogoFrame({
  src,
  alt,
  width,
  height,
  background,
  padding = 6,
  borderRadius = 10,
  maxImgHeight,
  fit = 'contain',
  objectPosition = 'center center',
}: {
  src?: string
  alt: string
  width: number
  height: number
  background: string
  padding?: number
  borderRadius?: number
  maxImgHeight?: number
  fit?: 'contain' | 'cover'
  objectPosition?: string
}) {
  if (!src) {
    const initials = alt.slice(0, 2).toUpperCase()
    return (
      <div
        style={{
          width,
          height,
          minWidth: width,
          flexShrink: 0,
          background,
          borderRadius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          color: '#fff',
          fontSize: Math.max(10, Math.round(Math.min(width, height) * 0.34)),
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {initials}
      </div>
    )
  }

  const isCover = fit === 'cover'
  const pad = isCover ? 0 : padding

  return (
    <div
      style={{
        width,
        height,
        minWidth: width,
        flexShrink: 0,
        background,
        borderRadius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: pad,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <img
        src={src}
        alt={alt}
        style={
          isCover
            ? {
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition,
              }
            : {
                display: 'block',
                width: 'auto',
                height: 'auto',
                maxWidth: '100%',
                maxHeight: maxImgHeight ?? height - pad * 2,
                objectFit: 'contain',
              }
        }
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    </div>
  )
}

export function BrandLogo({
  brand,
  size = 48,
  variant = 'avatar',
  context = 'default',
  compact = false,
  compactMax = 32,
}: Props) {
  const meta = brandOrFallback(brand)
  const src = brandLogoForVariant(meta, variant)
  const bg = meta.logoBg ?? '#ffffff'

  if (variant === 'inline' || variant === 'banner' || variant === 'cardHeader') {
    const maxH = variant === 'banner'
      ? Math.round(size * 0.5)
      : variant === 'cardHeader'
        ? meta.cardHeaderLogoMaxHeight ?? 40
        : size
    return (
      <LogoFrame
        src={src}
        alt={meta.label}
        width={variant === 'inline' ? Math.round(size * 2.2) : Math.round(size * 2.5)}
        height={maxH + 12}
        background={variant === 'cardHeader' ? (meta.cardHeaderBg ?? bg) : bg}
        padding={8}
        borderRadius={variant === 'cardHeader' ? 0 : 10}
        maxImgHeight={maxH}
      />
    )
  }

  const avatar = resolveAvatarDisplay(meta, context, src)
  const frame = compact ? shrinkLogoFrame(avatar.frame, compactMax) : avatar.frame
  const borderRadius = brandAvatarBorderRadius(frame.width, frame.height)

  return (
    <Tooltip title={meta.label}>
      <LogoFrame
        src={avatar.src}
        alt={meta.label}
        width={frame.width}
        height={frame.height}
        background={avatar.bg}
        padding={6}
        borderRadius={borderRadius}
        fit={avatar.fit}
        objectPosition={avatar.objectPosition}
      />
    </Tooltip>
  )
}

export function BrandTag({
  brand,
  children,
}: {
  brand: BrandKey | string
  children?: React.ReactNode
}) {
  const meta = brandOrFallback(brand)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '3px 10px 3px 4px',
        borderRadius: 999,
        background: `${meta.color}12`,
        border: `1px solid ${meta.color}33`,
        fontSize: 12,
        fontWeight: 600,
        color: meta.color,
      }}
    >
      <BrandLogo brand={brand} variant="avatar" />
      {children ?? meta.shortLabel}
    </span>
  )
}
