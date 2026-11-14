import express from 'express';
import { collegeApi } from '../services/collegeApi.js';

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { login_id, password } = req.body;
    if (!login_id || !password) {
      return res.status(400).json({
        error: { code: 'MISSING_CREDENTIALS', message: 'Both login ID and password are required.' },
      });
    }

    const loginRes = await collegeApi.login(login_id, password);
    const { access_token, user, expires_in } = loginRes.data;

    // Secure HttpOnly Cookie
    res.cookie('kit_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: (expires_in || 28800) * 1000,
    });

    res.json({
      success: true,
      access_token,
      user,
    });
  } catch (err) {
    res.status(err.statusCode || 401).json({
      error: {
        code: 'AUTH_FAILED',
        message: err.message || 'Invalid username or password.',
      },
    });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('kit_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

router.get('/me', (req, res) => {
  res.json({
    authenticated: Boolean(req.user),
    user: req.user,
    role: req.userRole || 'visitor',
  });
});

export default router;

