import { verifyToken } from '../utils/auth.js';

// Service authentication token for background services (like Fiscal Print Service)
const SERVICE_AUTH_TOKEN = process.env.SERVICE_AUTH_TOKEN;

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Check for service token first (for background services)
    if (SERVICE_AUTH_TOKEN && token === SERVICE_AUTH_TOKEN) {
      // Service token authenticated - grant full access
      req.user = { 
        id: 'service-account', 
        role: 'admin', 
        isService: true 
      };
      return next();
    }

    // Normal JWT token authentication
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

