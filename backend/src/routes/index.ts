import { Router } from 'express';
import authRoutes from './auth.routes';
import billingRoutes from './billing.routes';
import brokerRoutes from './broker.routes';
import brokerSafetyRoutes from './brokserSafety.routes';
import contractRoutes from './contract.routes';
import notificationRoutes from './notification.routes';
import reportRoutes from './report.routes';
import riskRoutes from './risk.routes';
import riskAnalysisRoutes from './riskAnalysis.routes';
import riskHistoryRoutes from './riskHistory.routes';
import riskScoreRoutes from './riskScore.routes';
import scanRoutes from './scan.routes';
import stateRulesRoutes from './StateRules.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/billing', billingRoutes);
router.use('/broker', brokerRoutes);
router.use('/broker-safety', brokerSafetyRoutes);
router.use('/contracts', contractRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/risk', riskRoutes);
router.use('/risk-analysis', riskAnalysisRoutes);
router.use('/risk-history', riskHistoryRoutes);
router.use('/risk-scores', riskScoreRoutes);
router.use('/scans', scanRoutes);
router.use('/state-rules', stateRulesRoutes);

export default router;
