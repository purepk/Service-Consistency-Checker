import { Router } from 'express';
import * as ctrl from '../controllers/mainController.js';

const router = Router();

// Monitors[cite: 2]
router.get('/monitors', ctrl.getMonitors);
router.post('/monitors', ctrl.createMonitor);
router.put('/monitors/:id', ctrl.updateMonitor);
router.patch('/monitors/:id/active', ctrl.toggleMonitorActive);
router.delete('/monitors/:id', ctrl.deleteMonitor);

// Checks[cite: 2]
router.post('/checks/run', ctrl.runCheck);
router.get('/checks/latest', ctrl.getLatestResults);
router.get('/checks/runs', ctrl.getCheckRuns);

// Incidents & Summary[cite: 2]
router.get('/incidents', ctrl.getIncidents);
router.get('/summary', ctrl.getSummary);

export default router;