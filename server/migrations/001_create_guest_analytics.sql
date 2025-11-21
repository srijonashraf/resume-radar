-- Create guest_analytics table to track unauthenticated user usage
CREATE TABLE IF NOT EXISTS guest_analytics (
  id VARCHAR(255) PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  mac_address VARCHAR(17),
  user_agent TEXT,
  analysis_count INTEGER DEFAULT 1,
  last_analysis_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_guest_analytics_ip_mac ON guest_analytics(ip_address, mac_address);

-- Create index for last analysis time
CREATE INDEX IF NOT EXISTS idx_guest_analytics_last_analysis ON guest_analytics(last_analysis_at);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_guest_analytics_updated_at
    BEFORE UPDATE ON guest_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();