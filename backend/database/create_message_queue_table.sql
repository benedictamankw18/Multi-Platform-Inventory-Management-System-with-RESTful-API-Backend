-- Migration: create message_queue table
CREATE TABLE IF NOT EXISTS message_queue (
  id uuid PRIMARY KEY,
  type text NOT NULL,
  payload jsonb,
  attempts integer DEFAULT 0,
  status text DEFAULT 'PENDING',
  next_try timestamptz NULL,
  last_error text NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_queue_status_next_try ON message_queue(status, next_try);
