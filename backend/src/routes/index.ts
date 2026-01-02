import { Router } from 'express';
import authRoutes from './auth.routes';
import scanRoutes from './scan.routes';
import riskRoutes from './risk.routes';
import reportRoutes from './report.routes';
import brokerRoutes from './broker.routes';
import billingRoutes from './billing.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/scan', scanRoutes);
router.use('/risk', riskRoutes);
router.use('/report', reportRoutes);
router.use('/broker', brokerRoutes);
router.use('/billing', billingRoutes);

export default router;
