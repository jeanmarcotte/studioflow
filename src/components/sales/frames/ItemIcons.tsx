'use client'

interface ItemIconsProps {
  collageSize: string | null
  albumQty: number | null
  signingBook: boolean | null
  weddingFrameSize: string | null
  engPortraitSize: string | null
  hasDigital: boolean
}

export default function ItemIcons({ collageSize, albumQty, signingBook, weddingFrameSize, engPortraitSize, hasDigital }: ItemIconsProps) {
  const items: { emoji: string; title: string }[] = []

  if (collageSize) items.push({ emoji: '\uD83D\uDDBC\uFE0F', title: `Collage ${collageSize}` })
  if (albumQty && albumQty > 0) items.push({ emoji: '\uD83D\uDCD6', title: `${albumQty} Album(s)` })
  if (signingBook) items.push({ emoji: '\u270D\uFE0F', title: 'Signing Book' })
  if (weddingFrameSize) items.push({ emoji: '\uD83C\uDFA8', title: `Frame ${weddingFrameSize}` })
  if (engPortraitSize) items.push({ emoji: '\uD83D\uDDBC\uFE0F', title: `Eng Portrait ${engPortraitSize}` })
  if (hasDigital) items.push({ emoji: '\uD83D\uDCBE', title: 'Digital Files' })

  if (items.length === 0) return <span className="text-muted-foreground">—</span>

  return (
    <div className="flex items-center gap-1">
      {items.map((item, i) => (
        <span key={i} title={item.title} className="cursor-default text-base">
          {item.emoji}
        </span>
      ))}
    </div>
  )
}
