import React, { useState, useEffect } from 'react';
import FilterBar from './components/FilterBar';
import VulnerabilityList from './components/VulnerabilityList';
import VulnerabilityDetail from './components/VulnerabilityDetail';
import type { Vulnerability } from './types';

interface ApiVulnerabilityResponse {
  vulnerabilities: Vulnerability[];
  total: number;
}

interface ApiTargetsResponse {
  targets: string[];
  total: number;
}

export default function VulnerabilitiesPage() {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    target: '',
    severity: '',
    status: '',
    riskCategory: '',
    search: '',
  });

  // Fetch vulnerabilities and targets from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [vulnResponse, targetsResponse] = await Promise.all([
          fetch('/api/vulnerabilities'),
          fetch('/api/vulnerabilities/targets'),
        ]);

        if (!vulnResponse.ok) {
          throw new Error('Failed to fetch vulnerabilities');
        }
        if (!targetsResponse.ok) {
          throw new Error('Failed to fetch targets');
        }

        const vulnData: ApiVulnerabilityResponse = await vulnResponse.json();
        const targetsData: ApiTargetsResponse = await targetsResponse.json();

        setVulnerabilities(vulnData.vulnerabilities);
        setTargets(targetsData.targets);
        
        // Select first vulnerability by default
        if (vulnData.vulnerabilities.length > 0) {
          setSelectedVulnerability(vulnData.vulnerabilities[0]);
        }
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter vulnerabilities based on current filters
  const filteredVulnerabilities = vulnerabilities.filter((vuln) => {
    if (filters.target && vuln.target !== filters.target) return false;
    if (filters.severity && vuln.severity !== filters.severity) return false;
    if (filters.status && vuln.status !== filters.status) return false;
    if (filters.riskCategory && vuln.riskCategory !== filters.riskCategory) return false;
    if (
      filters.search &&
      !vuln.title.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      target: '',
      severity: '',
      status: '',
      riskCategory: '',
      search: '',
    });
  };

  const handleExport = () => {
    // Implement export functionality
    console.log('Exporting vulnerabilities...');
  };

  const handleSelectVulnerability = (vulnerability: Vulnerability) => {
    setSelectedVulnerability(vulnerability);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading vulnerabilities...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <FilterBar
        filters={filters}
        targets={targets}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
        onExport={handleExport}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Vulnerability List */}
        <div className="w-96 border-r border-gray-200 bg-white">
          <VulnerabilityList
            vulnerabilities={filteredVulnerabilities}
            selectedId={selectedVulnerability?.id || null}
            onSelect={handleSelectVulnerability}
          />
        </div>

        {/* Right Panel - Detail View */}
        <div className="flex-1 overflow-hidden">
          {selectedVulnerability ? (
            <VulnerabilityDetail vulnerability={selectedVulnerability} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Select a vulnerability to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}