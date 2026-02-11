-- ============================================
-- Add Device Type and Location Columns to pwa_installs
-- Makes queries faster and easier
-- ============================================

-- Add device_type column
ALTER TABLE pwa_installs
ADD COLUMN IF NOT EXISTS device_type TEXT;

-- Add location columns
ALTER TABLE pwa_installs
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pwa_installs_device_type 
  ON pwa_installs(device_type);

CREATE INDEX IF NOT EXISTS idx_pwa_installs_country 
  ON pwa_installs(country);

CREATE INDEX IF NOT EXISTS idx_pwa_installs_device_country 
  ON pwa_installs(device_type, country);

-- Migrate existing data from device_info JSONB to new columns
-- (if you have existing records)
UPDATE pwa_installs
SET 
  device_type = device_info->>'deviceType',
  country = device_info->'location'->>'country',
  city = device_info->'location'->>'city'
WHERE device_info IS NOT NULL
  AND (device_type IS NULL OR country IS NULL OR city IS NULL);
