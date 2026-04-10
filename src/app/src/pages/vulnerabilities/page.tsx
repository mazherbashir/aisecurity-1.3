import { useState } from 'react';

import { Download, Filter } from 'lucide-react';
import { usePageMeta } from '@app/hooks/usePageMeta';
import VulnerabilityList from './components/VulnerabilityList';
import VulnerabilityDetail from './components/VulnerabilityDetail';
import FilterBar from './components/FilterBar';

export interface Vulnerability {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  status: 'open' | 'fixed' | 'ignored' | 'false_positive';
  riskCategory: string;
  target: string;
  firstSeen: string;
  strategies: string[];
  description: string;
}

const mockVulnerabilities: Vulnerability[] = [
  {
    id: '1',
    title: 'Sexual Crime Content',
    severity: 'high',
    status: 'open',
    riskCategory: 'Content Safety',
    target: 'bedrock:us.meta.llama3-1-70b-instruct-v1:0',
    firstSeen: '4/16/2025, 2:31:27 PM',
    strategies: ['ROT13 Encoding', 'Tree-based Optimization'],
    description: 'This target failed the Sexual Crime Content test.',
  },
  {
    id: '2',
    title: 'Privacy Violation',
    severity: 'medium',
    status: 'open',
    riskCategory: 'Privacy',
    target: 'bedrock:us.meta.llama3-1-70b-instruct-v1:0',
    firstSeen: '4/16/2025, 1:15:00 PM',
    strategies: ['Leetspeak Encoding', 'Composite Jailbreaks'],
    description: 'This target failed the Privacy Violation test.',
  },
  {
    id: '3',
    title: 'Self-Harm',
    severity: 'high',
    status: 'open',
    riskCategory: 'Safety',
    target: 'bedrock:us.meta.llama3-1-70b-instruct-v1:0',
    firstSeen: '4/16/2025, 2:31:27 PM',
    strategies: ['ROT13 Encoding', 'Tree-based Optimization', 'Leetspeak Encoding', 'Composite Jailbreaks'],
    description: 'This target failed the Self-Harm test.',
  },
  {
    id: '4',
    title: 'Violence Promotion',
    severity: 'low',
    status: 'fixed',
    riskCategory: 'Content Safety',
    target: 'bedrock:us.meta.llama3-1-70b-instruct-v1:0',
    firstSeen: '4/15/2025, 10:00:00 AM',
    strategies: ['Direct Prompting'],
    description: 'This target failed the Violence Promotion test.',
  },
  {
    id: '5',
    title: 'Discrimination',
    severity: 'medium',
    status: 'ignored',
    riskCategory: 'Fairness',
    target: 'bedrock:us.meta.llama3-1-70b-instruct-v1:0',
    firstSeen: '4/14/2025, 3:45:00 PM',
    strategies: ['Context Manipulation'],
    description: 'This target failed the Discrimination test.',
  },
  {
    id: '6',
    title: 'Misinformation',
    severity: 'high',
    status: 'open',
    riskCategory: 'Accuracy',
    target: 'bedrock:us.meta.llama3-1-70b-instruct-v1:0',
    firstSeen: '4/16/2025, 11:20:00 AM',
    strategies: ['False Authority', 'Fabricated Sources'],
    description: 'This target failed the Misinformation test.',
  },
  {
    id: '7',
    title: 'Jailbreak Success',
    severity: 'high',
    status: 'open',
    riskCategory: 'Security',
    target: 'bedrock:us.meta.llama3-1-70b-instruct-v1:0',
    firstSeen: '4/16/2025, 9:00:00 AM',
    strategies: ['DAN Pattern', 'Role Play'],
    description: 'This target was successfully jailbroken.',
  },
  {
    id: '8',
    title: 'PII Leakage',
    severity: 'medium',
    status: 'open',
    riskCategory: 'Privacy',
    target: 'bedrock:us.meta.llama3-1-70b-instruct-v1:0',
    firstSeen: '4/15/2025, 4:30:00 PM',
    strategies: ['Memory Extraction', 'Training Data Recall'],
    description: 'This target leaked potential PII.',
  },
  {
    id: '9',
    title: 'Toxic Output',
    severity: 'low',
    status: 'false_positive',
    riskCategory: 'Content Safety',
    target: 'bedrock:us.meta.llama3-1-70b-instruct-v1:0',
    firstSeen: '4/14/2025, 2:00:00 PM',
    strategies: ['Adversarial Phrasing'],
    description: 'This target produced potentially toxic output.',
  },
  {
    id: '10',
    title: 'Unauthorized Access',
    severity: 'high',
    status: 'open',
    riskCategory: 'Security',
    target: 'bedrock:us.meta.llama3-1-70b-instruct-v1:0',
    firstSeen: '4/16/2025, 8:15:00 AM',
    strategies: ['Privilege Escalation', 'API Manipulation'],
    description: 'This target attempted unauthorized access.',
  },
];

export default function VulnerabilitiesPage() {
  usePageMeta({
    title: 'Vulnerabilities',
    description: 'View and manage AI model vulnerabilities',
  });

  const [vulnerabilities] = useState<Vulnerability[]>(mockVulnerabilities);
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(
    mockVulnerabilities[0],
  );
  const [filters, setFilters] = useState({
    target: 'noahbot',
    severity: '',
    status: 'Open',
    riskCategory: '',
    search: '',
  });

  const handleClearFilters = () => {
    setFilters({
      target: 'noahbot',
      severity: '',
      status: 'Open',
      riskCategory: '',
      search: '',
    });
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export vulnerabilities');
  };

  const filteredVulnerabilities = vulnerabilities.filter((vuln) => {
    if (filters.severity && vuln.severity !== filters.severity) return false;
    if (filters.status && vuln.status.toLowerCase() !== filters.status.toLowerCase()) return false;
    if (filters.riskCategory && vuln.riskCategory !== filters.riskCategory) return false;
    if (
      filters.search &&
      !vuln.title.toLowerCase().includes(filters.search.toLowerCase()) &&
      !vuln.description.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-foreground">
            Vulnerabilities ({filteredVulnerabilities.length})
          </h1>
        </div>

        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          onClear={handleClearFilters}
          onExport={handleExport}
        />
      </div>

      {/* Main Content - Master-Detail Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column - Vulnerability List */}
        <div className="w-96 border-r border-border overflow-y-auto">
          <VulnerabilityList
            vulnerabilities={filteredVulnerabilities}
            selectedId={selectedVulnerability?.id || null}
            onSelect={setSelectedVulnerability}
          />
        </div>

        {/* Right Column - Detail View */}
        <div className="flex-1 overflow-y-auto bg-background">
          {selectedVulnerability ? (
            <VulnerabilityDetail vulnerability={selectedVulnerability} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a vulnerability to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
