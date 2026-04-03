"use client"

import { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface InputPageTemplateProps {
  // Header
  title: string
  subtitle?: string

  // Form Actions
  onSubmit?: () => void
  onCancel?: () => void
  submitLabel?: string
  cancelLabel?: string
  isSubmitting?: boolean

  // Sections
  children: ReactNode

  // Error state
  error?: string | null

  // Layout
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"

  className?: string
}

export function InputPageTemplate({
  title,
  subtitle,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isSubmitting,
  children,
  error,
  maxWidth = "2xl",
  className,
}: InputPageTemplateProps) {
  const widthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full",
  }

  return (
    <div className={cn("space-y-6", widthClasses[maxWidth], className)}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Form Content */}
      <div className="space-y-6">
        {children}
      </div>

      {/* Form Actions */}
      {(onSubmit || onCancel) && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </Button>
          )}
          {onSubmit && (
            <Button
              type="submit"
              onClick={onSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : submitLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Helper component for form sections
interface FormSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  )
}
