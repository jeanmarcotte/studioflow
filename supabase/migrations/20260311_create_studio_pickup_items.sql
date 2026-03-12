-- Studio Pickup Items: manual entries for misc items at studio (separate from photo_jobs)
CREATE TABLE studio_pickup_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_name TEXT NOT NULL,
  items TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  picked_up BOOLEAN NOT NULL DEFAULT false,
  picked_up_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE studio_pickup_items ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (admin app)
CREATE POLICY "Allow all for authenticated users" ON studio_pickup_items
  FOR ALL USING (true) WITH CHECK (true);

-- Index for common query: non-picked-up items
CREATE INDEX idx_studio_pickup_items_active ON studio_pickup_items (picked_up, created_at DESC)
  WHERE picked_up = false;
