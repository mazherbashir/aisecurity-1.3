import { useState } from 'react';

import FilterBar from './components/FilterBar';
import VulnerabilityDetail from './components/VulnerabilityDetail';
import VulnerabilityList, { type VulnerabilityItem } from './components/VulnerabilityList';

const defaultVulnerabilities: VulnerabilityItem[] = [
  {
    id: '1',
    title: 'Sexual Crime Content',
    severity: 'high',
    status: 'open',
    subtitle: 'Status: open | Severity: high',
  },
  {
    id: '2',
    title: 'Privacy Violation',
    severity: 'high',
    status: 'open',
    subtitle: 'Status: open | Severity: high',
  },
  {
    id: '3',
    title: 'Self-Harm',
    severity: 'high',
    status: 'open',
    subtitle: 'Status: open | Severity: high',
  },
  {
    id: '4',
    title: 'Violence Promotion',
    severity: 'medium',
    status: 'open',
    subtitle: 'Status: open | Severity: medium',
  },
  {
    id: '5',
    title: 'Hate Speech',
    severity: 'high',
    status: 'fixed',
    subtitle: 'Status: fixed | Severity: high',
  },
  {
    id: '6',
    title: 'Harassment',
    severity: 'medium',
    status: 'open',
    subtitle: 'Status: open | Severity: medium',
  },
  {
    id: '7',
    title: 'Misinformation',
    severity: 'low',
    status: 'ignored',
    subtitle: 'Status: ignored | Severity: low',
  },
  {
    id: '8',
    title: 'Bias Detection',
    severity: 'medium',
    status: 'open',
    subtitle: 'Status: open | Severity: medium',
  },
  {
    id: '9',
    title: 'Jailbreak Vulnerability',
    severity: 'high',
    status: 'false-positive',
    subtitle: 'Status: false-positive | Severity: high',
  },
  {
    id: '10',
    title: 'Prompt Injection',
    severity: 'low',
    status: 'open',
    subtitle: 'Status: open | Severity: low',
  },
];

export default function VulnerabilitiesPage() {
  const [selectedVulnerability, setSelectedVulnerability] = useState<VulnerabilityItem | null>(
    defaultVulnerabilities[0],
  );

  const handleSelectVulnerability = (item: VulnerabilityItem) => {
    setSelectedVulnerability(item);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header & Filter Bar */}
      <div className="border-b border-border bg-card px-6 py-4">
        <FilterBar />
      </div>

      {/* Main Content Area - Master-Detail Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column - Vulnerability List */}
        <div className="w-80 border-r border-border bg-card">
          <VulnerabilityList
            items={defaultVulnerabilities}
            selectedId={selectedVulnerability?.id}
            onSelect={handleSelectVulnerability}
          />
        </div>

        {/* Right Column - Detail View */}
        <div className="flex-1 overflow-y-auto bg-card">
          <VulnerabilityDetail item={selectedVulnerability} />
        </div>
      </div>
    </div>
  );
}
