import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import { checkGuestUsage, GuestUsageResult } from "../services/guestService";

export interface AuthRequest extends Request {
  user?: any;
  guestUsage?: GuestUsageResult;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Authentication failed" });
  }
};

/**
 * Authentication middleware that allows guest users with limitations
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  // Try to authenticate user
  if (authHeader) {
    try {
      const token = authHeader.split(" ")[1];
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (!error && user) {
        req.user = user;
        next();
        return;
      }
    } catch (error) {
      // Continue to guest flow
    }
  }

  // Guest user flow
  try {
    const guestUsage = await checkGuestUsage(req);
    req.guestUsage = guestUsage;

    if (!guestUsage.allowed) {
      res.status(429).json({
        error: "Guest limit reached",
        message: guestUsage.message,
        requiresLogin: true
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      error: "Guest verification failed",
      message: "Please login to continue"
    });
  }
};
