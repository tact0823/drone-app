export type ReportType = 'SURVEY' | 'CUSTOMER' | 'SALES';

export interface ReportRecord {
  id: string;
  projectId: string;
  userId: string;
  reportType: ReportType;
  filename: string;
  fileSize: number | null;
  generatedAt: string;
  downloadUrl: string;
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  SURVEY: '調査版',
  CUSTOMER: '提出版',
  SALES: '提案版',
};

export const REPORT_FILENAME_SUFFIX: Record<ReportType, string> = {
  SURVEY: '調査版',
  CUSTOMER: '提出版',
  SALES: '提案版',
};
