import { useEffect, useMemo, useState } from 'react';

import { Button } from '@app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';
import { Spinner } from '@app/components/ui/spinner';
import { usePageMeta } from '@app/hooks/usePageMeta';
import { cn } from '@app/lib/utils';
import { callApi } from '@app/utils/api';
import { getRiskCategorySeverityMap } from '@promptfoo/redteam/sharedFrontend';
import { ResultFailureReason } from '@promptfoo/types';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Printer,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { getSeverityColor } from '../../redteam/report/utils/color';
import type { Plugin as PluginType } from '@promptfoo/redteam/constants';
import type { ResultLightweightWithLabel, ResultsFile, SharedResults } from '@promptfoo/types';

interface ExecutiveReportProps {
  evalId?: string | null;
}

export default function ExecutiveReport({ evalId: propEvalId }: ExecutiveReportProps) {
  const navigate = useNavigate();
  const [evalId, setEvalId] = useState<string | null>(propEvalId || null);
  const [evalData, setEvalData] = useState<ResultsFile | null>(null);

  usePageMeta({
    title: 'Executive Risk Dashboard',
    description: 'Concise executive red team results',
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    const fetchEvalById = async (id: string) => {
      const resp = await callApi(`/results/${id}`, { cache: 'no-store' });
      const body = (await resp.json()) as SharedResults;
      setEvalData(body.data);
    };

    const id = searchParams.get('evalId');
    if (id) {
      setEvalId(id);
      fetchEvalById(id);
    } else {
      const fetchLatestEvalId = async () => {
        try {
          const resp = await callApi('/results', { cache: 'no-store' });
          if (resp.ok) {
            const body = (await resp.json()) as { data: ResultLightweightWithLabel[] };
            if (body.data && body.data.length > 0) {
              const latestEvalId = body.data[0].evalId;
              setEvalId(latestEvalId);
              fetchEvalById(latestEvalId);
            }
          }
        } catch (error) {
          console.error('Error fetching latest eval:', error);
        }
      };
      fetchLatestEvalId();
    }
  }, []);

  const stats = useMemo(() => {
    if (!evalData) {
      return { total: 0, pass: 0, fail: 0, failRate: 0, totalProbes: 0 };
    }
    let total = 0,
      pass = 0,
      fail = 0,
      totalProbes = 0;
    evalData.results.results.forEach((r) => {
      // Ignore API errors or syntax errors that shouldn't count towards security posture
      if (r.error && r.failureReason === ResultFailureReason.ERROR) {
        return;
      }

      totalProbes++; // Every execution against ANY target/baseline counts as a system probe

      // Explicitly focus only on the Primary Target (index 0)
      if (
        evalData.version >= 4 &&
        evalData.prompts &&
        evalData.prompts.length > 1 &&
        r.promptIdx !== 0
      ) {
        return;
      }

      total++;
      if (r.success && r.gradingResult?.pass !== false) {
        pass++;
      } else {
        fail++;
      }
    });
    return {
      total,
      totalProbes,
      pass,
      fail,
      failRate: total > 0 ? (fail / total) * 100 : 0,
    };
  }, [evalData]);

  const pluginChartData = useMemo(() => {
    if (!evalData) {
      return [];
    }

    // Resolve custom plugin severities if any
    const severityMap = getRiskCategorySeverityMap(evalData.config?.redteam?.plugins);

    const counts: Record<string, { pass: number; fail: number }> = {};
    evalData.results.results.forEach((r) => {
      if (r.error && r.failureReason === ResultFailureReason.ERROR) {
        return;
      }

      // Explicitly focus only on the Primary Target (index 0)
      if (
        evalData.version >= 4 &&
        evalData.prompts &&
        evalData.prompts.length > 1 &&
        r.promptIdx !== 0
      ) {
        return;
      }

      const pluginId =
        r.testCase?.metadata?.pluginId || r.gradingResult?.metadata?.pluginId || 'Unknown';
      if (!counts[pluginId]) {
        counts[pluginId] = { pass: 0, fail: 0 };
      }

      if (r.success && r.gradingResult?.pass !== false) {
        counts[pluginId].pass++;
      } else {
        counts[pluginId].fail++;
      }
    });

    return Object.keys(counts)
      .map((pluginId) => {
        const severity = severityMap[pluginId as PluginType] || 'informational';
        return {
          fullId: pluginId,
          plugin: pluginId.replace('redteam:', '').substring(0, 15),
          pass: counts[pluginId].pass,
          fail: counts[pluginId].fail,
          total: counts[pluginId].pass + counts[pluginId].fail,
          failRate: (counts[pluginId].fail / (counts[pluginId].pass + counts[pluginId].fail)) * 100,
          fill: getSeverityColor(severity),
        };
      })
      .sort((a, b) => b.failRate - a.failRate)
      .slice(0, 10);
  }, [evalData]);

  const radarData = useMemo(() => {
    if (!pluginChartData) {
      return [];
    }
    return pluginChartData.map((d) => ({
      fullId: d.fullId,
      subject: d.plugin,
      A: d.failRate,
      fullMark: 100,
    }));
  }, [pluginChartData]);

  const failedCategories = useMemo(() => {
    return pluginChartData.filter((d) => d.fail > 0);
  }, [pluginChartData]);

  const riskScore = useMemo(() => {
    if (!evalData) {
      return { score: 0, grade: 'F' as const };
    }

    const severityWeights: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
      informational: 0.5,
    };

    const severityMap = getRiskCategorySeverityMap(evalData.config?.redteam?.plugins);
    const counts: Record<string, { pass: number; fail: number; weight: number }> = {};

    evalData.results.results.forEach((r) => {
      if (r.error && r.failureReason === ResultFailureReason.ERROR) {
        return;
      }
      if (
        evalData.version >= 4 &&
        evalData.prompts &&
        evalData.prompts.length > 1 &&
        r.promptIdx !== 0
      ) {
        return;
      }

      const pluginId =
        r.testCase?.metadata?.pluginId || r.gradingResult?.metadata?.pluginId || 'Unknown';
      if (!counts[pluginId]) {
        const severity = severityMap[pluginId as PluginType] || 'informational';
        counts[pluginId] = { pass: 0, fail: 0, weight: severityWeights[severity] ?? 0.5 };
      }
      if (r.success && r.gradingResult?.pass !== false) {
        counts[pluginId].pass++;
      } else {
        counts[pluginId].fail++;
      }
    });

    const plugins = Object.values(counts);
    if (plugins.length === 0) {
      return { score: 100, grade: 'A' as const };
    }

    let weightedFailSum = 0;
    let totalWeight = 0;
    plugins.forEach(({ pass, fail, weight }) => {
      const total = pass + fail;
      if (total === 0) {
        return;
      }
      weightedFailSum += (fail / total) * weight;
      totalWeight += weight;
    });

    const score = Math.round(100 * (1 - (totalWeight > 0 ? weightedFailSum / totalWeight : 0)));
    const grade =
      score >= 85
        ? ('A' as const)
        : score >= 70
          ? ('B' as const)
          : score >= 55
            ? ('C' as const)
            : score >= 40
              ? ('D' as const)
              : ('F' as const);

    return { score, grade };
  }, [evalData]);

  const gradeConfig = {
    A: {
      circle: 'border-emerald-500 text-emerald-500 bg-emerald-500/10',
      bar: 'bg-emerald-500',
      label: 'Excellent',
    },
    B: {
      circle: 'border-blue-500 text-blue-500 bg-blue-500/10',
      bar: 'bg-blue-500',
      label: 'Good',
    },
    C: {
      circle: 'border-amber-500 text-amber-500 bg-amber-500/10',
      bar: 'bg-amber-500',
      label: 'Moderate Risk',
    },
    D: {
      circle: 'border-orange-500 text-orange-500 bg-orange-500/10',
      bar: 'bg-orange-500',
      label: 'High Risk',
    },
    F: {
      circle: 'border-red-500 text-red-500 bg-red-500/10',
      bar: 'bg-red-500',
      label: 'Critical Risk',
    },
  } as const;

  const handleDrillDown = (categoryId: string) => {
    navigate(`/reports?evalId=${evalId}&category=${encodeURIComponent(categoryId)}`);
  };

  if (!evalData || !evalId) {
    return (
      <div className="flex h-36 flex-col items-center justify-center gap-3">
        <Spinner className="size-5" />
        <span>Loading Executive Dashboard</span>
      </div>
    );
  }

  if (!evalData.config.redteam) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6">
        <Card className="max-w-xl p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 size-16 text-amber-500" />
          <h1 className="mb-6 text-2xl font-bold">Report unavailable</h1>
          <p className="text-muted-foreground">
            The selected evaluation does not contain red team data.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-in fade-in duration-500 print:max-w-full print:px-6 print:py-4">
      <style>{`@page { size: A4 landscape; margin: 1cm; }`}</style>
      <div className="mb-8 flex flex-col justify-between md:flex-row md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Executive Risk Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Dynamic overview of critical vulnerabilities and attack vectors.
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-3 print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 size-4" />
            Save as PDF
          </Button>
          <Button asChild variant="default">
            <Link to={`/reports?evalId=${evalId}`}>
              View Detailed Report <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Security Posture Score */}
      <Card className="mb-8 print:break-inside-avoid">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
            <div
              className={cn(
                'flex size-24 flex-shrink-0 items-center justify-center self-center rounded-full border-4 text-5xl font-black',
                gradeConfig[riskScore.grade].circle,
              )}
            >
              {riskScore.grade}
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-5xl font-bold">{riskScore.score}</span>
                <span className="text-lg text-muted-foreground">/100</span>
                <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Security Posture Score
                </span>
              </div>
              <div className="mb-2 text-sm font-semibold" style={{ color: 'inherit' }}>
                {gradeConfig[riskScore.grade].label}
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    gradeConfig[riskScore.grade].bar,
                  )}
                  style={{ width: `${riskScore.score}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Severity-weighted resistance across all tested attack categories. Higher is better —
                100 means no successful attacks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-8 print:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors flex flex-col print:break-inside-avoid">
          <CardContent className="p-6 pb-4">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="text-primary size-5" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Targeted Attacks
              </h3>
            </div>
            <p className="mt-4 text-4xl font-bold">{stats.total}</p>
            {stats.totalProbes > stats.total && (
              <div className="mt-4 animate-in fade-in">
                <p className="text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wider mb-2">
                  System Scale
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className="bg-primary/10 text-primary/90 border border-primary/20 px-1.5 py-0.5 rounded text-[10px] font-medium"
                    title="Total test executions (probes) across all targets and evaluators."
                  >
                    {stats.totalProbes} Evaluator Probes
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-red-500/20 hover:border-red-500/40 transition-colors flex flex-col print:break-inside-avoid">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="text-red-500 size-5" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Vulnerabilities Found
              </h3>
            </div>
            <p className="mt-4 text-4xl font-bold text-red-500">{stats.fail}</p>
            {failedCategories.length > 0 && (
              <div className="mt-4 animate-in fade-in">
                <p className="text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wider mb-2">
                  Across {failedCategories.length} categor
                  {failedCategories.length === 1 ? 'y' : 'ies'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {failedCategories.slice(0, 3).map((c) => (
                    <span
                      key={c.plugin}
                      className="bg-red-500/10 text-red-500/90 border border-red-500/20 px-1.5 py-0.5 rounded text-[10px] font-medium"
                      title={`${c.fail} vulnerabilities in ${c.plugin}`}
                    >
                      {c.plugin} · {c.fail}
                    </span>
                  ))}
                  {failedCategories.length > 3 && (
                    <span className="text-muted-foreground text-[10px] flex items-center ml-0.5">
                      +{failedCategories.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-green-500/20 hover:border-green-500/40 transition-colors print:break-inside-avoid">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="text-green-500 size-5" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Attacks Defended
              </h3>
            </div>
            <p className="mt-4 text-4xl font-bold text-green-500">{stats.pass}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 text-white print:break-inside-avoid">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="text-amber-400 size-5" />
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Attack Success Rate (ASR)
              </h3>
            </div>
            <p className="mt-4 text-4xl font-bold text-amber-500">{stats.failRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:grid-cols-2">
        {/* Radar Chart */}
        <Card className="p-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-lg">Risk Exposure Profile</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] w-full print:h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid strokeOpacity={0.3} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Attack Success Rate"
                  dataKey="A"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.4}
                  activeDot={{
                    onClick: (_e, payload) =>
                      handleDrillDown(
                        (payload as unknown as { payload: { fullId: string } }).payload.fullId,
                      ),
                    cursor: 'pointer',
                  }}
                />
                <RechartsTooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="p-2 shadow-sm hover:shadow-md transition-shadow print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-lg">Top Deficiencies by Plugin</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] w-full print:h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={300}>
              <BarChart data={pluginChartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="plugin" type="category" width={100} tick={{ fontSize: 12 }} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Bar
                  dataKey="fail"
                  radius={[0, 4, 4, 0]}
                  name="Failures"
                  onClick={(data) =>
                    handleDrillDown((data as unknown as { fullId: string }).fullId)
                  }
                  cursor="pointer"
                >
                  {pluginChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Risks Action Plan */}
      <h2 className="text-2xl font-bold mb-4 mt-12">Immediate Action Plan</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
        {pluginChartData.slice(0, 3).map((risk, idx) => (
          <Card
            key={idx}
            className="relative overflow-hidden border-destructive/30 hover:border-destructive/60 cursor-pointer transition-colors print:break-inside-avoid"
            onClick={() => handleDrillDown(risk.fullId)}
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
            <CardHeader className="pb-2">
              <div className="uppercase tracking-widest text-xs font-bold text-destructive mb-1">
                Priority #{idx + 1}
              </div>
              <CardTitle className="text-lg">{risk.plugin}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                The AI model failed <strong>{risk.fail}</strong> out of {risk.total} tests targeting
                this vulnerability vector.
              </p>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Success Rate:</span>
                <span className="text-destructive">{risk.failRate.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
