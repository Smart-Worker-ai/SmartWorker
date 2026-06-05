import { verifyToken } from '../services/auth.service.js';

function requireAuth(request, response, next) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return response.status(401).json({ message: 'Authorization header missing.' });
  }
  try {
    request.user = verifyToken(header.slice(7));
    next();
  } catch {
    response.status(401).json({ message: 'Token invalid or expired.' });
  }
}

export { requireAuth };
