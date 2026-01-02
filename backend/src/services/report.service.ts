// Report service: orchestrates report generation and retrieval
import * as reportRepository from '../repositories/report.repository';
import { Report } from '../reports/report.types';

export async function createReport(data: Report): Promise<Report> {
  // TODO: Validate and create report
  return reportRepository.create(data);
}

export async function getReportById(id: string): Promise<Report | null> {
  return reportRepository.findById(id);
}

export async function updateReport(id: string, updates: Partial<Report>): Promise<Report | null> {
  return reportRepository.update(id, updates);
}

export async function deleteReport(id: string): Promise<boolean> {
  return reportRepository.deleteById(id);
}
