import { type categoryAliases, categoryAliasesReverse } from '@promptfoo/redteam/constants';
import {
  deserializePolicyIdFromMetric,
  isPolicyMetric,
} from '@promptfoo/redteam/plugins/policy/utils';
import type { EvaluateResult, GradingResult } from '@promptfoo/types';

// TODO(ian): Need a much easier way to get the pluginId (and strategyId) from a result

/**
 * Represents a test with metadata used in red team report components.
 * This interface aligns with the structure expected by getStrategyIdFromTest and getPluginIdFromResult.
 */
export interface TestWithMetadata {
  prompt: string;
  output: string;
  gradingResult?: GradingResult;
  result?: EvaluateResult;
  metadata?: {
    strategyId?: string;
    [key: string]: unknown;
  };
}

export function getStrategyIdFromTest(test: TestWithMetadata): string {
  let id = test.metadata?.strategyId as string | undefined;

  if (!id && test.result?.testCase?.metadata?.strategyId) {
    id = test.result.testCase.metadata.strategyId as string;
  }

  if (id) {
    if (id.includes('iterative:meta')) return 'jailbreak:meta';
    if (id.includes('iterative:tree')) return 'jailbreak:tree';
    if (id.includes('iterative')) return 'jailbreak';
    
    return id.replace(/^promptfoo:redteam:/, '').replace(/^aisecurity:redteam:/, '');
  }

  return 'basic';
}

export function getPluginIdFromResult(result: EvaluateResult): string | null {
  if (
    result.metadata?.pluginId &&
    // Policy plugins are handled separately
    result.metadata.pluginId !== 'policy'
  ) {
    const id = result.metadata.pluginId as string;
    return id.replace(/^promptfoo:redteam:/, '').replace(/^aisecurity:redteam:/, '');
  }


  const harmCategory = result.vars?.harmCategory || result.metadata?.harmCategory;
  if (harmCategory) {
    return categoryAliasesReverse[harmCategory as keyof typeof categoryAliases];
  }

  const metricNames =
    result.gradingResult?.componentResults?.map((result) => result.assertion?.metric) || [];

  for (const metric of metricNames) {
    if (!metric) {
      continue;
    }

    // Parse and return the policy ID from the policy metric
    if (isPolicyMetric(metric)) {
      return deserializePolicyIdFromMetric(metric);
    }

    const metricParts = metric.split('/');
    const baseName = metricParts[0];

    if (baseName && categoryAliasesReverse[baseName as keyof typeof categoryAliases]) {
      return categoryAliasesReverse[baseName as keyof typeof categoryAliases];
    }
  }

  return null;
}

export const getPassRateStyles = (passRate: number): { bg: string; text: string } => {
  if (passRate >= 0.9) {
    return {
      bg: 'bg-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
    };
  }
  if (passRate >= 0.7) {
    return {
      bg: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
    };
  }
  if (passRate >= 0.5) {
    return {
      bg: 'bg-orange-500',
      text: 'text-orange-600 dark:text-orange-400',
    };
  }
  return {
    bg: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
  };
};
