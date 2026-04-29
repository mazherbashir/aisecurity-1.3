import { SastFinding, ScaFinding } from './types';

export const mockSastFindings: SastFinding[] = [
  {
    id: "VERA-001",
    description: "This call to org.grails.buffer.GrailsPrintWriter.leftShift() contains a cross-site scripting (XSS) flaw...",
    cwe_id: 80,
    cwe_name: "Improper Neutralization of Script-Related HTML Tags in a Web Page (Basic XSS)",
    cwe_url: "https://api.veracode.com/appsec/v1/cwes/80",
    mitigation_information: [
      {
        technique: "M1 : Establish and maintain control over all of your inputs",
        specifics: "Line 629 is a false positive. The << operator at chart.xAxis.categories << xName appends to an in-memory ArrayList, not to GrailsPrintWriter as Veracode claims...",
        remaining_risk: "None",
        verification: "Manual inspection and testing"
      }
    ]
  },
  {
    id: "VERA-002",
    description: "Another Basic XSS flaw in another location with same mitigation.",
    cwe_id: 80,
    cwe_name: "Improper Neutralization of Script-Related HTML Tags in a Web Page (Basic XSS)",
    cwe_url: "https://api.veracode.com/appsec/v1/cwes/80",
    mitigation_information: [
      {
        technique: "M1 : Establish and maintain control over all of your inputs",
        specifics: "Line 629 is a false positive. The << operator at chart.xAxis.categories << xName appends to an in-memory ArrayList, not to GrailsPrintWriter as Veracode claims...",
        remaining_risk: "None",
        verification: "Manual inspection and testing"
      }
    ]
  },
  {
    id: "VERA-003",
    description: "This call to console.info() could result in a log forging attack...",
    cwe_id: 117,
    cwe_name: "Improper Output Neutralization for Logs",
    cwe_url: "https://api.veracode.com/appsec/v1/cwes/117",
    mitigation_information: ""
  },
  {
    id: "CHECK-001",
    description: "Potential SQL Injection detected in user login flow.",
    cwe_id: 89,
    cwe_name: "Improper Neutralization of Special Elements used in an SQL Command ('SQL Injection')",
    cwe_url: "https://cwe.mitre.org/data/definitions/89.html",
    mitigation_information: "Using prepared statements with parameterized queries for all database interactions."
  }
];

export const mockScaFindings: ScaFinding[] = [
  {
    id: "SCA-001",
    cve_id: "CVE-2016-1000027",
    version: null,
    cvss_score: "9.8",
    cwe_id: "CWE-502",
    cve_summary: "spring-web is vulnerable to remote code execution (RCE). When it is used with external endpoints...",
    library_id: null,
    name: "Spring Web",
    mitigation_information: [
      {
        date: "2026-04-27 05:45:33 UTC",
        description: "The spring-web-5.3.33.jar file is present in the deployed artifact as a transitive dependency ... vulnerability described in CVE-2016-1000027 is not exploitable in our application...",
        remaining_risk: "none",
        verification: "manual inspection and testing"
      }
    ]
  },
  {
    id: "SCA-002",
    cve_id: "CVE-2016-1000027",
    version: null,
    cvss_score: "9.8",
    cwe_id: "CWE-502",
    cve_summary: "Duplicate entry for same vulnerability to test combination.",
    library_id: null,
    name: "Spring Web Other Module",
    mitigation_information: [
      {
        date: "2026-04-27 05:45:33 UTC",
        description: "The spring-web-5.3.33.jar file is present in the deployed artifact as a transitive dependency ... vulnerability described in CVE-2016-1000027 is not exploitable in our application...",
        remaining_risk: "none",
        verification: "manual inspection and testing"
      }
    ]
  }
];
