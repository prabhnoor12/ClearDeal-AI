// Broker service: Core business logic for broker and agent management
// Handles broker CRUD, team management, agent assignments, and broker-level analytics

import { Broker, Agent, BrokerAnalytics } from '../types/broker.types';
import { ID, Nullable } from '../types/common.types';
import * as organizationRepository from '../repositories/organization.repository';
import { logger } from '../utils/logger';

// --- In-memory stores (TODO: Replace with Prisma) ---
const brokers = new Map<ID, Broker>();
const agents = new Map<ID, Agent>();

// ============================================================================
// Broker CRUD
// ============================================================================

/**
 * Create a new broker
 */
export async function createBroker(data: Omit<Broker, 'id'>): Promise<Broker> {
  const id = generateId();
  const broker: Broker = {
    id,
    ...data,
  };
  brokers.set(id, broker);
  logger.info(`[BrokerService] Created broker: ${id}`);
  return broker;
}

/**
 * Get a broker by ID
 */
export async function getBrokerById(brokerId: ID): Promise<Nullable<Broker>> {
  return brokers.get(brokerId) || null;
}

/**
 * Get all brokers for an organization
 */
export async function getBrokersByOrganization(orgId: ID): Promise<Broker[]> {
  return Array.from(brokers.values()).filter(b => b.organizationId === orgId);
}

/**
 * Update a broker
 */
export async function updateBroker(brokerId: ID, updates: Partial<Omit<Broker, 'id'>>): Promise<Nullable<Broker>> {
  const broker = brokers.get(brokerId);
  if (!broker) {
    return null;
  }
  const updated: Broker = { ...broker, ...updates };
  brokers.set(brokerId, updated);
  logger.info(`[BrokerService] Updated broker: ${brokerId}`);
  return updated;
}

/**
 * Delete a broker (soft delete by setting active = false)
 */
export async function deleteBroker(brokerId: ID): Promise<boolean> {
  const broker = brokers.get(brokerId);
  if (!broker) {
    return false;
  }
  broker.active = false;
  brokers.set(brokerId, broker);
  logger.info(`[BrokerService] Deactivated broker: ${brokerId}`);
  return true;
}

/**
 * Hard delete a broker (permanent removal)
 */
export async function hardDeleteBroker(brokerId: ID): Promise<boolean> {
  const deleted = brokers.delete(brokerId);
  if (deleted) {
    logger.info(`[BrokerService] Hard deleted broker: ${brokerId}`);
  }
  return deleted;
}

// ============================================================================
// Agent CRUD
// ============================================================================

/**
 * Create a new agent under a broker
 */
export async function createAgent(data: Omit<Agent, 'id'>): Promise<Agent> {
  const id = generateId();
  const agent: Agent = {
    id,
    ...data,
  };
  agents.set(id, agent);
  logger.info(`[BrokerService] Created agent: ${id} for broker: ${data.brokerId}`);
  return agent;
}

/**
 * Get an agent by ID
 */
export async function getAgentById(agentId: ID): Promise<Nullable<Agent>> {
  return agents.get(agentId) || null;
}

/**
 * Get all agents for a broker
 */
export async function getAgentsByBroker(brokerId: ID): Promise<Agent[]> {
  return Array.from(agents.values()).filter(a => a.brokerId === brokerId);
}

/**
 * Get all agents for an organization
 */
export async function getAgentsByOrganization(orgId: ID): Promise<Agent[]> {
  return Array.from(agents.values()).filter(a => a.organizationId === orgId);
}

/**
 * Update an agent
 */
export async function updateAgent(agentId: ID, updates: Partial<Omit<Agent, 'id'>>): Promise<Nullable<Agent>> {
  const agent = agents.get(agentId);
  if (!agent) {
    return null;
  }
  const updated: Agent = { ...agent, ...updates };
  agents.set(agentId, updated);
  logger.info(`[BrokerService] Updated agent: ${agentId}`);
  return updated;
}

/**
 * Delete an agent (soft delete)
 */
export async function deleteAgent(agentId: ID): Promise<boolean> {
  const agent = agents.get(agentId);
  if (!agent) {
    return false;
  }
  agent.active = false;
  agents.set(agentId, agent);
  logger.info(`[BrokerService] Deactivated agent: ${agentId}`);
  return true;
}

/**
 * Assign an agent to a broker
 */
export async function assignAgentToBroker(agentId: ID, brokerId: ID): Promise<Nullable<Agent>> {
  const agent = agents.get(agentId);
  const broker = brokers.get(brokerId);
  if (!agent || !broker) {
    return null;
  }
  agent.brokerId = brokerId;
  agents.set(agentId, agent);
  logger.info(`[BrokerService] Assigned agent ${agentId} to broker ${brokerId}`);
  return agent;
}

/**
 * Unassign an agent from their broker
 */
export async function unassignAgentFromBroker(agentId: ID): Promise<Nullable<Agent>> {
  const agent = agents.get(agentId);
  if (!agent) {
    return null;
  }
  delete agent.brokerId;
  agents.set(agentId, agent);
  logger.info(`[BrokerService] Unassigned agent ${agentId} from broker`);
  return agent;
}

// ============================================================================
// Broker Team Analytics
// ============================================================================

/**
 * Get team-level analytics for a broker
 */
export async function getBrokerTeamAnalytics(brokerId: ID): Promise<Nullable<BrokerAnalytics>> {
  const broker = brokers.get(brokerId);
  if (!broker) {
    return null;
  }

  const teamAgents = await getAgentsByBroker(brokerId);
  const orgAnalytics = await organizationRepository.getAnalytics(broker.organizationId);

  // Calculate team-level metrics based on team size and org data
  const teamSize = teamAgents.length;
  const analytics: BrokerAnalytics = {
    brokerId,
    organizationId: broker.organizationId,
    totalDeals: orgAnalytics?.stats?.totalDeals || teamSize * 5, // Estimate if no data
    avgRiskScore: orgAnalytics?.stats?.avgRiskScore || 0,
    flaggedContracts: orgAnalytics?.stats?.flaggedContracts || 0,
    lastActive: new Date().toISOString(),
  };

  return analytics;
}

/**
 * Get team summary for a broker
 */
export async function getBrokerTeamSummary(brokerId: ID): Promise<{
  broker: Nullable<Broker>;
  agentCount: number;
  activeAgentCount: number;
  agents: Agent[];
}> {
  const broker = await getBrokerById(brokerId);
  const teamAgents = await getAgentsByBroker(brokerId);
  
  return {
    broker,
    agentCount: teamAgents.length,
    activeAgentCount: teamAgents.filter(a => a.active).length,
    agents: teamAgents,
  };
}

// ============================================================================
// Organization-Level Broker Operations
// ============================================================================

/**
 * Get all active brokers for an organization
 */
export async function getActiveBrokersByOrganization(orgId: ID): Promise<Broker[]> {
  return Array.from(brokers.values()).filter(b => b.organizationId === orgId && b.active);
}

/**
 * Get broker count for an organization
 */
export async function getBrokerCount(orgId: ID): Promise<number> {
  const orgBrokers = await getBrokersByOrganization(orgId);
  return orgBrokers.length;
}

/**
 * Get agent count for an organization
 */
export async function getAgentCount(orgId: ID): Promise<number> {
  const orgAgents = await getAgentsByOrganization(orgId);
  return orgAgents.length;
}

/**
 * Get organization team overview
 */
export async function getOrganizationTeamOverview(orgId: ID): Promise<{
  organization: Nullable<{ id: ID; name: string }>;
  brokerCount: number;
  agentCount: number;
  activeBrokerCount: number;
  activeAgentCount: number;
}> {
  const org = await organizationRepository.getById(orgId);
  const orgBrokers = await getBrokersByOrganization(orgId);
  const orgAgents = await getAgentsByOrganization(orgId);

  return {
    organization: org ? { id: org.id, name: org.name } : null,
    brokerCount: orgBrokers.length,
    agentCount: orgAgents.length,
    activeBrokerCount: orgBrokers.filter(b => b.active).length,
    activeAgentCount: orgAgents.filter(a => a.active).length,
  };
}

// ============================================================================
// Search & Filtering
// ============================================================================

/**
 * Search brokers by name or email
 */
export async function searchBrokers(orgId: ID, query: string): Promise<Broker[]> {
  const lowerQuery = query.toLowerCase();
  return Array.from(brokers.values()).filter(
    b =>
      b.organizationId === orgId &&
      (b.name.toLowerCase().includes(lowerQuery) || b.email.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Search agents by name or email
 */
export async function searchAgents(orgId: ID, query: string): Promise<Agent[]> {
  const lowerQuery = query.toLowerCase();
  return Array.from(agents.values()).filter(
    a =>
      a.organizationId === orgId &&
      (a.name.toLowerCase().includes(lowerQuery) || a.email.toLowerCase().includes(lowerQuery))
  );
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a broker exists
 */
export async function brokerExists(brokerId: ID): Promise<boolean> {
  return brokers.has(brokerId);
}

/**
 * Check if an agent exists
 */
export async function agentExists(agentId: ID): Promise<boolean> {
  return agents.has(agentId);
}

/**
 * Check if email is already in use by a broker
 */
export async function isBrokerEmailTaken(email: string, excludeBrokerId?: ID): Promise<boolean> {
  return Array.from(brokers.values()).some(
    b => b.email.toLowerCase() === email.toLowerCase() && b.id !== excludeBrokerId
  );
}

/**
 * Check if email is already in use by an agent
 */
export async function isAgentEmailTaken(email: string, excludeAgentId?: ID): Promise<boolean> {
  return Array.from(agents.values()).some(
    a => a.email.toLowerCase() === email.toLowerCase() && a.id !== excludeAgentId
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): ID {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Clear all in-memory data (for testing)
 */
export function clearAllData(): void {
  brokers.clear();
  agents.clear();
  logger.info('[BrokerService] Cleared all broker and agent data');
}

/**
 * Seed demo data (for development/testing)
 */
export async function seedDemoData(orgId: ID): Promise<void> {
  // Create demo broker
  const broker = await createBroker({
    name: 'Demo Broker',
    email: 'broker@demo.com',
    organizationId: orgId,
    active: true,
  });

  // Create demo agents
  await createAgent({
    name: 'Demo Agent 1',
    email: 'agent1@demo.com',
    organizationId: orgId,
    brokerId: broker.id,
    active: true,
  });

  await createAgent({
    name: 'Demo Agent 2',
    email: 'agent2@demo.com',
    organizationId: orgId,
    brokerId: broker.id,
    active: true,
  });

  logger.info(`[BrokerService] Seeded demo data for org: ${orgId}`);
}
