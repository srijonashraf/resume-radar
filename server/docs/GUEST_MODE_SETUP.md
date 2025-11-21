# Guest Mode Implementation

This document outlines the guest user functionality that allows unauthenticated users to analyze one resume for free, with subsequent analyses requiring login.

## Features

### Guest User Capabilities
- **Free Resume Analysis**: One complete resume analysis including skills, experience, and formatting feedback
- **IP/MAC Address Tracking**: Tracks guest usage to prevent abuse
- **Usage Limits**: Enforces 1 analysis per guest device
- **Conversion Prompts**: Encourages guests to sign up for additional features

### Authenticated User Benefits
- **Unlimited Analyses**: No restrictions on resume analysis
- **Advanced Features**: Job matching, career mapping, smart editor
- **History Tracking**: Persistent analysis history in cloud
- **Personalized Insights**: Enhanced AI-powered recommendations

## Implementation Details

### Backend Changes

#### 1. Database Schema
- **guest_analytics table**: Tracks IP address, MAC address, usage count
- **Automatic cleanup**: Removes entries older than 30 days
- **Efficient indexing**: Optimized for IP/MAC lookups

#### 2. New Services
- **guestService.ts**: Handles guest tracking and validation
- **Optional authentication middleware**: Allows both guest and authenticated users

#### 3. API Updates
- **`/api/analyze`**: Now accepts guest users (1 analysis limit)
- **`/api/guest-status`**: Check remaining guest analyses
- **Enhanced error responses**: Specific messages for guest limits

### Frontend Changes

#### 1. State Management
- **Guest mode tracking**: `isGuest` and `guestMessage` in Zustand store
- **Usage validation**: Prevents multiple uploads for guests

#### 2. UI Components
- **GuestBanner**: Prominent notification for guest users
- **Feature gating**: Advanced features only for authenticated users
- **Conversion prompts**: Clear calls-to-action to sign up

#### 3. User Experience
- **Graceful degradation**: Shows relevant features based on auth status
- **Clear messaging**: Explains limitations and benefits of signing up

## Database Migration

Run the following SQL migration to set up the guest analytics table:

```sql
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
```

## Environment Variables

No additional environment variables are required. The guest functionality uses the existing database connection.

## Testing

### Guest Mode Testing
1. Clear browser cookies/localStorage
2. Navigate to the app without logging in
3. Upload and analyze a resume
4. Verify guest banner appears
5. Try uploading another resume - should be blocked
6. Verify conversion prompts appear

### Authentication Testing
1. Login with existing account
2. Verify access to all features
3. Test unlimited resume uploads
4. Verify history persistence

## Security Considerations

### IP Address Limitations
- **NAT Networks**: Multiple users behind same IP may share limit
- **Dynamic IPs**: Users may get additional analyses with new IP
- **VPNs/Proxies**: Can bypass IP-based restrictions

### MAC Address Considerations
- **Browser Limitations**: MAC address not directly accessible via HTTP
- **Privacy Concerns**: Requires client-side transmission
- **Fallback**: IP-based tracking when MAC not available

### Mitigation Strategies
- **Rate Limiting**: Implement request rate limits per IP
- **CAPTCHA**: Add for suspicious usage patterns
- **Monitoring**: Regular audit of guest usage patterns

## Monitoring and Analytics

### Key Metrics
- **Guest conversion rate**: Percentage of guests who sign up
- **Analysis completion rate**: Success rate of guest analyses
- **IP collision frequency**: How often multiple users share IPs
- **Abuse detection**: Unusual usage patterns

### Dashboard Integration
Consider adding these metrics to your analytics dashboard for business insights.

## Future Enhancements

### Rate Limiting Improvements
- **Fingerprinting**: Browser fingerprinting for better identification
- **Time-based limits**: Allow re-analysis after cooldown period
- **Social sharing**: Grant additional analyses for social shares

### Enhanced Guest Experience
- **Partial results**: Show basic analysis even after limit reached
- **Email analysis**: Email analysis results for guest conversion
- **Sample resumes**: Allow analysis of sample resumes without limit

## Support

For issues or questions about the guest mode implementation:
1. Check server logs for guest service errors
2. Verify database table creation
3. Test with different network configurations
4. Monitor abuse detection alerts