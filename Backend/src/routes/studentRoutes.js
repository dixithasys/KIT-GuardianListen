import express from 'express';
import crypto from 'node:crypto';
import { requireRole } from '../middleware/auth.js';
import { collegeApi } from '../services/collegeApi.js';
import { academicService } from '../services/academicService.js';

const router = express.Router();
router.use(requireRole(['student']));

// Academic Guardian Snapshot
router.get('/snapshot', async (req, res, next) => {
  try {
    const snapshot = await academicService.getAcademicSnapshot(req.token);
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

// Academics info
router.get('/academics', async (req, res, next) => {
  try {
    const data = await collegeApi.getMyAcademics(req.token);
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

// Subjects
router.get('/subjects', async (req, res, next) => {
  try {
    const data = await collegeApi.getMySubjects(req.token);
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

// Attendance summary
router.get('/attendance', async (req, res, next) => {
  try {
    const data = await collegeApi.getMyAttendance(req.token);
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

// Attendance sessions
router.get('/sessions', async (req, res, next) => {
  try {
    const data = await collegeApi.getMyAttendanceSessions(req.token);
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

// Timetable
router.get('/timetable', async (req, res, next) => {
  try {
    const data = await collegeApi.getMyTimetable(req.token);
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

// Calendar
router.get('/calendar', async (req, res, next) => {
  try {
    const data = await collegeApi.getCalendar(req.token);
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

// Attendance What-If Simulator
router.post('/simulate', async (req, res, next) => {
  try {
    const result = await academicService.simulateAbsence(req.token, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Pre-validate leave or OD
router.post('/requests/validate', async (req, res, next) => {
  try {
    const result = await academicService.validateLeaveRequest(req.token, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Student Requests list
router.get('/requests', async (req, res, next) => {
  try {
    const data = await collegeApi.getMyRequests(req.token);
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

// Submit Leave / OD
router.post('/requests', async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] || crypto.randomUUID();
    const result = await collegeApi.createRequest(req.token, req.body, idempotencyKey);
    res.json(result.data);
  } catch (err) {
    res.status(err.statusCode || 400).json({
      error: { code: 'REQUEST_SUBMISSION_FAILED', message: err.message },
    });
  }
});

// Cancel Request
router.post('/requests/:id/cancel', async (req, res, next) => {
  try {
    const result = await collegeApi.cancelRequest(req.token, req.params.id);
    res.json(result.data);
  } catch (err) {
    res.status(err.statusCode || 400).json({
      error: { code: 'CANCEL_FAILED', message: err.message },
    });
  }
});

export default router;

