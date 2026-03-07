CREATE TABLE photo_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN (
    'WED_PACKAGE', 'WED_PROOFS', 'WED_ALBUM',
    'ENG_PROOFS', 'ENG_COLLAGE',
    'PARENT_BOOK', 'PORTRAITS', 'USB', 'PRINTS',
    'BEST_PRINT', 'CUSTOM_ITEM', 'UAF'
  )),
  section TEXT NOT NULL DEFAULT 'editing' CHECK (section IN (
    'overdue', 'editing', 'due_asap', 'at_lab',
    'best_pending', 'at_studio', 'waiting', 'completed'
  )),
  photos_taken INTEGER DEFAULT 0,
  photos_selected INTEGER DEFAULT 0,
  edited_so_far INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0,
  order_date DATE,
  due_date DATE,
  assigned_to TEXT,
  lab TEXT CHECK (lab IS NULL OR lab IN ('BEST', 'CUSTOM', 'UAF', 'Studio')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'in_progress', 'proofs_sent',
    'at_lab', 'delivered', 'completed'
  )),
  notes TEXT,
  brand TEXT DEFAULT 'SIGS' CHECK (brand IN ('SIGS', 'JM')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_photo_jobs_couple_id ON photo_jobs(couple_id);
CREATE INDEX idx_photo_jobs_section ON photo_jobs(section);
CREATE INDEX idx_photo_jobs_order_date ON photo_jobs(order_date);
CREATE INDEX idx_photo_jobs_assigned_to ON photo_jobs(assigned_to);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_photo_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photo_jobs_updated_at
  BEFORE UPDATE ON photo_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_jobs_updated_at();

-- Enable RLS
ALTER TABLE photo_jobs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON photo_jobs
  FOR ALL
  USING (true)
  WITH CHECK (true);
