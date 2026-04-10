import { Download, Search, X } from 'lucide-react';
import { Button } from '@app/components/ui/button';
import { Input } from '@app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@app/components/ui/select';

interface FilterBarProps {
  onFilterChange?: (filters: FilterState) => void;
}

interface FilterState {
  target: string;
  severity: string;
  status: string;
  riskCategory: string;
  search: string;
}

const defaultFilters: FilterState = {
  target: 'noahbot',
  severity: '',
  status: 'Open',
  riskCategory: '',
  search: '',
};

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const handleClear = () => {
    if (onFilterChange) {
      onFilterChange(defaultFilters);
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export vulnerabilities');
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Title and count */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Vulnerabilities (10)</h1>
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Target Dropdown */}
        <div className="min-w-[140px]">
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Target
          </label>
          <Select defaultValue={defaultFilters.target}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="noahbot">noahbot</SelectItem>
              <SelectItem value="chatbot-v1">chatbot-v1</SelectItem>
              <SelectItem value="assistant-pro">assistant-pro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Severity Dropdown */}
        <div className="min-w-[140px]">
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Severity
          </label>
          <Select defaultValue={defaultFilters.severity || 'all'}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Dropdown */}
        <div className="min-w-[140px]">
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Status
          </label>
          <Select defaultValue={defaultFilters.status}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="Fixed">Fixed</SelectItem>
              <SelectItem value="Ignored">Ignored</SelectItem>
              <SelectItem value="False Positive">False Positive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Risk Category Dropdown */}
        <div className="min-w-[140px]">
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Risk Category
          </label>
          <Select defaultValue={defaultFilters.riskCategory || 'all'}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="content">Content Safety</SelectItem>
              <SelectItem value="privacy">Privacy</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Input */}
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Vulnerability"
              className="pl-9"
              defaultValue={defaultFilters.search}
            />
          </div>
        </div>

        {/* Clear Button */}
        <Button variant="default" onClick={handleClear} className="bg-blue-600 hover:bg-blue-700">
          <X className="mr-2 size-4" />
          Clear
        </Button>

        {/* Export Icon */}
        <Button variant="outline" size="icon" onClick={handleExport} className="ml-auto">
          <Download className="size-4" />
        </Button>
      </div>
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@app/components/ui/select';
import { Input } from '@app/components/ui/input';
import { Button } from '@app/components/ui/button';
import { Download } from 'lucide-react';

interface FilterBarProps {
  filters: {
    target: string;
    severity: string;
    status: string;
    riskCategory: string;
    search: string;
  };
  onFiltersChange: (filters: any) => void;
  onClear: () => void;
  onExport: () => void;
}

export default function FilterBar({ filters, onFiltersChange, onClear, onExport }: FilterBarProps) {
  const handleChange = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Target Dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Target</label>
        <Select value={filters.target} onValueChange={(value) => handleChange('target', value)}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Select target" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="noahbot">noahbot</SelectItem>
            <SelectItem value="all">All Targets</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Severity Dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Severity</label>
        <Select value={filters.severity} onValueChange={(value) => handleChange('severity', value)}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Status</label>
        <Select value={filters.status} onValueChange={(value) => handleChange('status', value)}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="Fixed">Fixed</SelectItem>
            <SelectItem value="Ignored">Ignored</SelectItem>
            <SelectItem value="False Positive">False Positive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Risk Category Dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Risk Category</label>
        <Select
          value={filters.riskCategory}
          onValueChange={(value) => handleChange('riskCategory', value)}
        >
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="Content Safety">Content Safety</SelectItem>
            <SelectItem value="Privacy">Privacy</SelectItem>
            <SelectItem value="Safety">Safety</SelectItem>
            <SelectItem value="Fairness">Fairness</SelectItem>
            <SelectItem value="Accuracy">Accuracy</SelectItem>
            <SelectItem value="Security">Security</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Vulnerability"
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
          className="w-[200px] h-9"
        />
      </div>

      {/* Clear Button */}
      <Button variant="default" onClick={onClear} className="h-9 bg-blue-600 hover:bg-blue-700">
        Clear
      </Button>

      {/* Export Icon */}
      <Button
        variant="outline"
        size="icon"
        onClick={onExport}
        className="h-9 w-9 ml-auto"
        title="Export"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}
