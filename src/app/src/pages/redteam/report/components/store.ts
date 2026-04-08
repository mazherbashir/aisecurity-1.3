import { Severity } from '@promptfoo/redteam/constants';
import { del, get, set } from 'idb-keyval';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';

const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

interface ReportState {
  showUntestedPlugins: boolean;
  setShowUntestedPlugins: (show: boolean) => void;
  pluginPassRateThreshold: number;
  setPluginPassRateThreshold: (threshold: number) => void;
  severityFilter: Severity | null;
  setSeverityFilter: (severity: Severity | null) => void;
  showFrameworkCompliance: boolean;
  setShowFrameworkCompliance: (show: boolean) => void;
  /** When true, Vulnerabilities & Mitigations section respects active category/strategy filters.
   *  Default false — section always shows all findings ordered by severity. */
  vumsRespectFilters: boolean;
  setVumsRespectFilters: (value: boolean) => void;
}

export const useReportStore = create<ReportState>()(
  persist(
    (set) => ({
      showUntestedPlugins: true,
      setShowUntestedPlugins: (show: boolean) => set(() => ({ showUntestedPlugins: show })),
      pluginPassRateThreshold: 1.0,
      setPluginPassRateThreshold: (threshold: number) =>
        set(() => ({ pluginPassRateThreshold: threshold })),
      severityFilter: null,
      setSeverityFilter: (severity: Severity | null) => set(() => ({ severityFilter: severity })),
      showFrameworkCompliance: true,
      setShowFrameworkCompliance: (show: boolean) => set(() => ({ showFrameworkCompliance: show })),
      vumsRespectFilters: false,
      setVumsRespectFilters: (value: boolean) => set(() => ({ vumsRespectFilters: value })),
    }),
    {
      name: 'ReportViewStorage',
      storage: createJSONStorage(() => storage),
    },
  ),
);
