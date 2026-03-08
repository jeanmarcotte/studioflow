CREATE TABLE video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('FULL', 'RECAP')),
  section TEXT NOT NULL DEFAULT 'editing' CHECK (section IN (
    'editing', 'reediting', 'waiting_photo', 'completed'
  )),
  wedding_date DATE,
  order_date DATE,
  hours_raw DECIMAL,
  ceremony_done BOOLEAN DEFAULT false,
  reception_done BOOLEAN DEFAULT false,
  assigned_to TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'in_progress', 'waiting_photo', 'complete'
  )),
  notes TEXT,
  full_video_id UUID REFERENCES video_jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_video_jobs_couple_id ON video_jobs(couple_id);
CREATE INDEX idx_video_jobs_section ON video_jobs(section);
CREATE INDEX idx_video_jobs_wedding_date ON video_jobs(wedding_date);
CREATE INDEX idx_video_jobs_assigned_to ON video_jobs(assigned_to);
CREATE INDEX idx_video_jobs_full_video_id ON video_jobs(full_video_id);

CREATE OR REPLACE FUNCTION update_video_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_jobs_updated_at
  BEFORE UPDATE ON video_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_video_jobs_updated_at();

ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON video_jobs
  FOR ALL
  USING (true)
  WITH CHECK (true);
