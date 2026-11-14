import express from 'express';
import { requireRole } from '../middleware/auth.js';
import { collegeApi } from '../services/collegeApi.js';
import { academicService } from '../services/academicService.js';

const router = express.Router();

router.get('/drives', async (req, res, next) => {
  try {
    const data = await collegeApi.getPlacementDrives(req.token);
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

router.get('/evaluations', requireRole(['student']), async (req, res, next) => {
  try {
    const data = await academicService.evaluatePlacementEligibility(req.token);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireRole(['student']), async (req, res, next) => {
  try {
    const data = await collegeApi.getMyPlacements(req.token);
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

router.post('/drives/:id/register', requireRole(['student']), async (req, res, next) => {
  try {
    // 1. Verify eligibility with academicService single source of truth
    const evalResult = await academicService.evaluatePlacementEligibility(req.token);
    const driveEval = evalResult.evaluations?.find(e => e.id === Number(req.params.id));
    if (driveEval && !driveEval.is_eligible) {
      return res.status(400).json({
        error: {
          code: 'PLACEMENT_INELIGIBLE',
          message: `Ineligible for ${driveEval.company}: ${driveEval.criteria_failed.join('. ')}`,
        },
      });
    }

    const result = await collegeApi.registerPlacementDrive(req.token, req.params.id);
    res.json(result.data);
  } catch (err) {
    res.status(err.statusCode || 400).json({
      error: { code: 'PLACEMENT_REGISTRATION_FAILED', message: err.message },
    });
  }
});

export default router;

