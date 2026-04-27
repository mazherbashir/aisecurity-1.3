import { describe, expect, it } from 'vitest';
import { getGraderById } from '../../src/redteam/graders';
import { AegisGrader } from '../../src/redteam/plugins/aegis';
import { AsciiSmugglingGrader } from '../../src/redteam/plugins/asciiSmuggling';
import { BeavertailsGrader } from '../../src/redteam/plugins/beavertails';
import { BiasGrader } from '../../src/redteam/plugins/bias';
import { FinancialCalculationErrorPluginGrader } from '../../src/redteam/plugins/financial/financialCalculationError';
import { FinancialComplianceViolationPluginGrader } from '../../src/redteam/plugins/financial/financialComplianceViolation';
import { FinancialDataLeakagePluginGrader } from '../../src/redteam/plugins/financial/financialDataLeakage';
import { FinancialHallucinationPluginGrader } from '../../src/redteam/plugins/financial/financialHallucination';
import { FinancialSycophancyPluginGrader } from '../../src/redteam/plugins/financial/financialSycophancy';
import {
  HarmfulGrader,
  MisinformationDisinformationGrader,
} from '../../src/redteam/plugins/harmful/graders';
import { MCPPluginGrader } from '../../src/redteam/plugins/mcp';
import { MedicalAnchoringBiasPluginGrader } from '../../src/redteam/plugins/medical/medicalAnchoringBias';
import { MedicalHallucinationPluginGrader } from '../../src/redteam/plugins/medical/medicalHallucination';
import { OffTopicPluginGrader } from '../../src/redteam/plugins/offTopic';
import { PlinyGrader } from '../../src/redteam/plugins/pliny';
import { ToolDiscoveryGrader } from '../../src/redteam/plugins/toolDiscovery';
import { ToxicChatGrader } from '../../src/redteam/plugins/toxicChat';
import { UnsafeBenchGrader } from '../../src/redteam/plugins/unsafebench';

describe('getGraderById', () => {
  it('should return correct grader for valid ID', () => {
    const asciiGrader = getGraderById('aisecurity:redteam:ascii-smuggling');
    expect(asciiGrader).toBeInstanceOf(AsciiSmugglingGrader);

    const beavertailsGrader = getGraderById('aisecurity:redteam:beavertails');
    expect(beavertailsGrader).toBeInstanceOf(BeavertailsGrader);

    const harmfulGrader = getGraderById('aisecurity:redteam:harmful');
    expect(harmfulGrader).toBeInstanceOf(HarmfulGrader);

    const unsafebenchGrader = getGraderById('aisecurity:redteam:unsafebench');
    expect(unsafebenchGrader).toBeInstanceOf(UnsafeBenchGrader);

    const plinyGrader = getGraderById('aisecurity:redteam:pliny');
    expect(plinyGrader).toBeInstanceOf(PlinyGrader);

    const toxicChatGrader = getGraderById('aisecurity:redteam:toxic-chat');
    expect(toxicChatGrader).toBeInstanceOf(ToxicChatGrader);

    const financialCalculationGrader = getGraderById(
      'aisecurity:redteam:financial:calculation-error',
    );
    expect(financialCalculationGrader).toBeInstanceOf(FinancialCalculationErrorPluginGrader);

    const financialComplianceGrader = getGraderById(
      'aisecurity:redteam:financial:compliance-violation',
    );
    expect(financialComplianceGrader).toBeInstanceOf(FinancialComplianceViolationPluginGrader);

    const financialDataLeakageGrader = getGraderById('aisecurity:redteam:financial:data-leakage');
    expect(financialDataLeakageGrader).toBeInstanceOf(FinancialDataLeakagePluginGrader);

    const financialHallucinationGrader = getGraderById('aisecurity:redteam:financial:hallucination');
    expect(financialHallucinationGrader).toBeInstanceOf(FinancialHallucinationPluginGrader);

    const financialSycophancyGrader = getGraderById('aisecurity:redteam:financial:sycophancy');
    expect(financialSycophancyGrader).toBeInstanceOf(FinancialSycophancyPluginGrader);

    const aegisGrader = getGraderById('aisecurity:redteam:aegis');
    expect(aegisGrader).toBeInstanceOf(AegisGrader);

    const mcpGrader = getGraderById('aisecurity:redteam:mcp');
    expect(mcpGrader).toBeInstanceOf(MCPPluginGrader);

    const medicalAnchoringBiasGrader = getGraderById('aisecurity:redteam:medical:anchoring-bias');
    expect(medicalAnchoringBiasGrader).toBeInstanceOf(MedicalAnchoringBiasPluginGrader);

    const medicalHallucinationGrader = getGraderById('aisecurity:redteam:medical:hallucination');
    expect(medicalHallucinationGrader).toBeInstanceOf(MedicalHallucinationPluginGrader);

    const offTopicGrader = getGraderById('aisecurity:redteam:off-topic');
    expect(offTopicGrader).toBeInstanceOf(OffTopicPluginGrader);

    const toolDiscoveryGrader = getGraderById('aisecurity:redteam:tool-discovery');
    expect(toolDiscoveryGrader).toBeInstanceOf(ToolDiscoveryGrader);

    const biasGrader = getGraderById('aisecurity:redteam:bias');
    expect(biasGrader).toBeInstanceOf(BiasGrader);
  });

  it('should return specific grader for misinformation-disinformation', () => {
    const misinformationGrader = getGraderById(
      'aisecurity:redteam:harmful:misinformation-disinformation',
    );
    expect(misinformationGrader).toBeInstanceOf(MisinformationDisinformationGrader);
    expect(misinformationGrader?.id).toBe(
      'aisecurity:redteam:harmful:misinformation-disinformation',
    );
  });

  it('should return harmful grader for IDs starting with aisecurity:redteam:harmful', () => {
    const specificHarmfulGrader = getGraderById('aisecurity:redteam:harmful:specific-type');
    expect(specificHarmfulGrader).toBeInstanceOf(HarmfulGrader);

    const anotherHarmfulGrader = getGraderById('aisecurity:redteam:harmful:another-type');
    expect(anotherHarmfulGrader).toBeInstanceOf(HarmfulGrader);
  });

  it('should return undefined for invalid ID', () => {
    const invalidGrader = getGraderById('invalid-id');
    expect(invalidGrader).toBeUndefined();
  });

  it('should return undefined for empty ID', () => {
    const emptyGrader = getGraderById('');
    expect(emptyGrader).toBeUndefined();
  });
});
