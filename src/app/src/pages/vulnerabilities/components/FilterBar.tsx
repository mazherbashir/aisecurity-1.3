import React from 'react';
import { Download, X } from 'lucide-react';

interface FilterBarProps {
  filters: {
    target: string;
    severity: string;
    status: string;
    riskCategory: string;
    search: string;
  };
  targets: string[];
  onFilterChange: (key: keyof FilterBarProps['filters'], value: string) => void;
  onClear: () => void;
  onExport: () => void;
}

export default function FilterBar({
  filters,
  targets,
  onFilterChange,
  onClear,
  onExport,
}: FilterBarProps) {
  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex flex-col space-y-4">
        {/* Title Row */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            Vulnerabilities ({targets.length > 0 ? '10' : '0'})
          </h1>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Target Dropdown */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Target</label>
            <select
              value={filters.target}
              onChange={(e) => onFilterChange('target', e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Targets</option>
              {targets.map((target) => (
                <option key={target} value={target}>
                  {target}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Dropdown */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => onFilterChange('severity', e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="fixed">Fixed</option>
              <option value="ignored">Ignored</option>
              <option value="false-positive">False Positive</option>
            </select>
          </div>

          {/* Risk Category Dropdown */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Risk Category</label>
            <select
              value={filters.riskCategory}
              onChange={(e) => onFilterChange('riskCategory', e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="content">Content Safety</option>
              <option value="privacy">Privacy</option>
              <option value="security">Security</option>
              <option value="compliance">Compliance</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Vulnerability"
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Clear Button */}
          <button
            onClick={onClear}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Clear
          </button>

          {/* Export Icon */}
          <button
            onClick={onExport}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            title="Export"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}