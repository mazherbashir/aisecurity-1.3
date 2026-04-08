import React from 'react';

import { Button } from '@app/components/ui/button';
import { Checkbox } from '@app/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import { Label } from '@app/components/ui/label';
import { Switch } from '@app/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@app/components/ui/tooltip';
import { Settings } from 'lucide-react';
import { useReportStore } from './store';

const ReportSettingsDialogButton = () => {
  const {
    showUntestedPlugins,
    setShowUntestedPlugins,
    pluginPassRateThreshold,
    setPluginPassRateThreshold,
    showFrameworkCompliance,
    setShowFrameworkCompliance,
    vumsRespectFilters,
    setVumsRespectFilters,
  } = useReportStore();
  const [open, setOpen] = React.useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // Handle NaN and out-of-range values for display
  const displayThreshold = (() => {
    if (Number.isNaN(pluginPassRateThreshold)) {
      return 'NaN';
    }
    const clampedThreshold = Math.min(1, Math.max(0, pluginPassRateThreshold || 0));
    return (clampedThreshold * 100).toFixed(0);
  })();

  const sliderValue = Number.isNaN(pluginPassRateThreshold)
    ? 0
    : Math.min(1, Math.max(0, pluginPassRateThreshold || 0));

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpen}
            aria-label="settings"
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Report Settings</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="show-untested"
                checked={showUntestedPlugins}
                onCheckedChange={(checked) => setShowUntestedPlugins(checked === true)}
              />
              <Label htmlFor="show-untested" inline className="cursor-pointer">
                Show untested plugins
              </Label>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="plugin-pass-rate">Plugin Pass Rate Threshold</Label>
                <span className="text-sm font-medium text-muted-foreground">
                  {displayThreshold}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Sets the threshold for considering a plugin as passed on the risk cards.
              </p>
              <input
                id="plugin-pass-rate"
                type="range"
                value={sliderValue}
                onChange={(e) => setPluginPassRateThreshold(Number.parseFloat(e.target.value))}
                min={0}
                max={1}
                step={0.05}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-framework-compliance">Show Framework Compliance</Label>
                <Switch
                  id="show-framework-compliance"
                  checked={showFrameworkCompliance}
                  onCheckedChange={setShowFrameworkCompliance}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Toggles the visibility of the Framework Compliance section in the report.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="vums-respect-filters">
                  Vulnerabilities &amp; Mitigations: respect active filters
                </Label>
                <Switch
                  id="vums-respect-filters"
                  checked={vumsRespectFilters}
                  onCheckedChange={setVumsRespectFilters}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                When off (default), Vulnerabilities &amp; Mitigations always shows all findings
                ordered by severity — ideal for printing. When on, it follows the active category
                and strategy filters.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReportSettingsDialogButton;
