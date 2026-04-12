'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmailTemplate } from '@/lib/email/types';

interface TemplateSelectorProps {
  category: 'chase' | 'quote' | 'reminder' | 'crew';
  onSelect: (template: EmailTemplate | null) => void;
  defaultTemplateId?: string;
}

export function TemplateSelector({
  category,
  onSelect,
  defaultTemplateId
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>(defaultTemplateId || '');

  useEffect(() => {
    async function loadTemplates() {
      try {
        const response = await fetch(`/api/templates?category=${category}`);
        if (response.ok) {
          const data = await response.json();
          setTemplates(data.templates || []);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();
  }, [category]);

  const handleSelect = (templateId: string | null) => {
    const id = templateId || '';
    setSelected(id);
    if (!id || id === 'none') {
      onSelect(null);
    } else {
      const template = templates.find(t => t.id === id);
      onSelect(template || null);
    }
  };

  if (loading) {
    return <div className="h-10 bg-muted animate-pulse rounded-md" />;
  }

  const selectedName = selected === 'none'
    ? 'No template - blank email'
    : templates.find(t => t.id === selected)?.name || 'Select a template (optional)';

  return (
    <Select value={selected} onValueChange={handleSelect}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a template (optional)">
          {selected ? selectedName : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No template - blank email</SelectItem>
        {templates.map((template) => (
          <SelectItem key={template.id} value={template.id}>
            {template.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
