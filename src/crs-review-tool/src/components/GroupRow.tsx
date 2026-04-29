import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  RefreshCcw,
  ExternalLink,
  Code,
  Database
} from 'lucide-react';
import { AggregatedGroup } from '../types';

interface GroupRowProps {
  group: AggregatedGroup;
  isSelected: boolean;
  onSelect: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPullAI: () => Promise<void> | void;
  onUpdateAIComment: (val: string) => void;
}

export const GroupRow: React.FC<GroupRowProps> = ({ 
  group, 
  isSelected, 
  onSelect, 
  isExpanded, 
  onToggleExpand, 
  onPullAI, 
  onUpdateAIComment 
}) => {
  const [isPulling, setIsPulling] = useState(false);

  const handlePullAI = async () => {
    setIsPulling(true);
    await onPullAI();
    setIsPulling(false);
  };

  return (
    <tr className={`border-b border-slate-800/30 transition-all ${isSelected ? 'bg-blue-500/5' : 'hover:bg-slate-800/40'}`}>
      <td className="p-4 align-top text-center">
        <input 
          type="checkbox" 
          className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 cursor-pointer"
          checked={isSelected}
          onChange={onSelect}
        />
      </td>
      <td className="p-4 align-top">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-black text-blue-400 font-mono">
            x{group.records.length.toString().padStart(2, '0')}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 max-w-[120px]">
           {group.records.slice(0, 2).map(r => (
             <span key={r.id} className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 border border-slate-800 font-mono">
               {r.id}
             </span>
           ))}
           {group.records.length > 2 && <span className="text-[9px] text-slate-600 font-bold">+{group.records.length - 2}</span>}
        </div>
      </td>
      <td className="p-4 align-top">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-black text-slate-200">
            {group.type === 'SAST' ? 'CWE-' : ''}{group.cweId}
          </span>
          <a href="#" className="text-[10px] text-blue-500 hover:text-blue-400 font-black uppercase tracking-widest flex items-center gap-1 group">
            DETAILS <ExternalLink size={10} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </td>
      <td className="p-4 align-top">
        <div className="space-y-3">
          <div className="relative">
            <div className={`text-[12px] text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800 italic shadow-inner ${!isExpanded ? 'line-clamp-2' : ''}`}>
              {group.comments ? `"${group.comments}"` : <em className="text-slate-600">-- NO CUSTOMER MITIGATION PROVIDED --</em>}
            </div>
            {group.comments && group.comments.length > 80 && (
              <button 
                onClick={onToggleExpand}
                className="text-[9px] font-black text-blue-500 uppercase mt-2 hover:underline flex items-center gap-1 tracking-widest"
              >
                {isExpanded ? <>Collapse View <ChevronUp size={10} /></> : <>Show Full Text <ChevronDown size={10} /></>}
              </button>
            )}
          </div>

          {group.aiComment ? (
            <div className="relative group/ai">
              <textarea
                value={group.aiComment}
                onChange={(e) => onUpdateAIComment(e.target.value)}
                className="w-full p-3 text-[11px] bg-blue-500/5 border border-blue-500/20 rounded-xl text-blue-100 focus:border-blue-500/50 outline-none transition-all min-h-[80px] resize-none leading-relaxed"
                placeholder="AI assessment pending..."
              />
              <div className="absolute right-3 top-3 opacity-30 group-hover/ai:opacity-100 transition-opacity">
                 <Sparkles className="text-blue-400" size={14} />
              </div>
              <button 
                onClick={handlePullAI} 
                className="absolute right-2 bottom-2 p-1.5 bg-slate-900 border border-slate-700 rounded-lg hover:border-blue-500 text-blue-400 transition-all shadow-xl"
                title="Regenerate"
              >
                <RefreshCcw size={12} className={isPulling ? 'animate-spin' : ''} />
              </button>
            </div>
          ) : (
            <button
              onClick={handlePullAI}
              disabled={isPulling}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
            >
              {isPulling ? <RefreshCcw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Pull AI Recommendation
            </button>
          )}
        </div>
      </td>
      <td className="p-4 align-top">
        {group.status ? (
          <div className={`flex items-center gap-1.5 font-black text-[10px] uppercase px-3 py-1.5 rounded-lg border shadow-lg ${
            group.status === 'approved' 
              ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20 shadow-emerald-900/10' 
              : 'bg-red-600/10 text-red-400 border-red-500/20 shadow-red-900/10'
          }`}>
            {group.status === 'approved' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {group.status}
          </div>
        ) : (
           <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest px-3 py-1.5 border border-slate-800 rounded-lg">
             Pending
           </div>
        )}
      </td>
    </tr>
  );
};
