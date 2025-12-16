import pool from "../config/database";

export interface GuestAnalytics {
  id: string;
  ip_address: string;
  mac_address?: string;
  user_agent?: string;
  analysis_count: number;
  last_analysis_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface GuestUsageResult {
  allowed: boolean;
  guestId?: string;
  message?: string;
  analysisCount?: number;
}

/**
 * Get client IP address from request
 */
export const getClientIP = (req: any): string => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "127.0.0.1"
  );
};

/**
 * Get MAC address from request headers (if available)
 * Note: MAC address is not directly accessible via HTTP, but clients can send it in headers
 */
export const getClientMAC = (req: any): string | undefined => {
  return req.headers["x-mac-address"] || undefined;
};

/**
 * Get user agent from request
 */
export const getUserAgent = (req: any): string | undefined => {
  return req.headers["user-agent"];
};

/**
 * Check if guest user is allowed to analyze resume
 */
export const checkGuestUsage = async (req: any): Promise<GuestUsageResult> => {
  const ipAddress = getClientIP(req);
  const macAddress = getClientMAC(req);
  const userAgent = getUserAgent(req);

  try {
    // Check if guest has already used the service
    const existingGuestQuery = `
      SELECT id, analysis_count, last_analysis_at
      FROM guest_usage
      WHERE ip_address = $1 OR mac_address = $2
      ORDER BY last_analysis_at DESC
      LIMIT 1
    `;

    const result = await pool.query(existingGuestQuery, [
      ipAddress,
      macAddress,
    ]);

    if (result.rows.length > 0) {
      const guest = result.rows[0];

      // Check if guest has reached the limit (1 analysis)
      if (guest.analysis_count >= 1) {
        return {
          allowed: false,
          message:
            "You've reached your free resume analysis limit. Please login to analyze more resumes.",
          analysisCount: guest.analysis_count,
        };
      }

      // Increment usage count
      await incrementGuestUsage(guest.id);
      return {
        allowed: true,
        guestId: guest.id,
        analysisCount: guest.analysis_count + 1,
      };
    }

    // New guest user - create entry
    const guestId = `guest_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;
    await createGuestEntry(guestId, ipAddress, macAddress, userAgent);

    return {
      allowed: true,
      guestId: guestId,
      analysisCount: 1,
    };
  } catch (error) {
    console.error("Error checking guest usage:", error);
    // In case of error, allow the analysis but log the issue
    return {
      allowed: false,
      message: "Unable to verify guest usage. Please try again or login.",
    };
  }
};

/**
 * Create new guest analytics entry
 */
const createGuestEntry = async (
  guestId: string,
  ipAddress: string,
  macAddress?: string,
  userAgent?: string
): Promise<void> => {
  const query = `
    INSERT INTO guest_usage (id, ip_address, mac_address, user_agent, analysis_count)
    VALUES ($1, $2, $3, $4, 1)
  `;

  await pool.query(query, [guestId, ipAddress, macAddress, userAgent]);
};

/**
 * Increment guest usage count
 */
const incrementGuestUsage = async (guestId: string): Promise<void> => {
  const query = `
    UPDATE guest_usage
    SET analysis_count = analysis_count + 1,
        last_analysis_at = NOW()
    WHERE id = $1
  `;

  await pool.query(query, [guestId]);
};

/**
 * Get guest analytics by ID
 */
export const getGuestById = async (
  guestId: string
): Promise<GuestAnalytics | null> => {
  const query = `
    SELECT id, ip_address, mac_address, user_agent, analysis_count,
           last_analysis_at, created_at, updated_at
    FROM guest_usage
    WHERE id = $1
  `;

  try {
    const result = await pool.query(query, [guestId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error fetching guest by ID:", error);
    throw new Error("Failed to fetch guest data");
  }
};

/**
 * Cleanup old guest entries (older than 30 days)
 */
export const cleanupOldGuestEntries = async (): Promise<void> => {
  const query = `
    DELETE FROM guest_usage
    WHERE last_analysis_at < NOW() - INTERVAL '30 days'
  `;

  try {
    const result = await pool.query(query);
    console.log(`Cleaned up ${result.rowCount} old guest entries`);
  } catch (error) {
    console.error("Error cleaning up old guest entries:", error);
  }
};
