'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Printer } from 'lucide-react'

interface PickupSlipCardProps {
  coupleId: string
  coupleName: string
}

export function PickupSlipCard({ coupleId, coupleName }: PickupSlipCardProps) {
  const [items, setItems] = useState<string[]>([''])
  const [isGenerating, setIsGenerating] = useState(false)

  const addItem = () => {
    setItems([...items, ''])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = value
    setItems(newItems)
  }

  const generatePickupSlip = async () => {
    const filledItems = items.filter(item => item.trim() !== '')
    if (filledItems.length === 0) {
      alert('Please add at least one item')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch(`/api/couples/${coupleId}/pdf/pickup-slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: filledItems })
      })

      if (!response.ok) throw new Error('Failed to generate PDF')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (error) {
      console.error('Error generating pickup slip:', error)
      alert('Failed to generate pickup slip')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Printer className="h-5 w-5 text-teal-600" />
          Client Pickup Slip
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground mb-4">
          Add items being picked up, then generate a printable slip for {coupleName} to sign.
        </p>

        <div className="space-y-2 mb-4">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Item ${index + 1} (e.g., "16x20 Canvas")`}
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(index)}
                disabled={items.length === 1}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={addItem} className="gap-1">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
          <Button
            variant="outline"
            onClick={generatePickupSlip}
            disabled={isGenerating}
            className="gap-1"
          >
            <Printer className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Generate & Print'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
