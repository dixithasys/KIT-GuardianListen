import express from 'express';
import { requireRole } from '../middleware/auth.js';
import { collegeApi } from '../services/collegeApi.js';

const router = express.Router();
router.use(requireRole(['teacher']));

router.get('/classes', async (req, res, next) => {
  try {
    const data = await collegeApi.getTeacherClasses(req.token);
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

router.get('/requests', async (req, res, next) => {
  try {
    const data = await collegeApi.getTeacherRequests(req.token);
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

router.get('/classes/:class_id/attendance', async (req, res, next) => {
  try {
    const data = await collegeApi.getTeacherClassAttendance(req.token, req.params.class_id);
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

router.post('/requests/:id/approve', async (req, res, next) => {
  try {
    const { comment } = req.body;
    const result = await collegeApi.approveTeacherRequest(req.token, req.params.id, comment);
    res.json(result.data);
  } catch (err) {
    res.status(err.statusCode || 400).json({
      error: { code: 'APPROVE_FAILED', message: err.message },
    });
  }
});

router.post('/requests/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(422).json({
        error: { code: 'MISSING_REASON', message: 'Mandatory reason required for rejection.' },
      });
    }
    const result = await collegeApi.rejectTeacherRequest(req.token, req.params.id, reason);
    res.json(result.data);
  } catch (err) {
    res.status(err.statusCode || 400).json({
      error: { code: 'REJECT_FAILED', message: err.message },
    });
  }
});

export default router;

