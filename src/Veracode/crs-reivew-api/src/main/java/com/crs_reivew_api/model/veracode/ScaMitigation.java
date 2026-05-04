package com.crs_reivew_api.model.veracode;
import jakarta.xml.bind.annotation.*;
@XmlAccessorType(XmlAccessType.FIELD)
public class ScaMitigation {
    @XmlAttribute private String user;
    @XmlAttribute private String description;
    public String getUser() { return user; }
    public String getDescription() { return description; }
}
