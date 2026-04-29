/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  RefreshCcw,
  ExternalLink,
  ChevronRight,
  Database,
  Code,
  Settings,
  X
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { SastFinding, ScaFinding, AggregatedGroup, ToolName, AIProvider } from './types';
import { mockSastFindings, mockScaFindings } from './mockData';
import { getAIResponseForComment } from './services/aiService';
import { GroupRow } from './components/GroupRow';

export default function App() {
  const [selectedTools, setSelectedTools] = useState<ToolName[]>([]);
  const [appProfile, setAppProfile] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultsLoaded, setResultsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'SAST' | 'SCA'>('SAST');
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [aggregatedData, setAggregatedData] = useState<{ sast: AggregatedGroup[], sca: AggregatedGroup[] }>({ sast: [], sca: [] });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini');
  const [sastSystemPrompt, setSastSystemPrompt] = useState<string>('');
  const [scaSystemPrompt, setScaSystemPrompt] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const res = await fetch('/api/prompts');
      const data = await res.json();
      setSastSystemPrompt(data.sast);
      setScaSystemPrompt(data.sca);
    } catch (err) {
      console.error('Failed to fetch prompts', err);
    }
  };

  const savePrompts = async () => {
    try {
      await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sast: sastSystemPrompt, sca: scaSystemPrompt }),
      });
      setIsSettingsOpen(false);
    } catch (err) {
      console.error('Failed to save prompts', err);
    }
  };

  const toggleTool = (tool: ToolName) => {
    setSelectedTools(prev => 
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    );
  };

  const aggregateFindings = (findings: any[], type: 'SAST' | 'SCA'): AggregatedGroup[] => {
    const groups: Record<string, AggregatedGroup> = {};

    findings.forEach(finding => {
      let cweId: string | number = '';
      let comments = '';
      let description = (finding as any).description || (finding as any).cve_summary || '';

      if (type === 'SAST') {
        const f = finding as SastFinding;
        cweId = f.cwe_id || 'N/A';
        if (typeof f.mitigation_information === 'string') {
          comments = f.mitigation_information;
        } else if (Array.isArray(f.mitigation_information)) {
          comments = f.mitigation_information
            .map(m => m.specifics || m.description || '')
            .filter(Boolean)
            .join(' | ');
        }
      } else {
        const f = finding as ScaFinding;
        cweId = f.cwe_id || 'N/A';
        if (Array.isArray(f.mitigation_information)) {
          comments = f.mitigation_information
            .map(m => m.specifics || m.description || '')
            .filter(Boolean)
            .join(' | ');
        }
      }

      const groupId = `${type}-${cweId}-${comments}`;

      if (!groups[groupId]) {
        groups[groupId] = {
          groupId,
          type,
          cweId,
          comments,
          description,
          records: [],
          aiComment: '',
        };
      }
      groups[groupId].records.push(finding);
    });

    return Object.values(groups);
  };

  const handleFetchResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTools.length === 0 || !appProfile) return;

    setIsSubmitting(true);
    // Simulate API delay
    setTimeout(() => {
      const sastGroups = aggregateFindings(mockSastFindings, 'SAST');
      const scaGroups = aggregateFindings(mockScaFindings, 'SCA');
      
      setAggregatedData({ sast: sastGroups, sca: scaGroups });
      setResultsLoaded(true);
      setIsSubmitting(false);
    }, 1000);
  };

  const handlePullAIResponse = async (group: AggregatedGroup) => {
    const activePrompt = group.type === 'SAST' ? sastSystemPrompt : scaSystemPrompt;
    const combinedPrompt = `${activePrompt}\n\nDescription: ${group.description}\nMitigation: ${group.comments}`;
    const response = await getAIResponseForComment(combinedPrompt, aiProvider);
    updateGroupAIComment(group.groupId, response);
  };

  const updateGroupAIComment = (groupId: string, newComment: string) => {
    setAggregatedData(prev => ({
      sast: prev.sast.map(g => g.groupId === groupId ? { ...g, aiComment: newComment } : g),
      sca: prev.sca.map(g => g.groupId === groupId ? { ...g, aiComment: newComment } : g),
    }));
  };

  const toggleGroupSelection = (groupId: string) => {
    const next = new Set(selectedGroups);
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    setSelectedGroups(next);
  };

  const toggleGroupExpansion = (groupId: string) => {
    const next = new Set(expandedGroups);
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    setExpandedGroups(next);
  };

  const handleBatchAction = (status: 'approved' | 'rejected') => {
    const affected = activeTab === 'SAST' ? aggregatedData.sast : aggregatedData.sca;
    const selected = affected.filter(g => selectedGroups.has(g.groupId));
    
    if (selected.length === 0) {
      alert('Please select records to ' + status);
      return;
    }

    // Mark as processed in local state
    setAggregatedData(prev => ({
      sast: prev.sast.map(g => selectedGroups.has(g.groupId) ? { ...g, status } : g),
      sca: prev.sca.map(g => selectedGroups.has(g.groupId) ? { ...g, status } : g),
    }));
    
    setSelectedGroups(new Set());
    alert(`Successfully ${status} ${selected.length} groups.`);
  };

  const currentGroups = activeTab === 'SAST' ? aggregatedData.sast : aggregatedData.sca;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 selection:bg-blue-500/30">
      <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-5 h-[calc(100vh-3rem)]">
        
        {/* TOP BAR: Controls */}
        <div className="col-span-12 bento-card p-4 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl">
          <div className="flex gap-8 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Shield size={24} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-black tracking-tight leading-tight">CRS</h1>
                <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">REVIEW_TOOL // v2.4</p>
              </div>
            </div>

            <form onSubmit={handleFetchResults} className="flex gap-4 items-end">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Tool Chain</span>
                <div className="flex gap-2">
                  {(['Veracode', 'Checkmarx'] as ToolName[]).map(tool => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => toggleTool(tool)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        selectedTools.includes(tool) 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Profile</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. app-core-v1"
                  value={appProfile}
                  onChange={(e) => setAppProfile(e.target.value)}
                  className="bento-input w-36 text-[10px] py-1"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">AI Engine</span>
                <select 
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as AIProvider)}
                  className="bento-input text-[10px] py-1 border-slate-700 bg-slate-950 font-bold"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="azure">Azure OpenAI</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || selectedTools.length === 0 || !appProfile}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-6 rounded-lg text-xs transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCcw size={14} className="animate-spin" /> : 'RUN ANALYSIS'}
              </button>
            </form>
          </div>

          <div className="flex items-center gap-4">
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-all ring-1 ring-slate-800 hover:shadow-lg"
                title="System Configuration"
              >
                <Settings size={20} />
              </button>
             <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                   <span className="text-[10px] font-mono text-slate-400 tracking-wider">SYSTEM_READY</span>
                </div>
             </div>
             {resultsLoaded && (
               <button 
                 onClick={() => setResultsLoaded(false)}
                 className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-all"
               >
                 <RefreshCcw size={16} />
               </button>
             )}
          </div>
        </div>

        {!resultsLoaded ? (
          <div className="col-span-12 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
               <div className="w-20 h-20 bg-slate-900 rounded-3xl border border-slate-700 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                 <Search className="text-blue-500" size={32} />
               </div>
               <h2 className="text-2xl font-bold tracking-tight">Access Secure Findings</h2>
               <p className="text-slate-500 text-sm">Select your security scanner and target application profile to initialize the vulnerability audit workflow.</p>
            </div>
          </div>
        ) : (
          <>
            {/* SIDEBAR: Stats */}
            <div className="col-span-3 flex flex-col gap-5 overflow-y-auto pr-1 pb-4">
              <div className="bento-card p-5 bg-slate-900/40">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-6">Threat Distribution</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-[11px] mb-2 font-bold uppercase tracking-wider">
                      <span className="text-slate-400">Critical SAST</span>
                      <span className="text-red-400">{aggregatedData.sast.length} groups</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full w-[65%] rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-2 font-bold uppercase tracking-wider">
                      <span className="text-slate-400">Moderate SCA</span>
                      <span className="text-orange-400">{aggregatedData.sca.length} groups</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-orange-500 h-full w-[40%] rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bento-card bg-blue-600/10 border-blue-500/20 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="text-4xl font-black text-blue-400 mb-1 leading-none">84<span className="text-xl">%</span></span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Compliance Score</span>
              </div>

              <div className="flex-1 bento-card p-5 flex flex-col">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-4">Batch Operations</h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
                    <span className="text-slate-500 block mb-1">SELECTED ENTITIES</span>
                    <span className="text-white font-bold text-lg">{selectedGroups.size}</span>
                  </div>
                  <button
                    onClick={() => handleBatchAction('approved')}
                    disabled={selectedGroups.size === 0}
                    className="w-full py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Approve Selected
                  </button>
                  <button
                    onClick={() => handleBatchAction('rejected')}
                    disabled={selectedGroups.size === 0}
                    className="w-full py-3 bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Reject Selected
                  </button>
                </div>
              </div>
            </div>

            {/* MAIN CONTENT: Findings Table */}
            <div className="col-span-9 bento-card flex flex-col bg-slate-900 border-slate-800">
              <div className="flex border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
                {(['SAST', 'SCA'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-8 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${
                      activeTab === tab 
                        ? 'text-blue-400 bg-blue-500/5' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {tab} Findings
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-500 shadow-[0_-4px_12px_rgba(59,130,246,0.5)]" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-950/40 text-[10px] text-slate-500 font-black uppercase tracking-wider sticky top-0 z-20 backdrop-blur-sm">
                    <tr>
                      <th className="p-4 w-12 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0"
                          onChange={(e) => {
                            if (e.target.checked) {
                              const ids = currentGroups.map(g => g.groupId);
                              setSelectedGroups(new Set(ids));
                            } else {
                              setSelectedGroups(new Set());
                            }
                          }}
                          checked={currentGroups.length > 0 && selectedGroups.size === currentGroups.length}
                        />
                      </th>
                      <th className="p-4 w-20">Qty</th>
                      <th className="p-4 w-40">Identifier</th>
                      <th className="p-4">Context & AI assessment</th>
                      <th className="p-4 w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    <AnimatePresence initial={false}>
                      {currentGroups.map((group) => (
                        <GroupRow 
                          key={group.groupId}
                          group={group}
                          isSelected={selectedGroups.has(group.groupId)}
                          onSelect={() => toggleGroupSelection(group.groupId)}
                          isExpanded={expandedGroups.has(group.groupId)}
                          onToggleExpand={() => toggleGroupExpansion(group.groupId)}
                          onPullAI={() => handlePullAIResponse(group)}
                          onUpdateAIComment={(val) => updateGroupAIComment(group.groupId, val)}
                        />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                {currentGroups.length === 0 && (
                  <div className="py-24 text-center">
                    <Database size={40} className="mx-auto text-slate-800 mb-4" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No active findings in {activeTab}</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                <div className="flex gap-6">
                   <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                     <span>TOTAL: {currentGroups.length}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                     <span>APPROVED: {currentGroups.filter(g => g.status === 'approved').length}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                     <span>REJECTED: {currentGroups.filter(g => g.status === 'rejected').length}</span>
                   </div>
                </div>
                <div className="opacity-50">HEURISTIC_ENGINE // LLM_FLASH_READY</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">AI Analysis Configuration</h2>
                  <p className="text-xs text-slate-500 font-mono mt-1 uppercase tracking-widest">Global System Instructions</p>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-8 overflow-y-auto">
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">SAST Prompt Engine</h3>
                  </div>
                  <textarea
                    value={sastSystemPrompt}
                    onChange={(e) => setSastSystemPrompt(e.target.value)}
                    className="w-full h-48 bg-black/40 border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all resize-none"
                    placeholder="Enter 200-300 lines of prompt context here..."
                  />
                  <p className="text-[10px] text-slate-500 italic">Used for Static Application Security Testing analysis.</p>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">SCA Prompt Engine</h3>
                  </div>
                  <textarea
                    value={scaSystemPrompt}
                    onChange={(e) => setScaSystemPrompt(e.target.value)}
                    className="w-full h-48 bg-black/40 border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none transition-all resize-none"
                    placeholder="Enter software composition instructions..."
                  />
                  <p className="text-[10px] text-slate-500 italic">Used for Third-party library and CVE vulnerability assessment.</p>
                </section>
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                <button 
                  onClick={() => {
                    fetchPrompts(); // Reset
                    setIsSettingsOpen(false);
                  }}
                  className="px-6 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={savePrompts}
                  className="px-8 py-2 bg-white text-black text-sm font-black rounded-xl hover:bg-slate-200 transition-all active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                >
                  SAVE CONFIGURATION
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

