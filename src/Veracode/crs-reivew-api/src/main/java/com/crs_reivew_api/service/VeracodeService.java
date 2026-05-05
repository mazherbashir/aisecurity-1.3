package com.crs_reivew_api.service;

import com.crs_reivew_api.config.VeracodeConfig;
import com.crs_reivew_api.dto.VeracodeReportDTO;
import com.crs_reivew_api.model.veracode.*;
import com.veracode.apiwrapper.wrappers.ResultsAPIWrapper;
import com.veracode.apiwrapper.wrappers.UploadAPIWrapper;
import jakarta.xml.bind.JAXBContext;
import jakarta.xml.bind.Unmarshaller;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class VeracodeService {

    @Autowired
    private VeracodeConfig veracodeConfig;

    public String getAppId(String appName) {
        try {
            UploadAPIWrapper uploadWrapper = new UploadAPIWrapper();
            setupCredentials(uploadWrapper);
            String xml = uploadWrapper.getAppList();
            saveXmlToLog("app_list", "all", xml);
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(new InputSource(new StringReader(xml)));
            var nodes = doc.getElementsByTagName("app");
            for (int i = 0; i < nodes.getLength(); i++) {
                var node = nodes.item(i);
                if (node.getAttributes().getNamedItem("app_name").getNodeValue().equals(appName)) {
                    return node.getAttributes().getNamedItem("app_id").getNodeValue();
                }
            }
            throw new RuntimeException("App not found: " + appName);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get App ID", e);
        }
    }

    public String getLatestBuildId(String appId) {
        try {
            UploadAPIWrapper uploadWrapper = new UploadAPIWrapper();
            setupCredentials(uploadWrapper);
            String xml = uploadWrapper.getBuildList(appId);
            saveXmlToLog("build_list", appId, xml);
            debugLog("[" + java.time.LocalDateTime.now() + "] Raw Build List for App ID " + appId + ": " + xml);
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(new InputSource(new StringReader(xml)));
            var nodes = doc.getElementsByTagName("build");
            if (nodes.getLength() > 0) {
                return nodes.item(nodes.getLength() - 1).getAttributes().getNamedItem("build_id").getNodeValue();
            }
            throw new RuntimeException("No builds found for app " + appId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get Build ID", e);
        }
    }

    public VeracodeReport getDetailedReportObject(String buildId) {
        try {
            ResultsAPIWrapper resultsWrapper = new ResultsAPIWrapper();
            setupCredentials(resultsWrapper);
            String xml = resultsWrapper.detailedReport(buildId);
            
            // Save to log file for analysis
            saveXmlToLog("detailed_report", buildId, xml);

            debugLog("[" + java.time.LocalDateTime.now() + "] Detailed Report Snippet: " + (xml.length() > 500 ? xml.substring(0, 500) : xml));
            JAXBContext context = JAXBContext.newInstance(VeracodeReport.class);
            Unmarshaller unmarshaller = context.createUnmarshaller();
            return (VeracodeReport) unmarshaller.unmarshal(new StringReader(xml));
        } catch (Exception e) {
            throw new RuntimeException("Failed to get report object", e);
        }
    }

    private void saveXmlToLog(String prefix, String id, String xml) {
        if (!veracodeConfig.isDebug()) return;
        try {
            String timestamp = new java.text.SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
            java.nio.file.Path logDir = java.nio.file.Paths.get("logs", "veracode");
            java.nio.file.Files.createDirectories(logDir);
            
            String fileName = String.format("%s_%s_%s.xml", prefix, id, timestamp);
            java.nio.file.Files.writeString(logDir.resolve(fileName), xml);
            debugLog("DEBUG: Saved report log to: " + logDir.resolve(fileName));
        } catch (Exception e) {
            System.err.println("Warning: Could not save XML log: " + e.getMessage());
        }
    }

    private void debugLog(String message) {
        if (veracodeConfig.isDebug()) {
            System.out.println(message);
        }
    }

    private void setupCredentials(Object wrapper) {
        String id = veracodeConfig.getKey().getId();
        String secret = veracodeConfig.getKey().getSecret();

        if (id == null || id.isEmpty() || secret == null || secret.isEmpty()) {
            try {
                String home = System.getProperty("user.home");
                java.nio.file.Path credPath = java.nio.file.Paths.get(home, ".veracode", "credentials");
                if (java.nio.file.Files.exists(credPath)) {
                    List<String> lines = java.nio.file.Files.readAllLines(credPath);
                    for (String line : lines) {
                        String trimmed = line.trim();
                        if (trimmed.startsWith("veracode_api_key_id")) {
                            id = trimmed.split("=")[1].trim();
                        } else if (trimmed.startsWith("veracode_api_key_secret")) {
                            secret = trimmed.split("=")[1].trim();
                        }
                    }
                }
            } catch (Exception e) {
                if (veracodeConfig.isDebug()) {
                    System.err.println("DEBUG: Error reading Veracode credentials file: " + e.getMessage());
                }
            }
        }

        if (id == null || id.isEmpty() || secret == null || secret.isEmpty()) {
            throw new RuntimeException("CRITICAL: Veracode credentials not found. Please ensure 'veracode_api_key_id' and 'veracode_api_key_secret' are set in application.properties or your local ~/.veracode/credentials file.");
        }

        try {
            if (wrapper instanceof UploadAPIWrapper) {
                ((UploadAPIWrapper) wrapper).setUpApiCredentials(id, secret);
            } else if (wrapper instanceof ResultsAPIWrapper) {
                ((ResultsAPIWrapper) wrapper).setUpApiCredentials(id, secret);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to set up API credentials using provided keys", e);
        }
    }

    public VeracodeReportDTO getFinalReport(String applicationName, String appId, String buildId, boolean includeBuildInfo) {
        String effectiveAppId = (appId != null && !appId.isEmpty()) ? appId : getAppId(applicationName);
        String effectiveBuildId = (buildId != null && !buildId.isEmpty()) ? buildId : getLatestBuildId(effectiveAppId);
        
        VeracodeReport report = getDetailedReportObject(effectiveBuildId);
        
        VeracodeReportDTO dto = new VeracodeReportDTO();
        
        // Map Overview
        dto.overview.applicationName = report.getAppName();
        dto.overview.appId = report.getAppId();
        dto.overview.accountId = report.getAccountId();
        dto.overview.buildId = report.getBuildId();
        dto.overview.analysisId = report.getAnalysisId();
        dto.overview.scanName = report.getScanName();
        dto.overview.generationDate = report.getGenerationDate();
        dto.overview.policyName = report.getPolicyName();
        dto.overview.policyComplianceStatus = report.getPolicyComplianceStatus();

        if (report.getStaticAnalysis() != null) {
            dto.overview.sastScore = report.getStaticAnalysis().getScore();
            dto.overview.sastRating = report.getStaticAnalysis().getRating();
        }

        // Conditionally Fetch Build Info
        if (includeBuildInfo) {
            try {
                dto.buildInfo = getBuildInfo(effectiveBuildId);
            } catch (Exception e) {
                System.err.println("Warning: Could not fetch build info: " + e.getMessage());
            }
        }

        // Find Modules using robust DOM parsing (bypasses JAXB namespace issues)
        try {
            // 1. Get Selected Modules and Architectures from Detailed Report XML
                String detailedXml = getRawDetailedReport(effectiveBuildId);
                populateModulesAndArchitectures(detailedXml, dto);
                
                // NEW: Populate breakdown and findings using the same XML
                generateDetailedBreakdown(detailedXml, report, dto);
                
                debugLog("DEBUG: DOM processed detailed report for breakdown and modules.");

            // 2. Get Unselected Modules from Prescan Results XML (KEEP FILTERS HERE)
            PrescanResults prescan = getPreScanResults(effectiveAppId, effectiveBuildId);
            if (prescan != null && prescan.getModules() != null) {
                debugLog("DEBUG: Processing " + prescan.getModules().size() + " modules from prescan.");
                int prescanPythonCount = 0;
                int prescanJsCount = 0;
                
                for (PrescanModule m : prescan.getModules()) {
                    String moduleName = m.getName();
                    String finalFileName = m.getFileName();
                    if (moduleName == null) continue;

                    // Handle Generic Modules separately via balancing logic later
                    if (moduleName.equalsIgnoreCase("Python Files")) {
                        prescanPythonCount++;
                        continue;
                    }
                    if (moduleName.equalsIgnoreCase("JS Files") || moduleName.equalsIgnoreCase("JavaScript Files")) {
                        prescanJsCount++;
                        continue;
                    }
                    
                    // Filter: Skip if explicitly a dependency (unless it's a jar/zip) or has fatal errors
                    if (m.hasFatalErrors()) {
                        debugLog("DEBUG: Skipping unselected module (Fatal Errors): " + moduleName);
                        continue;
                    }
                    if (m.isDependency() && !moduleName.toLowerCase().endsWith(".zip") && !moduleName.toLowerCase().endsWith(".jar") &&
                        (finalFileName == null || (!finalFileName.toLowerCase().endsWith(".zip") && !finalFileName.toLowerCase().endsWith(".jar")))) {
                        debugLog("DEBUG: Skipping unselected module (Dependency): " + moduleName);
                        continue;
                    }

                    // CHECK: Is this specific module already selected?
                    boolean isAlreadySelected = dto.selectedModules.stream()
                        .anyMatch(selected -> {
                            String selLower = selected.toLowerCase();
                            String modLower = moduleName.toLowerCase();
                            String fileLower = (finalFileName != null) ? finalFileName.toLowerCase() : null;

                            boolean nameMatch = selLower.equals(modLower);
                            boolean fileMatch = (fileLower != null && selLower.equals(fileLower));
                            boolean nameInside = selLower.contains(modLower);
                            boolean fileInside = (fileLower != null && selLower.contains(fileLower));
                            
                            // Handles "Go files within 936599.zip" matching "936599.zip"
                            boolean selectedInsideName = modLower.contains(selLower);
                            boolean selectedInsideFile = (fileLower != null && fileLower.contains(selLower));

                            return nameMatch || fileMatch || nameInside || fileInside || selectedInsideName || selectedInsideFile;
                        });

                    if (isAlreadySelected) {
                        debugLog("DEBUG: Skipping unselected module (Already Selected): " + moduleName);
                        continue;
                    }

                    String displayName = (finalFileName != null && !finalFileName.isEmpty()) ? finalFileName : moduleName;
                    
                    boolean isExplicitInclude = veracodeConfig.getIncludeModules() != null && veracodeConfig.getIncludeModules().stream()
                        .anyMatch(inc -> displayName.toLowerCase().contains(inc.toLowerCase()));

                    boolean hasSelectedMatch = dto.selectedModules.stream()
                        .anyMatch(selected -> {
                            String s = selected.toLowerCase();
                            String d = displayName.toLowerCase();
                            // Exact prefix/suffix match
                            if (d.startsWith(s) || d.endsWith(s)) return true;
                            
                            // Fuzzy prefix match: check if both start with the same 6 characters
                            if (s.length() >= 6 && d.length() >= 6) {
                                String sPrefix = s.substring(0, 6);
                                String dPrefix = d.substring(0, 6);
                                if (sPrefix.equals(dPrefix)) return true;
                            }
                            return false;
                        });

                    // Rule: Include only if explicitly in include-modules OR if prefix/suffix matches a selected module
                    if (isExplicitInclude || hasSelectedMatch) {
                        boolean isIgnored = veracodeConfig.getIgnoreModules().stream()
                            .anyMatch(ignore -> displayName.toLowerCase().contains(ignore.toLowerCase()));
                        
                        if (!isIgnored) {
                            if (!dto.unselectedModules.contains(displayName)) {
                                dto.unselectedModules.add(displayName);
                            }
                        } else {
                            debugLog("DEBUG: Skipping unselected module (Ignored via blacklist): " + displayName);
                        }
                    } else {
                        debugLog("DEBUG: Skipping unselected module (Not in inclusion list): " + displayName);
                    }
                }

                // Apply Balancing Logic for Python
                long selectedPythonCount = dto.selectedModules.stream()
                    .filter(s -> s.toLowerCase().startsWith("python files within") || s.toLowerCase().startsWith("python files"))
                    .count();
                int missingPython = prescanPythonCount - (int)selectedPythonCount;
                for (int i = 0; i < missingPython; i++) {
                    if (!dto.unselectedModules.contains("Python Files")) {
                        dto.unselectedModules.add("Python Files");
                    }
                }
                if (missingPython > 0) debugLog("DEBUG: Added " + missingPython + " unselected Python Files via balancing logic.");

                // Apply Balancing Logic for JS
                long selectedJsCount = dto.selectedModules.stream()
                    .filter(s -> s.toLowerCase().startsWith("js files within") || s.toLowerCase().startsWith("javascript files within"))
                    .count();
                int missingJs = prescanJsCount - (int)selectedJsCount;
                for (int i = 0; i < missingJs; i++) {
                    if (!dto.unselectedModules.contains("JS Files")) {
                        dto.unselectedModules.add("JS Files");
                    }
                }
                if (missingJs > 0) debugLog("DEBUG: Added " + missingJs + " unselected JS Files via balancing logic.");
            }
        } catch (Exception e) {
            System.err.println("Warning: Could not perform gap analysis: " + e.getMessage());
            e.printStackTrace();
        }

        // Mapping is now handled by generateDetailedBreakdown
        saveJsonToLog("final_report", effectiveBuildId, dto);
        return dto;
    }

    private void saveJsonToLog(String prefix, String id, Object dto) {
        if (!veracodeConfig.isDebug()) return;
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.enable(com.fasterxml.jackson.databind.SerializationFeature.INDENT_OUTPUT);
            String json = mapper.writeValueAsString(dto);
            
            String timestamp = new java.text.SimpleDateFormat("yyyyMMdd_HHmmss").format(new java.util.Date());
            java.nio.file.Path logDir = java.nio.file.Paths.get("logs", "veracode");
            java.nio.file.Files.createDirectories(logDir);
            
            String fileName = String.format("%s_%s_%s.json", prefix, id, timestamp);
            java.nio.file.Files.writeString(logDir.resolve(fileName), json);
            debugLog("DEBUG: Saved report log to: " + logDir.resolve(fileName));
        } catch (Exception e) {
            System.err.println("Warning: Could not save JSON log: " + e.getMessage());
        }
    }

    private String formatBreakdown(Map<Integer, Integer> map) {
        return String.format("Very High: %d, High: %d, Medium: %d, Low: %d, Very Low: %d, Info: %d",
            map.getOrDefault(5, 0), map.getOrDefault(4, 0), map.getOrDefault(3, 0),
            map.getOrDefault(2, 0), map.getOrDefault(1, 0), map.getOrDefault(0, 0));
    }

    public BuildInfo getBuildInfo(String buildId) {
        try {
            UploadAPIWrapper uploadWrapper = new UploadAPIWrapper();
            setupCredentials(uploadWrapper);
            String xml = uploadWrapper.getBuildInfo(buildId);
            saveXmlToLog("build_info", buildId, xml);
            debugLog("[" + java.time.LocalDateTime.now() + "] Raw Build Info for ID " + buildId + ": " + xml);

            if (xml.contains("<error>")) {
                JAXBContext errContext = JAXBContext.newInstance(VeracodeError.class);
                Unmarshaller errUnmarshaller = errContext.createUnmarshaller();
                VeracodeError error = (VeracodeError) errUnmarshaller.unmarshal(new StringReader(xml));
                System.err.println("Veracode API Error: " + error.getMessage());
                return null;
            }

            JAXBContext context = JAXBContext.newInstance(BuildInfo.class);
            Unmarshaller unmarshaller = context.createUnmarshaller();
            return (BuildInfo) unmarshaller.unmarshal(new StringReader(xml));
        } catch (Exception e) {
            throw new RuntimeException("Build Info failed: " + e.getMessage(), e);
        }
    }

    public PrescanResults getPreScanResults(String appId, String buildId) {
        try {
            UploadAPIWrapper uploadWrapper = new UploadAPIWrapper();
            setupCredentials(uploadWrapper);
            String xml = uploadWrapper.getPreScanResults(appId, buildId);
            saveXmlToLog("prescan_results", buildId, xml);
            debugLog("[" + java.time.LocalDateTime.now() + "] Raw Prescan Results: " + (xml.length() > 500 ? xml.substring(0, 500) : xml));

            if (xml.contains("<error>")) {
                System.err.println("Veracode API Error in Prescan: " + xml);
                return null;
            }

            JAXBContext context = JAXBContext.newInstance(PrescanResults.class);
            Unmarshaller unmarshaller = context.createUnmarshaller();
            return (PrescanResults) unmarshaller.unmarshal(new StringReader(xml));
        } catch (Exception e) {
            throw new RuntimeException("Prescan Results failed: " + e.getMessage(), e);
        }
    }

    public String getRawDetailedReport(String buildId) {
        try {
            ResultsAPIWrapper resultsWrapper = new ResultsAPIWrapper();
            setupCredentials(resultsWrapper);
            return resultsWrapper.detailedReport(buildId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get raw detailed report", e);
        }
    }

    private void populateModulesAndArchitectures(String xml, VeracodeReportDTO dto) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(new InputSource(new StringReader(xml)));
            
            Set<String> archSet = new HashSet<>();
            var staticAnalysisNodes = doc.getElementsByTagNameNS("*", "static-analysis");
            if (staticAnalysisNodes.getLength() > 0) {
                var staticAnalysis = staticAnalysisNodes.item(0);
                var children = staticAnalysis.getChildNodes();
                for (int i = 0; i < children.getLength(); i++) {
                    var child = children.item(i);
                    if (child.getLocalName() != null && child.getLocalName().equals("modules")) {
                        var moduleNodes = child.getChildNodes();
                        for (int j = 0; j < moduleNodes.getLength(); j++) {
                            var moduleNode = moduleNodes.item(j);
                            if (moduleNode.getLocalName() != null && moduleNode.getLocalName().equals("module")) {
                                var attrs = moduleNode.getAttributes();
                                var nameAttr = attrs.getNamedItem("name");
                                var archAttr = attrs.getNamedItem("architecture");
                                var fileNameAttr = attrs.getNamedItem("file_name");
                                
                                if (nameAttr != null) {
                                    dto.selectedModules.add(nameAttr.getNodeValue());
                                }
                                // If fileName is present in detailed report, add it too to ensure matches
                                if (fileNameAttr != null) {
                                    dto.selectedModules.add(fileNameAttr.getNodeValue());
                                }
                                if (archAttr != null) {
                                    archSet.add(mapToPrettyName(archAttr.getNodeValue()));
                                }
                            }
                        }
                    }
                }
            }
            dto.architectures.addAll(archSet);
        } catch (Exception e) {
            System.err.println("Error parsing modules from XML: " + e.getMessage());
        }
    }

    private List<String> extractModulesFromDetailedReport(String xml) {
        VeracodeReportDTO tempDto = new VeracodeReportDTO();
        populateModulesAndArchitectures(xml, tempDto);
        return tempDto.selectedModules;
    }

    public String getSastResult(String applicationName) { return "Use /getfinalreport for full data"; }
    public String getBuildId(String appId) { return "Legacy - use /getfinalreport"; }
    public String getDetailedReport(String buildId) { return "Legacy - use /getfinalreport"; }

    private void generateDetailedBreakdown(String xml, VeracodeReport report, VeracodeReportDTO dto) {
        try {
            var factory = javax.xml.parsers.DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            var builder = factory.newDocumentBuilder();
            var doc = builder.parse(new java.io.ByteArrayInputStream(xml.getBytes(java.nio.charset.StandardCharsets.UTF_8)));

            // Build issueId -> mitigation descriptions map from JAXB model
            var mitigationsByIssueId = new java.util.HashMap<String, List<String>>();
            if (report != null && report.getSeverities() != null) {
                for (var severity : report.getSeverities()) {
                    if (severity.getCategories() == null) continue;
                    for (var category : severity.getCategories()) {
                        if (category.getCwes() == null) continue;
                        for (var cwe : category.getCwes()) {
                            if (cwe.getStaticFlaws() == null || cwe.getStaticFlaws().getFlaws() == null) continue;
                            for (var modelFlaw : cwe.getStaticFlaws().getFlaws()) {
                                if (modelFlaw.getIssueId() == null) continue;
                                var descs = new java.util.ArrayList<String>();
                                if (modelFlaw.getMitigationList() != null && modelFlaw.getMitigationList().getMitigations() != null) {
                                    for (var m : modelFlaw.getMitigationList().getMitigations()) {
                                        if (m.getDescription() != null && !m.getDescription().isEmpty()) {
                                            descs.add(m.getDescription());
                                        }
                                    }
                                }
                                mitigationsByIssueId.put(String.valueOf(modelFlaw.getIssueId()), descs);
                            }
                        }
                    }
                }
            }

            // Map to hold counts: Severity -> CWE -> List of Flaws
            var severityMap = new java.util.TreeMap<Integer, java.util.Map<String, java.util.List<org.w3c.dom.Element>>>(java.util.Collections.reverseOrder());

            var flaws = doc.getElementsByTagNameNS("*", "flaw");
            int totalSast = 0;
            List<VeracodeReportDTO.FindingDTO> findings = new java.util.ArrayList<>();

            for (int i = 0; i < flaws.getLength(); i++) {
                var flaw = (org.w3c.dom.Element) flaws.item(i);
                String issueId = flaw.getAttribute("issueid");
                String mitigationStatus = flaw.getAttribute("mitigation_status");
                String remediationStatus = flaw.getAttribute("remediation_status");

                if (mitigationStatus != null) mitigationStatus = mitigationStatus.trim();
                
                // Logic: Exclude "accepted" or "Fixed" from breakdown and total
                if ("accepted".equalsIgnoreCase(mitigationStatus) || "Fixed".equalsIgnoreCase(remediationStatus)) {
                    continue;
                }

                int sev = Integer.parseInt(flaw.getAttribute("severity"));
                String cweId = flaw.getAttribute("cweid");
                String cwe = "CWE-" + cweId;

                severityMap.putIfAbsent(sev, new java.util.TreeMap<>());
                severityMap.get(sev).putIfAbsent(cwe, new java.util.ArrayList<>());
                severityMap.get(sev).get(cwe).add(flaw);
                totalSast++;

                // Logic for findingsWithComments: Report ONLY mitigation_status="proposed" with actual comments
                if ("proposed".equalsIgnoreCase(mitigationStatus)) {
                    // Extract comments using DOM for consistency
                    var mitNodes = flaw.getElementsByTagNameNS("*", "mitigation");
                    if (mitNodes.getLength() == 0) continue;

                    var comments = new java.util.ArrayList<String>();
                    for (int k = 0; k < mitNodes.getLength(); k++) {
                        var mitElem = (org.w3c.dom.Element) mitNodes.item(k);
                        String comment = mitElem.getAttribute("description");
                        if (comment == null || comment.isEmpty()) {
                            comment = mitElem.getAttribute("comment");
                        }
                        if (comment != null && !comment.isEmpty()) {
                            comments.add(comment);
                        }
                    }

                    if (!comments.isEmpty()) {
                        var fDto = new VeracodeReportDTO.FindingDTO();
                        fDto.type = "SAST";
                        fDto.id = issueId;
                        fDto.cweid = cweId;
                        fDto.title = flaw.getAttribute("categoryname");
                        fDto.severity = getSeverityName(sev);
                        fDto.location = flaw.getAttribute("sourcefile") + ":" + flaw.getAttribute("line");
                        fDto.userComments = comments;
                        findings.add(fDto);
                    }
                }
            }
            
            dto.sastSummary.vulnerabilities = totalSast;
            dto.findingsWithCommentsSAST.addAll(findings);
            
            // Format Breakdown String
            severityMap.forEach((sev, cweMap) -> {
                String sevName = getSeverityName(sev);
                var sevBreakdown = new VeracodeReportDTO.SeverityBreakdownDTO();
                sevBreakdown.total = cweMap.values().stream().mapToInt(java.util.List::size).sum();
                
                cweMap.forEach((cwe, list) -> {
                    // Find oldest date
                    String oldestDate = list.stream()
                        .map(e -> e.getAttribute("date_first_occurrence"))
                        .min(String::compareTo)
                        .orElse("");
                    
                    var finding = new VeracodeReportDTO.CweFindingDTO();
                    finding.cwe = cwe;
                    finding.count = list.size();
                    finding.date_first_occurrence = oldestDate;
                    sevBreakdown.findings.add(finding);
                });
                dto.sastSummary.breakdown.put(sevName, sevBreakdown);
            });
            
            // Map SCA separately as it has its own section in Detailed Report
            updateScaSummaryFromReport(report, dto);
            populateScaDetailSectionFromReport(report, dto);
            
        } catch (Exception e) {
            System.err.println("Error generating detailed breakdown: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void updateScaSummaryFromReport(VeracodeReport report, VeracodeReportDTO dto) {
        if (report == null || report.getSca() == null || report.getSca().getVulnerableComponents() == null) {
            return;
        }

        var scaTotals = new java.util.HashMap<Integer, Integer>();
        for (int i = 0; i <= 5; i++) scaTotals.put(i, 0);

        int vulnerabilitiesSca = 0;
        int totalVulnerablePackages = 0;
        var comps = report.getSca().getVulnerableComponents().getComponents();
        if (comps == null) return;

        for (var comp : comps) {
            boolean hasVulnerability = false;
            if (comp.getVulnerabilityList() == null || comp.getVulnerabilityList().getVulnerabilities() == null) continue;

            for (var vuln : comp.getVulnerabilityList().getVulnerabilities()) {
                int sev = (vuln.getSeverity() != null) ? vuln.getSeverity() : 0;
                scaTotals.put(sev, scaTotals.get(sev) + 1);
                vulnerabilitiesSca++;
                hasVulnerability = true;

                // Mitigation checks for SCA using JAXB
                String isMitigatedStr = vuln.getMitigation();
                if ("true".equalsIgnoreCase(isMitigatedStr)) continue;

                boolean hasApprove = false;
                boolean hasProposedAction = false;
                var scaComments = new java.util.ArrayList<String>();

                if (vuln.getMitigationList() != null && vuln.getMitigationList().getMitigations() != null) {
                    for (var mit : vuln.getMitigationList().getMitigations()) {
                        String action = mit.getAction();
                        if ("Approve Mitigation".equalsIgnoreCase(action)) {
                            hasApprove = true;
                            break;
                        }

                        if ("Mitigate by Design".equalsIgnoreCase(action) || 
                            "Mitigate By Environment".equalsIgnoreCase(action) || 
                            "Potential False Positive".equalsIgnoreCase(action)) {
                            hasProposedAction = true;
                            String comment = mit.getDescription();
                            if (comment == null || comment.isEmpty()) {
                                comment = mit.getComment();
                            }
                            if (comment != null && !comment.isEmpty()) {
                                scaComments.add(comment);
                            }
                        }
                    }
                }

                if (hasProposedAction && !hasApprove) {
                    var fDto = new VeracodeReportDTO.FindingDTO();
                    fDto.type = "SCA";
                    fDto.id = vuln.getCveId();
                    fDto.cweid = vuln.getCweId();
                    fDto.title = vuln.getCveId();
                    fDto.severity = getSeverityName(sev);
                    fDto.location = comp.getLibrary();
                    fDto.userComments = scaComments;
                    dto.findingsWithCommentsSCA.add(fDto);
                }
            }
            if (hasVulnerability) {
                totalVulnerablePackages++;
            }
        }
        dto.scaSummary.vulnerabilities = vulnerabilitiesSca;
        dto.scaSummary.totalPackages = comps.size(); // Approximation if total_components isn't in JAXB yet
        dto.scaSummary.totalVulnerablePackages = totalVulnerablePackages;
        dto.scaSummary.breakdown.putAll(formatScaBreakdown(scaTotals));
    }

    private void populateScaDetailSectionFromReport(VeracodeReport report, VeracodeReportDTO dto) {
        if (report == null || report.getSca() == null || report.getSca().getVulnerableComponents() == null) {
            return;
        }

        var ecosystems = new java.util.HashSet<String>();
        var comps = report.getSca().getVulnerableComponents().getComponents();
        if (comps == null) return;

        for (var comp : comps) {
            String library = comp.getLibrary();
            String libId = comp.getLibraryId();
            if (libId != null && libId.contains(":")) {
                String eco = libId.split(":")[0];
                boolean ignore = veracodeConfig.getIgnoreEcosystems().stream()
                    .anyMatch(ecoName -> ecoName.equalsIgnoreCase(eco));
                if (!ignore) {
                    ecosystems.add(mapToPrettyName(eco));
                }
            }

            if (comp.getVulnerabilityList() == null || comp.getVulnerabilityList().getVulnerabilities() == null) continue;
            
            var componentVulns = new java.util.ArrayList<ScaVulnerability>();
            for (var vuln : comp.getVulnerabilityList().getVulnerabilities()) {
                if (!"accepted".equalsIgnoreCase(vuln.getMitigationStatus())) {
                    componentVulns.add(vuln);
                }
            }

            if (!componentVulns.isEmpty()) {
                var detail = new VeracodeReportDTO.ScaDetailDTO();
                detail.packageName = library;
                detail.version = comp.getVersion();
                
                detail.firstFoundDate = componentVulns.stream()
                    .map(v -> v.getFirstFoundDate())
                    .filter(d -> d != null && !d.isEmpty())
                    .min(String::compareTo)
                    .orElse("");
                
                detail.cveList = componentVulns.stream()
                    .map(v -> v.getCveId())
                    .distinct()
                    .collect(java.util.stream.Collectors.joining(","));
                
                var counts = new java.util.TreeMap<String, Integer>(java.util.Collections.reverseOrder());
                for (var v : componentVulns) {
                    String sDesc = v.getSeverityDesc();
                    if (sDesc == null || sDesc.isEmpty()) {
                        sDesc = getSeverityName((v.getSeverity() != null) ? v.getSeverity() : 0);
                    }
                    counts.put(sDesc, counts.getOrDefault(sDesc, 0) + 1);
                }
                
                var severityList = new java.util.ArrayList<String>();
                counts.forEach((sev, count) -> severityList.add(sev + ": " + count));
                detail.severityCounts = String.join(", ", severityList);
                
                dto.scaDetails.add(detail);
            }
        }
        dto.scaEcosystems = ecosystems.toString();
        verifyPackaging(new java.util.HashSet<>(dto.architectures), ecosystems, dto);
    }

    private void verifyPackaging(java.util.Set<String> architectures, java.util.Set<String> ecosystems, VeracodeReportDTO dto) {
        var mappings = veracodeConfig.getArchitectureMappings();
        if (mappings == null || mappings.isEmpty()) return;

        // Normalize architectures to uppercase for easier lookup
        java.util.Set<String> upperArches = architectures.stream()
            .map(String::toUpperCase)
            .collect(java.util.stream.Collectors.toSet());

        // 1. Architecture detected in SAST but Ecosystem missing in SCA
        for (String arch : architectures) {
            String archUpper = arch.toUpperCase();
            String rawExpected = mappings.get(archUpper);
            
            if (rawExpected == null) {
                rawExpected = mappings.entrySet().stream()
                    .filter(e -> e.getKey().equalsIgnoreCase(arch))
                    .map(java.util.Map.Entry::getValue)
                    .findFirst()
                    .orElse(null);
            }

            if (rawExpected != null) {
                // Support comma-separated ecosystems (e.g., PYTHON=pip,pypi)
                String[] expectedEcos = rawExpected.split(",");
                boolean foundAny = false;
                for (String eco : expectedEcos) {
                    String trimmedEco = eco.trim();
                    if (ecosystems.contains(trimmedEco)) {
                        foundAny = true;
                        break;
                    }
                }

                if (!foundAny) {
                    // Special cases
                    if (archUpper.equals("JAVASCRIPT") && ecosystems.contains("bower")) continue;
                    if ((archUpper.equals("JAVA") || archUpper.equals("JVM")) && ecosystems.contains("gradle")) continue;
                    
                    dto.packagingAnomalies.add("Architecture " + arch + " detected in SAST but no corresponding SCA ecosystem (" + rawExpected + ") found. Packaging may be incomplete.");
                }
            }
        }

        // 2. Ecosystem detected in SCA but Architecture missing in SAST scan
        for (String eco : ecosystems) {
            boolean archFound = false;
            boolean hasMappingForEco = false;

            for (java.util.Map.Entry<String, String> entry : mappings.entrySet()) {
                String rawVal = entry.getValue();
                if (rawVal == null) continue;
                
                // Check if this eco is in the mapped list (case-insensitive)
                boolean ecoInList = java.util.Arrays.stream(rawVal.split(","))
                    .anyMatch(v -> v.trim().equalsIgnoreCase(eco));

                if (ecoInList) {
                    hasMappingForEco = true;
                    if (upperArches.contains(entry.getKey().toUpperCase())) {
                        archFound = true;
                        break;
                    }
                }
            }

            // Special cases
            if (!archFound && eco.equalsIgnoreCase("bower") && upperArches.contains("JAVASCRIPT")) archFound = true;
            if (!archFound && eco.equalsIgnoreCase("gradle") && (upperArches.contains("JAVA") || upperArches.contains("JVM"))) archFound = true;

            if (hasMappingForEco && !archFound) {
                String expectedArches = mappings.entrySet().stream()
                    .filter(e -> e.getValue() != null && java.util.Arrays.stream(e.getValue().split(",")).anyMatch(v -> v.trim().equalsIgnoreCase(eco)))
                    .map(java.util.Map.Entry::getKey)
                    .collect(java.util.stream.Collectors.joining(" or "));
                
                dto.packagingAnomalies.add("Ecosystem " + eco + " detected in SCA but no corresponding architecture (" + expectedArches + ") was scanned in SAST. Check module selection.");
            }
        }
    }

    private String getSeverityName(int sev) {
        return switch (sev) {
            case 5 -> "Very High";
            case 4 -> "High";
            case 3 -> "Medium";
            case 2 -> "Low";
            case 1 -> "Very Low";
            default -> "Info";
        };
    }

    private java.util.Map<String, VeracodeReportDTO.SeverityBreakdownDTO> formatScaBreakdown(java.util.Map<Integer, Integer> map) {
        var breakdown = new java.util.LinkedHashMap<String, VeracodeReportDTO.SeverityBreakdownDTO>();
        for (int sev = 5; sev >= 2; sev--) {
            var b = new VeracodeReportDTO.SeverityBreakdownDTO();
            b.total = map.getOrDefault(sev, 0);
            breakdown.put(getSeverityName(sev), b);
        }
        return breakdown;
    }

    private String mapToPrettyName(String technicalName) {
        var mappings = veracodeConfig.getArchitectureMappings();
        if (mappings == null || mappings.isEmpty()) return technicalName;
        
        return mappings.entrySet().stream()
            .filter(e -> {
                if (e.getKey().equalsIgnoreCase(technicalName)) return true;
                String val = e.getValue();
                if (val == null) return false;
                return java.util.Arrays.stream(val.split(","))
                    .anyMatch(v -> v.trim().equalsIgnoreCase(technicalName));
            })
            .map(java.util.Map.Entry::getKey)
            .findFirst()
            .orElse(technicalName);
    }
}
