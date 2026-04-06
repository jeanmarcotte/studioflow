'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TemplateSelector } from './TemplateSelector';
import { EmailTemplate, TemplateContext } from '@/lib/email/types';
import { replaceVariables } from '@/lib/email/templates';
import { toast } from 'sonner';
import { Loader2, Send, X } from 'lucide-react';

interface EmailComposerProps {
  // Required
  to: string;
  recipientName: string;

  // Template config
  templateCategory?: 'chase' | 'quote' | 'reminder' | 'crew';
  templateContext?: TemplateContext;

  // Tracking (optional - for logging to lead_contacts)
  leadId?: string;
  entityId?: string;

  // Callbacks
  onSuccess?: () => void;
  onCancel?: () => void;

  // Initial values (optional)
  defaultSubject?: string;
  defaultBody?: string;
}

export function EmailComposer({
  to,
  recipientName,
  templateCategory = 'chase',
  templateContext = {},
  leadId,
  entityId,
  onSuccess,
  onCancel,
  defaultSubject = '',
  defaultBody = '',
}: EmailComposerProps) {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [sending, setSending] = useState(false);

  // Update subject/body when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      const filledSubject = replaceVariables(selectedTemplate.subject, templateContext);
      const filledBody = replaceVariables(selectedTemplate.body, templateContext);
      setSubject(filledSubject);
      setBody(filledBody);
    }
  }, [selectedTemplate, templateContext]);

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (!body.trim()) {
      toast.error('Email body is required');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          body,
          leadId,
          entityId,
          templateId: selectedTemplate?.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Email sent to ${recipientName}`);
        onSuccess?.();
      } else {
        toast.error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Send email error:', error);
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* To field (read-only) */}
      <div className="space-y-2">
        <Label htmlFor="to">To</Label>
        <Input
          id="to"
          value={`${recipientName} <${to}>`}
          disabled
          className="bg-muted"
        />
      </div>

      {/* Template selector */}
      <div className="space-y-2">
        <Label>Template</Label>
        <TemplateSelector
          category={templateCategory}
          onSelect={setSelectedTemplate}
        />
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="subject">Subject *</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter email subject"
        />
      </div>

      {/* Body */}
      <div className="space-y-2">
        <Label htmlFor="body">Message *</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Enter your message"
          rows={10}
          className="font-mono text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={sending}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        )}
        <Button onClick={handleSend} disabled={sending}>
          {sending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {sending ? 'Sending...' : 'Send Email'}
        </Button>
      </div>
    </div>
  );
}
