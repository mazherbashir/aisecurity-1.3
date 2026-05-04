package com.crs_reivew_api.model.veracode;
import jakarta.xml.bind.annotation.*;
@XmlAccessorType(XmlAccessType.FIELD)
public class ScaComponent {
    @XmlAttribute(name = "file_name") private String fileName;
    @XmlAttribute private String library;
    @XmlElement(name = "vulnerabilities", namespace = "https://www.veracode.com/schema/reports/export/1.0")
    private ScaVulnerabilityList vulnerabilityList;
    public String getFileName() { return fileName; }
    public String getLibrary() { return library; }
    public ScaVulnerabilityList getVulnerabilityList() { return vulnerabilityList; }
}
