// Scan repository: CRUD and queries for scans
import { ScanRequest, ScanResult, ScanMetadata } from '../types/scan.types';

export async function findById(id: string): Promise<ScanRequest | null> {
  // TODO: Replace with Prisma query
  return null;
}

export async function create(scan: ScanRequest): Promise<ScanRequest> {
  // TODO: Replace with Prisma create
  return scan;
}

export async function update(id: string, updates: Partial<ScanRequest>): Promise<ScanRequest | null> {
  // TODO: Replace with Prisma update
  return null;
}

export async function deleteScan(id: string): Promise<boolean> {
  // TODO: Replace with Prisma delete
  return true;
}

export async function findAll(): Promise<ScanRequest[]> {
  // TODO: Replace with Prisma findMany
  return [];
}

export async function findOldOrFailedScans(daysOld: number): Promise<ScanMetadata[]> {
  // TODO: Replace with query for old/failed scans
  return [];
}
