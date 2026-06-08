export type ReportType = 'SURVEY' | 'CUSTOMER' | 'SALES';

export interface ReportRecord {
  id: string;
  projectId: string;
  reportType: ReportType;
  filename: string;
  fileSize: number | null;
  pageCount?: number;
  generatedAt: string;
  downloadUrl: string;
}

export const REPORT_TYPE_OPTIONS: Array<{ value: ReportType; label: string; description: string }> =
  [
    { value: 'SURVEY', label: '調査版', description: '社内技術記録（T-01〜T-06）' },
    { value: 'CUSTOMER', label: '提出版', description: '顧客提出用（T-01〜T-05）' },
    { value: 'SALES', label: '提案版', description: '営業提案用（T-06 + T-07 含む）' },
  ];
