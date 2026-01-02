// Broker safety service: handles broker risk, safety status, and activity logging
import { BrokerSafetyStatus, BrokerAnalytics, Broker } from '../types/broker.types';
import * as organizationRepository from '../repositories/organization.repository';

interface BrokerActivity {
  brokerId: string;
  orgId: string;
  route: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const activityLog: BrokerActivity[] = [];
const safetyCache = new Map<string, BrokerSafetyStatus>();

export async function getSafetyStatus(orgId: string): Promise<BrokerSafetyStatus> {
  if (safetyCache.has(orgId)) {
    const cached = safetyCache.get(orgId)!;
    const cacheAge = Date.now() - new Date(cached.lastChecked).getTime();
    if (cacheAge < 5 * 60 * 1000) return cached;
  }

  const analytics = await getAnalytics(orgId);
  let status: 'safe' | 'warning' | 'critical' = 'safe';
  let notes = '';

  if (analytics.avgRiskScore > 70) {
    status = 'critical';
    notes = `High average risk score: ${analytics.avgRiskScore}`;
  } else if (analytics.avgRiskScore > 50 || analytics.flaggedContracts > 5) {
    status = 'warning';
    notes = `Elevated risk: ${analytics.flaggedContracts} flagged contracts`;
  }

  const safetyStatus: BrokerSafetyStatus = {
    brokerId: orgId,
    status,
    lastChecked: new Date().toISOString(),
    notes,
  };

  safetyCache.set(orgId, safetyStatus);
  return safetyStatus;
}

export async function getAnalytics(orgId: string): Promise<BrokerAnalytics> {
  const analyticsData = await organizationRepository.getAnalytics(orgId);
  return {
    brokerId: orgId,
    organizationId: orgId,
    totalDeals: analyticsData?.stats?.totalDeals || 0,
    avgRiskScore: analyticsData?.stats?.avgRiskScore || 0,
    flaggedContracts: analyticsData?.stats?.flaggedContracts || 0,
    lastActive: new Date().toISOString(),
  };
}

export async function logActivity(activity: BrokerActivity): Promise<void> {
  activityLog.push({ ...activity, timestamp: new Date() });
  if (activityLog.length > 1000) activityLog.shift();
  console.log(`[BrokerSafety] Activity: ${activity.brokerId} -> ${activity.route}`);
}

export async function getRecentActivity(brokerId: string, limit = 50): Promise<BrokerActivity[]> {
  return activityLog.filter(a => a.brokerId === brokerId).slice(-limit).reverse();
}

export async function getBrokersWithAlerts(): Promise<Broker[]> {
  const orgs = await organizationRepository.getAll();
  const brokersWithAlerts: Broker[] = [];

  for (const org of orgs) {
    const status = await getSafetyStatus(org.id);
    if (status.status === 'critical' || status.status === 'warning') {
      brokersWithAlerts.push({
        id: org.id,
        name: org.name,
        email: `broker@${org.id}.com`,
        organizationId: org.id,
        active: true,
      });
    }
  }

  return brokersWithAlerts;
}

export function clearSafetyCache(): void {
  safetyCache.clear();
}
