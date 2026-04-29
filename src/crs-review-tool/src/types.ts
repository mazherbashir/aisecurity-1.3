export interface Mitigation {
  technique?: string;
  specifics?: string;
  remaining_risk?: string;
  verification?: string;
  date?: string;
  description?: string;
}

export interface SastFinding {
  id: string;
  description: string;
  cwe_id: number | null;
  cwe_name: string;
  cwe_url: string;
  mitigation_information: Mitigation[] | string;
}

export interface ScaFinding {
  id: string;
  cve_id: string;
  version: string | null;
  cvss_score: string;
  cwe_id: string;
  cve_summary: string;
  library_id: string | null;
  mitigation_information: Mitigation[];
  name: string;
}

export type Finding = SastFinding | ScaFinding;

export interface AggregatedGroup {
  groupId: string;
  type: 'SAST' | 'SCA';
  cweId: string | number;
  comments: string;
  description: string;
  records: Finding[];
  aiComment: string;
  status?: 'approved' | 'rejected';
}

export type ToolName = 'Veracode' | 'Checkmarx';

export type AIProvider = 'gemini' | 'azure';
