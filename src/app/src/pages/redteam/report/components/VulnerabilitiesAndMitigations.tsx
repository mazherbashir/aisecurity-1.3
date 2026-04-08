import { useState } from 'react';

import { Badge } from '@app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@app/components/ui/collapsible';
import { cn } from '@app/lib/utils';
import {
  categoryAliases,
  displayNameOverrides,
  subCategoryDescriptions,
} from '@promptfoo/redteam/constants';
import { getRiskCategorySeverityMap } from '@promptfoo/redteam/sharedFrontend';
import { ChevronDown, ShieldAlert } from 'lucide-react';
import type { Plugin as PluginType } from '@promptfoo/redteam/constants';
import type { RedteamPluginObject } from '@promptfoo/redteam/types';
import type { GradingResult } from '@promptfoo/types';

interface VulnerabilitiesAndMitigationsProps {
  failuresByPlugin: Record<
    string,
    { prompt: string; output: string; gradingResult?: GradingResult }[]
  >;
  plugins: (string | RedteamPluginObject)[];
}

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'informational'];

const SEVERITY_BADGE: Record<Severity, string> = {
  critical:
    'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800/50',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800/50',
  medium:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
  informational:
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
};

/**
 * Actionable mitigation guidance keyed by plugin ID.
 * Covers the most commonly-tested redteam plugins.
 */
const MITIGATIONS: Partial<Record<string, string[]>> = {
  'prompt-injection': [
    'Separate system instructions from user input using dedicated channels or strict delimiters that the model is trained to respect.',
    'Validate and sanitize all user-provided content before it reaches the model context.',
    'Add an output-review layer that flags responses containing signs of instruction override.',
  ],
  'indirect-prompt-injection': [
    'Never pass untrusted external content (web pages, emails, documents) directly into the model context without sanitization.',
    'Strip or flag embedded instruction-like patterns from third-party content before use.',
    'Apply a content-integrity check when fetching external data at runtime.',
  ],
  jailbreak: [
    'Apply a safety classifier (e.g., Llama Guard, OpenAI Moderation API) as an independent output gate.',
    'Use Constitutional AI or RLHF fine-tuning to reinforce policy boundaries.',
    'Implement rate-limiting and anomaly detection on unusual prompt patterns.',
  ],
  'excessive-agency': [
    'Enforce the principle of least privilege: grant the model only the minimum tool permissions it needs.',
    'Require explicit human-in-the-loop confirmation before any irreversible or high-impact action.',
    'Log and audit all agentic actions and alert on policy-violating operation attempts.',
  ],
  hallucination: [
    'Ground responses with Retrieval-Augmented Generation (RAG) from verified, authoritative sources.',
    'Add a confidence-scoring layer and surface uncertainty signals to the user.',
    'Implement automatic fact-checking assertions for claims in high-stakes domains.',
  ],
  'pii:direct': [
    'Deploy a PII detection and redaction layer (e.g., regex + NER) on model outputs before delivery.',
    'Exclude PII from training data and fine-tune with differential privacy techniques.',
    'Scope model access to only the data fields required for the task.',
  ],
  'pii:indirect': [
    'Sanitize training and retrieval corpora to remove indirect identifiers.',
    'Implement output scanning for quasi-identifier combinations that could re-identify individuals.',
    'Apply k-anonymity or differential privacy to any user-derived context injected at runtime.',
  ],
  'pii:session': [
    'Isolate conversation context per session: never carry user data across session boundaries.',
    'Implement automatic context expiry and enforce memory clearing between sessions.',
    'Audit retrieval pipelines for accidental cross-session data leakage.',
  ],
  'pii:social': [
    'Block outputs that enumerate real personal information from social graph data.',
    'Limit model access to aggregate statistics rather than individual-level records.',
    'Add output scanning for name + contact/address combinations.',
  ],
  'cross-session-leak': [
    'Strictly scope context windows to the current user session — no shared memory stores.',
    'Encrypt and isolate session state per user identity.',
    'Test for data bleed regularly using isolated probe accounts.',
  ],
  bola: [
    'Enforce object-level authorization on every API call: verify the requesting user owns the resource.',
    'Never expose internal object IDs directly; use opaque tokens or UUIDs scoped to the user.',
    'Add automated BOLA tests to your CI pipeline using the OWASP API Security checklist.',
  ],
  bfla: [
    'Apply function-level authorization checks server-side, independent of client hints.',
    'Assign roles and permissions at the function level and validate on every invocation.',
    'Audit privileged functions regularly for missing authorization guards.',
  ],
  'debug-access': [
    'Remove or disable all debug endpoints and commands in production builds.',
    'Gate any diagnostic tooling behind strong authentication and audit logging.',
    'Perform regular attack-surface reviews to catch re-introduced debug paths.',
  ],
  rbac: [
    'Implement role-based access control enforced server-side, not in the model prompt.',
    'Never rely on the model to make authorization decisions — enforce them in application middleware.',
    'Regularly review role assignments and audit privilege escalation attempts.',
  ],
  'sql-injection': [
    'Use parameterized queries or prepared statements for all database interactions.',
    'Sanitize any model-generated SQL before execution; prefer an ORM with built-in escaping.',
    'Limit database account permissions to only what the application requires.',
  ],
  'shell-injection': [
    'Avoid passing model-generated strings to shell commands; use safe APIs instead.',
    'If shell execution is necessary, whitelist valid commands and escape all arguments.',
    'Run the application process with the minimum OS privileges required.',
  ],
  hijacking: [
    'Restrict the model to a clearly defined purpose scope and reject off-topic requests explicitly.',
    'Log and alert on requests that deviate significantly from the intended use case.',
    'Use intent-classification as a pre-filter to block misuse attempts early.',
  ],
  competitors: [
    'Add an explicit policy in the system prompt prohibiting competitor mentions.',
    'Implement an output filter that detects and suppresses unauthorized brand references.',
    'Periodically audit outputs for competitor endorsements using automated red-team tests.',
  ],
  contracts: [
    'Explicitly prohibit the model from making commitments, promises, or contractual statements.',
    'Add a post-processing layer that flags legally-binding language for human review.',
    'Train users to treat model output as informational, not contractually binding.',
  ],
  'harmful:hate': [
    'Apply a content moderation classifier (e.g., Perspective API) as an output gate.',
    'Fine-tune the model on curated data that explicitly penalizes hate speech.',
    'Implement reporting mechanisms and human review workflows for flagged content.',
  ],
  'harmful:violence': [
    'Add a violence-detection classifier in the output pipeline before delivery.',
    'Use RLHF to reinforce refusal of violent content generation.',
    'Maintain an escalation path to human moderators for borderline cases.',
  ],
  'harmful:self-harm': [
    'Integrate crisis resource injection — automatically append mental health resources when self-harm topics are detected.',
    'Block or heavily restrict generation of content that could facilitate or encourage self-harm.',
    'Follow safe messaging guidelines from organizations such as AFSP or SAMHSA.',
  ],
  'harmful:cybercrime': [
    'Restrict the model from providing step-by-step technical instructions for exploitation.',
    'Use a code-safety classifier to detect and block malicious payload generation.',
    'Log and alert on requests for hacking tools or techniques.',
  ],
  'harmful:misinformation-disinformation': [
    'Integrate fact-checking via RAG from authoritative sources for factual claims.',
    'Add confidence disclaimers on claims the model cannot verify.',
    'Audit model outputs in high-stakes domains (health, finance, law) for accuracy.',
  ],
  'harmful:specialized-advice': [
    'Add prominent disclaimers when the model ventures into medical, legal, or financial advice.',
    'Restrict the model from providing definitive professional recommendations.',
    'Route users to licensed professionals for high-stakes decisions.',
  ],
  imitation: [
    'Explicitly prohibit impersonation of real individuals or organizations in the system prompt.',
    'Add an entity-recognition output filter that flags outputs mimicking known persons or brands.',
    'Log and audit impersonation attempts for pattern analysis.',
  ],
  overreliance: [
    'Surface uncertainty and limitations explicitly in responses, especially in high-stakes domains.',
    'Design the UX to discourage treating model output as a definitive final answer.',
    'Implement human-in-the-loop review for critical decisions derived from model output.',
  ],
  'data-exfil': [
    'Block model-generated URLs and markdown links that reference external endpoints with sensitive parameters.',
    'Implement strict Content Security Policy headers to prevent unexpected data transmissions.',
    'Audit model tool-use capabilities for data-exfiltration pathways.',
  ],
  'ascii-smuggling': [
    'Normalize and sanitize Unicode input to strip invisible tag characters before processing.',
    'Reject or quarantine inputs containing Unicode Private Use Area or tag block codepoints.',
    'Apply NFC/NFKC normalization to all user input at ingestion.',
  ],
  'agentic:memory-poisoning': [
    'Validate and sanitize all content written to the agent memory store.',
    'Implement integrity checks (e.g., signing or hashing) on memory entries.',
    'Isolate memory namespaces per user and per task to limit blast radius.',
  ],
};

const FALLBACK_MITIGATION = [
  'Review the failing test cases in detail and identify the root cause of each bypass.',
  'Update system prompt guardrails to explicitly address the identified vulnerability pattern.',
  'Add automated regression tests for this category to detect future regressions.',
];

function getDisplayName(pluginId: string): string {
  const overridden = displayNameOverrides[pluginId as PluginType];
  if (overridden) {
    return overridden;
  }
  const aliased = categoryAliases[pluginId as PluginType];
  if (aliased) {
    return aliased;
  }
  return pluginId
    .replace('redteam:', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface VulnerabilityRowProps {
  pluginId: string;
  failCount: number;
  severity: Severity;
  description: string;
  mitigations: string[];
}

function VulnerabilityRow({
  pluginId,
  failCount,
  severity,
  description,
  mitigations,
}: VulnerabilityRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-muted/40 transition-colors">
          <ChevronDown
            className={cn(
              'size-4 flex-shrink-0 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
          <Badge
            className={cn(
              'flex-shrink-0 border text-[11px] font-semibold uppercase tracking-wide',
              SEVERITY_BADGE[severity],
            )}
          >
            {severity}
          </Badge>
          <span className="flex-1 font-medium text-sm">{getDisplayName(pluginId)}</span>
          <span className="flex-shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
            {failCount} {failCount === 1 ? 'failure' : 'failures'}
          </span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mx-1 mb-2 rounded-b-lg border border-t-0 border-border bg-muted/20 px-5 py-4">
          {description && <p className="mb-4 text-sm text-muted-foreground">{description}</p>}
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recommended Mitigations
          </h4>
          <ul className="space-y-2">
            {mitigations.map((m, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-1 size-1.5 flex-shrink-0 rounded-full bg-primary" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function VulnerabilitiesAndMitigations({
  failuresByPlugin,
  plugins,
}: VulnerabilitiesAndMitigationsProps) {
  const failedPluginIds = Object.keys(failuresByPlugin).filter(
    (id) => failuresByPlugin[id].length > 0,
  );

  if (failedPluginIds.length === 0) {
    return null;
  }

  const normalizedPlugins = plugins.map((p) => (typeof p === 'string' ? { id: p } : p));
  const severityMap = getRiskCategorySeverityMap(normalizedPlugins);

  const sorted = [...failedPluginIds].sort((a, b) => {
    const sa = SEVERITY_ORDER.indexOf(
      (severityMap[a as PluginType] as Severity) ?? 'informational',
    );
    const sb = SEVERITY_ORDER.indexOf(
      (severityMap[b as PluginType] as Severity) ?? 'informational',
    );
    if (sa !== sb) {
      return sa - sb;
    }
    return (failuresByPlugin[b]?.length ?? 0) - (failuresByPlugin[a]?.length ?? 0);
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-5 text-destructive" />
          <CardTitle>Vulnerabilities &amp; Mitigations</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {failedPluginIds.length} {failedPluginIds.length === 1 ? 'category' : 'categories'} with
          failures — sorted by severity. Expand each row for remediation guidance.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 pt-2">
        {sorted.map((pluginId) => {
          const severity = (severityMap[pluginId as PluginType] as Severity) ?? 'informational';
          const description = subCategoryDescriptions[pluginId as PluginType] ?? '';
          const mitigations = MITIGATIONS[pluginId] ?? FALLBACK_MITIGATION;
          return (
            <VulnerabilityRow
              key={pluginId}
              pluginId={pluginId}
              failCount={failuresByPlugin[pluginId]?.length ?? 0}
              severity={severity}
              description={description}
              mitigations={mitigations}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
