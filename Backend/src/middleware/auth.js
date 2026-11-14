import { collegeApi } from '../services/collegeApi.js';

export async function extractUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.kit_token) {
      token = req.cookies.kit_token;
    }

    if (token) {
      try {
        const userRes = await collegeApi.getMe(token);
        req.token = token;
        req.user = userRes.data;
        req.userRole = userRes.data.role; // 'student' or 'teacher'
        return next();
      } catch (err) {
        console.warn('[AuthMiddleware] Token invalid or expired:', err.message);
      }
    }

    // Default to visitor
    req.token = null;
    req.user = null;
    req.userRole = 'visitor';
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN_ROLE',
          message: `Access denied. Role '${req.userRole || 'visitor'}' is not authorized to access this resource.`,
        },
      });
    }
    next();
  };
}

