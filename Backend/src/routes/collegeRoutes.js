import express from 'express';
import crypto from 'node:crypto';
import { collegeApi } from '../services/collegeApi.js';

const router = express.Router();

router.get('/today', async (req, res, next) => {
  try {
    const data = await collegeApi.getToday();
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

router.get('/info', async (req, res, next) => {
  try {
    const data = await collegeApi.getCollegeInfo();
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

router.get('/courses', async (req, res, next) => {
  try {
    const data = await collegeApi.getCourses();
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

router.get('/documents', async (req, res, next) => {
  try {
    const data = await collegeApi.getDocuments();
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

router.get('/documents/:id/file', async (req, res, next) => {
  try {
    const docRes = await collegeApi.downloadDocumentFile(req.params.id);
    const pdfBuffer = Buffer.isBuffer(docRes.data)
      ? docRes.data
      : Buffer.from(docRes.data);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="kit-document-${req.params.id}.pdf"`);
    res.end(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

router.post('/admissions', async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] || crypto.randomUUID();
    const result = await collegeApi.submitAdmissionApplication(req.body, idempotencyKey);
    res.json(result.data);
  } catch (err) {
    res.status(err.statusCode || 400).json({
      error: {
        code: 'ADMISSION_SUBMIT_FAILED',
        message: err.message,
      },
    });
  }
});

export default router;

