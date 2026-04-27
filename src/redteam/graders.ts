import { AegisGrader } from './plugins/aegis';
import { REDTEAM_MEMORY_POISONING_PLUGIN_ID } from './plugins/agentic/constants';
import { MemoryPoisoningPluginGrader } from './plugins/agentic/memoryPoisoning';
import { AsciiSmugglingGrader } from './plugins/asciiSmuggling';
import { BeavertailsGrader } from './plugins/beavertails';
import { BflaGrader } from './plugins/bfla';
import { BiasGrader } from './plugins/bias';
import { BolaGrader } from './plugins/bola';
import { CompetitorsGrader } from './plugins/competitors';
import { CoppaGrader } from './plugins/compliance/coppa';
import { FerpaGrader } from './plugins/compliance/ferpa';
import { CcaGrader } from './plugins/contextComplianceAttack';
import { ContractsGrader } from './plugins/contracts';
import { CrossSessionLeakGrader } from './plugins/crossSessionLeak';
import { DataExfilGrader } from './plugins/dataExfil';
import { DebugAccessGrader } from './plugins/debugAccess';
import { DivergentRepetitionGrader } from './plugins/divergentRepetition';
import { EcommerceComplianceBypassGrader } from './plugins/ecommerce/ecommerceComplianceBypass';
import { EcommerceOrderFraudGrader } from './plugins/ecommerce/ecommerceOrderFraud';
import { EcommercePciDssGrader } from './plugins/ecommerce/ecommercePciDss';
import { EcommercePriceManipulationGrader } from './plugins/ecommerce/ecommercePriceManipulation';
import { ExcessiveAgencyGrader } from './plugins/excessiveAgency';
import { FinancialCalculationErrorPluginGrader } from './plugins/financial/financialCalculationError';
import { FinancialComplianceViolationPluginGrader } from './plugins/financial/financialComplianceViolation';
import { FinancialConfidentialDisclosurePluginGrader } from './plugins/financial/financialConfidentialDisclosure';
import { FinancialCounterfactualPluginGrader } from './plugins/financial/financialCounterfactual';
import { FinancialDataLeakagePluginGrader } from './plugins/financial/financialDataLeakage';
import { FinancialDefamationPluginGrader } from './plugins/financial/financialDefamation';
import { FinancialHallucinationPluginGrader } from './plugins/financial/financialHallucination';
import { FinancialImpartialityPluginGrader } from './plugins/financial/financialImpartiality';
import { FinancialJapanFieaSuitabilityPluginGrader } from './plugins/financial/financialJapanFieaSuitability';
import { FinancialMisconductPluginGrader } from './plugins/financial/financialMisconduct';
import { FinancialSoxCompliancePluginGrader } from './plugins/financial/financialSoxCompliance';
import { FinancialSycophancyPluginGrader } from './plugins/financial/financialSycophancy';
import { GoalMisalignmentGrader } from './plugins/goalMisalignment';
import { HallucinationGrader } from './plugins/hallucination';
import { HarmbenchGrader } from './plugins/harmbench';
import {
  ChildExploitationGrader,
  CopyrightViolationGrader,
  CybercrimeGrader,
  GraphicContentGrader,
  HarmfulGrader,
  HarmfulPrivacyGrader,
  HateGrader,
  IllegalActivitiesGrader,
  IllegalDrugsGrader,
  IndiscriminateWeaponsGrader,
  InsultsGrader,
  MisinformationDisinformationGrader,
  NonViolentCrimeGrader,
  ProfanityGrader,
  RadicalizationGrader,
  SelfHarmGrader,
  SexCrimeGrader,
  SexualContentGrader,
  SpecializedAdviceGrader,
  UnsafePracticesGrader,
  ViolentCrimeGrader,
} from './plugins/harmful/graders';
import { HijackingGrader } from './plugins/hijacking';
import { ImitationGrader } from './plugins/imitation';
import { IndirectPromptInjectionGrader } from './plugins/indirectPromptInjection';
import { InsuranceCoverageDiscriminationPluginGrader } from './plugins/insurance/coverageDiscrimination';
import { InsuranceDataDisclosurePluginGrader } from './plugins/insurance/dataDisclosure';
import { InsuranceNetworkMisinformationPluginGrader } from './plugins/insurance/networkMisinformation';
import { InsurancePhiDisclosurePluginGrader } from './plugins/insurance/phiDisclosure';
import { IntentGrader } from './plugins/intent';
import { MCPPluginGrader } from './plugins/mcp';
import { MedicalAnchoringBiasPluginGrader } from './plugins/medical/medicalAnchoringBias';
import { MedicalHallucinationPluginGrader } from './plugins/medical/medicalHallucination';
import { MedicalIncorrectKnowledgePluginGrader } from './plugins/medical/medicalIncorrectKnowledge';
import { MedicalOffLabelUsePluginGrader } from './plugins/medical/medicalOffLabelUse';
import { MedicalPrioritizationErrorPluginGrader } from './plugins/medical/medicalPrioritizationError';
import { MedicalSycophancyPluginGrader } from './plugins/medical/medicalSycophancy';
import { ModelIdentificationGrader } from './plugins/modelIdentification';
import { OffTopicPluginGrader } from './plugins/offTopic';
import { OverrelianceGrader } from './plugins/overreliance';
import { PharmacyControlledSubstanceCompliancePluginGrader } from './plugins/pharmacy/controlledSubstanceCompliance';
import { PharmacyDosageCalculationPluginGrader } from './plugins/pharmacy/dosageCalculation';
import { PharmacyDrugInteractionPluginGrader } from './plugins/pharmacy/drugInteraction';
import { PiiGrader } from './plugins/pii';
import { PlinyGrader } from './plugins/pliny';
import { PolicyViolationGrader } from './plugins/policy/index';
import { PoliticsGrader } from './plugins/politics';
import { PromptExtractionGrader } from './plugins/promptExtraction';
import { RagDocumentExfiltrationGrader } from './plugins/ragDocumentExfiltration';
import { RagSourceAttributionGrader } from './plugins/ragSourceAttribution';
import { RbacGrader } from './plugins/rbac';
import { RealEstateAccessibilityDiscriminationPluginGrader } from './plugins/realestate/accessibilityDiscrimination';
import { RealEstateAdvertisingDiscriminationPluginGrader } from './plugins/realestate/advertisingDiscrimination';
import { RealEstateDiscriminatoryListingsPluginGrader } from './plugins/realestate/discriminatoryListings';
import { RealEstateFairHousingDiscriminationPluginGrader } from './plugins/realestate/fairHousingDiscrimination';
import { RealEstateLendingDiscriminationPluginGrader } from './plugins/realestate/lendingDiscrimination';
import { RealEstateSourceOfIncomePluginGrader } from './plugins/realestate/sourceOfIncome';
import { RealEstateSteeringPluginGrader } from './plugins/realestate/steering';
import { RealEstateValuationBiasPluginGrader } from './plugins/realestate/valuationBias';
import { ReasoningDosGrader } from './plugins/reasoningDos';
import { ReligionGrader } from './plugins/religion';
import { ShellInjectionGrader } from './plugins/shellInjection';
import { SqlInjectionGrader } from './plugins/sqlInjection';
import { SsrfGrader } from './plugins/ssrf';
import { TelecomAccessibilityViolationPluginGrader } from './plugins/telecom/accessibilityViolation';
import { TelecomAccountTakeoverPluginGrader } from './plugins/telecom/accountTakeover';
import { TelecomBillingMisinformationPluginGrader } from './plugins/telecom/billingMisinformation';
import { TelecomCoverageMisinformationPluginGrader } from './plugins/telecom/coverageMisinformation';
import { TelecomCpniDisclosurePluginGrader } from './plugins/telecom/cpniDisclosure';
import { TelecomE911MisinformationPluginGrader } from './plugins/telecom/e911Misinformation';
import { TelecomFraudEnablementPluginGrader } from './plugins/telecom/fraudEnablement';
import { TelecomLawEnforcementRequestHandlingPluginGrader } from './plugins/telecom/lawEnforcementRequestHandling';
import { TelecomLocationDisclosurePluginGrader } from './plugins/telecom/locationDisclosure';
import { TelecomPortingMisinformationPluginGrader } from './plugins/telecom/portingMisinformation';
import { TelecomTcpaViolationPluginGrader } from './plugins/telecom/tcpaViolation';
import { TelecomUnauthorizedChangesPluginGrader } from './plugins/telecom/unauthorizedChanges';
import { ToolDiscoveryGrader } from './plugins/toolDiscovery';
import { ToxicChatGrader } from './plugins/toxicChat';
import { UnsafeBenchGrader } from './plugins/unsafebench';
import { UnverifiableClaimsGrader } from './plugins/unverifiableClaims';
import { VLGuardGrader } from './plugins/vlguard';
import { VLSUGrader } from './plugins/vlsu';
import { WordplayGrader } from './plugins/wordplay';

import type { RedteamGraderBase } from './plugins/base';
import type { RedteamAssertionTypes } from './types';

export const GRADERS: Record<RedteamAssertionTypes, RedteamGraderBase> = {
  [REDTEAM_MEMORY_POISONING_PLUGIN_ID]: new MemoryPoisoningPluginGrader(),
  'aisecurity:redteam:aegis': new AegisGrader(),
  'aisecurity:redteam:ascii-smuggling': new AsciiSmugglingGrader(),
  'aisecurity:redteam:beavertails': new BeavertailsGrader(),
  'aisecurity:redteam:bfla': new BflaGrader(),
  'aisecurity:redteam:bias': new BiasGrader(),
  'aisecurity:redteam:bias:age': new BiasGrader(),
  'aisecurity:redteam:bias:disability': new BiasGrader(),
  'aisecurity:redteam:bias:gender': new BiasGrader(),
  'aisecurity:redteam:bias:race': new BiasGrader(),
  'aisecurity:redteam:bola': new BolaGrader(),
  'aisecurity:redteam:cca': new CcaGrader(),
  'aisecurity:redteam:competitors': new CompetitorsGrader(),
  'aisecurity:redteam:contracts': new ContractsGrader(),
  'aisecurity:redteam:coppa': new CoppaGrader(),
  'aisecurity:redteam:cross-session-leak': new CrossSessionLeakGrader(),
  'aisecurity:redteam:data-exfil': new DataExfilGrader(),
  'aisecurity:redteam:debug-access': new DebugAccessGrader(),
  'aisecurity:redteam:divergent-repetition': new DivergentRepetitionGrader(),
  'aisecurity:redteam:ecommerce:compliance-bypass': new EcommerceComplianceBypassGrader(),
  'aisecurity:redteam:ecommerce:order-fraud': new EcommerceOrderFraudGrader(),
  'aisecurity:redteam:ecommerce:pci-dss': new EcommercePciDssGrader(),
  'aisecurity:redteam:ecommerce:price-manipulation': new EcommercePriceManipulationGrader(),
  'aisecurity:redteam:excessive-agency': new ExcessiveAgencyGrader(),
  'aisecurity:redteam:ferpa': new FerpaGrader(),
  'aisecurity:redteam:financial:calculation-error': new FinancialCalculationErrorPluginGrader(),
  'aisecurity:redteam:financial:compliance-violation':
    new FinancialComplianceViolationPluginGrader(),
  'aisecurity:redteam:financial:confidential-disclosure':
    new FinancialConfidentialDisclosurePluginGrader(),
  'aisecurity:redteam:financial:counterfactual': new FinancialCounterfactualPluginGrader(),
  'aisecurity:redteam:financial:data-leakage': new FinancialDataLeakagePluginGrader(),
  'aisecurity:redteam:financial:defamation': new FinancialDefamationPluginGrader(),
  'aisecurity:redteam:financial:hallucination': new FinancialHallucinationPluginGrader(),
  'aisecurity:redteam:financial:impartiality': new FinancialImpartialityPluginGrader(),
  'aisecurity:redteam:financial:japan-fiea-suitability':
    new FinancialJapanFieaSuitabilityPluginGrader(),
  'aisecurity:redteam:financial:misconduct': new FinancialMisconductPluginGrader(),
  'aisecurity:redteam:financial:sox-compliance': new FinancialSoxCompliancePluginGrader(),
  'aisecurity:redteam:financial:sycophancy': new FinancialSycophancyPluginGrader(),
  'aisecurity:redteam:goal-misalignment': new GoalMisalignmentGrader(),
  'aisecurity:redteam:hallucination': new HallucinationGrader(),
  'aisecurity:redteam:harmbench': new HarmbenchGrader(),
  'aisecurity:redteam:harmful': new HarmfulGrader(),
  'aisecurity:redteam:harmful:chemical-biological-weapons': new HarmfulGrader(),
  'aisecurity:redteam:harmful:child-exploitation': new ChildExploitationGrader(),
  'aisecurity:redteam:harmful:copyright-violations': new CopyrightViolationGrader(),
  'aisecurity:redteam:harmful:cybercrime': new CybercrimeGrader(),
  'aisecurity:redteam:harmful:cybercrime:malicious-code': new CybercrimeGrader(),
  'aisecurity:redteam:harmful:graphic-content': new GraphicContentGrader(),
  'aisecurity:redteam:harmful:harassment-bullying': new HarmfulGrader(),
  'aisecurity:redteam:harmful:hate': new HateGrader(),
  'aisecurity:redteam:harmful:illegal-activities': new IllegalActivitiesGrader(),
  'aisecurity:redteam:harmful:illegal-drugs': new IllegalDrugsGrader(),
  'aisecurity:redteam:harmful:illegal-drugs:meth': new IllegalDrugsGrader(),
  'aisecurity:redteam:harmful:indiscriminate-weapons': new IndiscriminateWeaponsGrader(),
  'aisecurity:redteam:harmful:insults': new InsultsGrader(),
  'aisecurity:redteam:harmful:intellectual-property': new CopyrightViolationGrader(),
  'aisecurity:redteam:harmful:misinformation-disinformation':
    new MisinformationDisinformationGrader(),
  'aisecurity:redteam:harmful:non-violent-crime': new NonViolentCrimeGrader(),
  'aisecurity:redteam:harmful:privacy': new HarmfulPrivacyGrader(),
  'aisecurity:redteam:harmful:profanity': new ProfanityGrader(),
  'aisecurity:redteam:harmful:radicalization': new RadicalizationGrader(),
  'aisecurity:redteam:harmful:self-harm': new SelfHarmGrader(),
  'aisecurity:redteam:harmful:sex-crime': new SexCrimeGrader(),
  'aisecurity:redteam:harmful:sexual-content': new SexualContentGrader(),
  'aisecurity:redteam:harmful:specialized-advice': new SpecializedAdviceGrader(),
  'aisecurity:redteam:harmful:unsafe-practices': new UnsafePracticesGrader(),
  'aisecurity:redteam:harmful:violent-crime': new ViolentCrimeGrader(),
  'aisecurity:redteam:harmful:weapons:ied': new HarmfulGrader(),
  'aisecurity:redteam:hijacking': new HijackingGrader(),
  'aisecurity:redteam:imitation': new ImitationGrader(),
  'aisecurity:redteam:indirect-prompt-injection': new IndirectPromptInjectionGrader(),
  'aisecurity:redteam:insurance:coverage-discrimination':
    new InsuranceCoverageDiscriminationPluginGrader(),
  'aisecurity:redteam:insurance:data-disclosure': new InsuranceDataDisclosurePluginGrader(),
  'aisecurity:redteam:insurance:network-misinformation':
    new InsuranceNetworkMisinformationPluginGrader(),
  'aisecurity:redteam:insurance:phi-disclosure': new InsurancePhiDisclosurePluginGrader(),
  'aisecurity:redteam:intent': new IntentGrader(),
  'aisecurity:redteam:mcp': new MCPPluginGrader(),
  'aisecurity:redteam:model-identification': new ModelIdentificationGrader(),
  'aisecurity:redteam:medical:anchoring-bias': new MedicalAnchoringBiasPluginGrader(),
  'aisecurity:redteam:medical:hallucination': new MedicalHallucinationPluginGrader(),
  'aisecurity:redteam:medical:incorrect-knowledge': new MedicalIncorrectKnowledgePluginGrader(),
  'aisecurity:redteam:medical:off-label-use': new MedicalOffLabelUsePluginGrader(),
  'aisecurity:redteam:medical:prioritization-error': new MedicalPrioritizationErrorPluginGrader(),
  'aisecurity:redteam:medical:sycophancy': new MedicalSycophancyPluginGrader(),
  'aisecurity:redteam:off-topic': new OffTopicPluginGrader(),
  'aisecurity:redteam:pharmacy:controlled-substance-compliance':
    new PharmacyControlledSubstanceCompliancePluginGrader(),
  'aisecurity:redteam:pharmacy:dosage-calculation': new PharmacyDosageCalculationPluginGrader(),
  'aisecurity:redteam:pharmacy:drug-interaction': new PharmacyDrugInteractionPluginGrader(),
  'aisecurity:redteam:telecom:cpni-disclosure': new TelecomCpniDisclosurePluginGrader(),
  'aisecurity:redteam:telecom:location-disclosure': new TelecomLocationDisclosurePluginGrader(),
  'aisecurity:redteam:telecom:account-takeover': new TelecomAccountTakeoverPluginGrader(),
  'aisecurity:redteam:telecom:e911-misinformation': new TelecomE911MisinformationPluginGrader(),
  'aisecurity:redteam:telecom:tcpa-violation': new TelecomTcpaViolationPluginGrader(),
  'aisecurity:redteam:telecom:unauthorized-changes': new TelecomUnauthorizedChangesPluginGrader(),
  'aisecurity:redteam:telecom:fraud-enablement': new TelecomFraudEnablementPluginGrader(),
  'aisecurity:redteam:telecom:porting-misinformation':
    new TelecomPortingMisinformationPluginGrader(),
  'aisecurity:redteam:telecom:billing-misinformation':
    new TelecomBillingMisinformationPluginGrader(),
  'aisecurity:redteam:telecom:coverage-misinformation':
    new TelecomCoverageMisinformationPluginGrader(),
  'aisecurity:redteam:telecom:law-enforcement-request-handling':
    new TelecomLawEnforcementRequestHandlingPluginGrader(),
  'aisecurity:redteam:telecom:accessibility-violation':
    new TelecomAccessibilityViolationPluginGrader(),
  'aisecurity:redteam:realestate:fair-housing-discrimination':
    new RealEstateFairHousingDiscriminationPluginGrader(),
  'aisecurity:redteam:realestate:steering': new RealEstateSteeringPluginGrader(),
  'aisecurity:redteam:realestate:discriminatory-listings':
    new RealEstateDiscriminatoryListingsPluginGrader(),
  'aisecurity:redteam:realestate:lending-discrimination':
    new RealEstateLendingDiscriminationPluginGrader(),
  'aisecurity:redteam:realestate:valuation-bias': new RealEstateValuationBiasPluginGrader(),
  'aisecurity:redteam:realestate:accessibility-discrimination':
    new RealEstateAccessibilityDiscriminationPluginGrader(),
  'aisecurity:redteam:realestate:advertising-discrimination':
    new RealEstateAdvertisingDiscriminationPluginGrader(),
  'aisecurity:redteam:realestate:source-of-income': new RealEstateSourceOfIncomePluginGrader(),
  'aisecurity:redteam:overreliance': new OverrelianceGrader(),
  'aisecurity:redteam:pii': new PiiGrader(),
  'aisecurity:redteam:pii:api-db': new PiiGrader(),
  'aisecurity:redteam:pii:direct': new PiiGrader(),
  'aisecurity:redteam:pii:session': new PiiGrader(),
  'aisecurity:redteam:pii:social': new PiiGrader(),
  'aisecurity:redteam:pliny': new PlinyGrader(),
  'aisecurity:redteam:policy': new PolicyViolationGrader(),
  'aisecurity:redteam:politics': new PoliticsGrader(),
  'aisecurity:redteam:prompt-extraction': new PromptExtractionGrader(),
  'aisecurity:redteam:rag-document-exfiltration': new RagDocumentExfiltrationGrader(),
  'aisecurity:redteam:rag-source-attribution': new RagSourceAttributionGrader(),
  'aisecurity:redteam:rbac': new RbacGrader(),
  'aisecurity:redteam:reasoning-dos': new ReasoningDosGrader(),
  'aisecurity:redteam:religion': new ReligionGrader(),
  'aisecurity:redteam:shell-injection': new ShellInjectionGrader(),
  'aisecurity:redteam:sql-injection': new SqlInjectionGrader(),
  'aisecurity:redteam:ssrf': new SsrfGrader(),
  'aisecurity:redteam:tool-discovery': new ToolDiscoveryGrader(),
  'aisecurity:redteam:toxic-chat': new ToxicChatGrader(),
  'aisecurity:redteam:unsafebench': new UnsafeBenchGrader(),
  'aisecurity:redteam:unverifiable-claims': new UnverifiableClaimsGrader(),
  'aisecurity:redteam:vlguard': new VLGuardGrader(),
  'aisecurity:redteam:vlsu': new VLSUGrader(),
  'aisecurity:redteam:wordplay': new WordplayGrader(),
};

export function getGraderById(id: string): RedteamGraderBase | undefined {
  // Handle null or undefined IDs
  if (!id) {
    return undefined;
  }

  // First try to get the exact grader
  const grader = id in GRADERS ? GRADERS[id as keyof typeof GRADERS] : undefined;

  // If not found but the ID starts with 'aisecurity:redteam:harmful', use the general harmful grader
  if (!grader && id.startsWith('aisecurity:redteam:harmful')) {
    return GRADERS['aisecurity:redteam:harmful'];
  }

  return grader;
}
