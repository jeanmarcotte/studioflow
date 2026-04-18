interface InfoItem {
  label: string
  value: string | null
  highlight?: boolean
}

interface InfoGridProps {
  title: string
  items: InfoItem[]
}

export function InfoGrid({ title, items }: InfoGridProps) {
  return (
    <div>
      <h3 className="text-xs font-medium text-teal-600 uppercase tracking-wider mb-4">{title}</h3>
      <dl className="space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-xs font-medium text-gray-500 uppercase">{item.label}</dt>
            <dd className={`text-sm ${item.value ? 'text-gray-900' : 'text-gray-400 italic'}`}>
              {item.value ?? 'Not specified'}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
