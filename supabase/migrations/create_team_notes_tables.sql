-- Migration: create_team_notes_tables
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ntysfrgjwwcrtgustteb/sql

-- Team notes log
CREATE TABLE IF NOT EXISTS team_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE SET NULL,
  couple_name TEXT,
  shooters TEXT[] NOT NULL DEFAULT '{}',
  wedding_phase TEXT[] NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  note TEXT NOT NULL,
  is_lesson BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issue tags (sticky, reusable)
CREATE TABLE IF NOT EXISTS note_issue_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction: notes to tags
CREATE TABLE IF NOT EXISTS note_tag_links (
  note_id UUID REFERENCES team_notes(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES note_issue_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_team_notes_couple_id ON team_notes(couple_id);
CREATE INDEX IF NOT EXISTS idx_team_notes_created_at ON team_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_notes_severity ON team_notes(severity);
CREATE INDEX IF NOT EXISTS idx_note_issue_tags_usage ON note_issue_tags(usage_count DESC);
