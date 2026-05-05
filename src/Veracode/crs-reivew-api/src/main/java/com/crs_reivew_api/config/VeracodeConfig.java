package com.crs_reivew_api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;

@Configuration
@ConfigurationProperties(prefix = "veracode.api")
public class VeracodeConfig {

    private String url;
    private boolean debug;
    private List<String> ignoreModules = new ArrayList<>();
    private List<String> includeModules = new ArrayList<>();
    private List<String> ignoreEcosystems = new ArrayList<>();
    private Map<String, String> architectureMappings = new HashMap<>();
    private Key key = new Key();

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public boolean isDebug() {
        return debug;
    }

    public void setDebug(boolean debug) {
        this.debug = debug;
    }

    public Key getKey() {
        return key;
    }

    public void setKey(Key key) {
        this.key = key;
    }

    public List<String> getIgnoreModules() {
        return ignoreModules;
    }

    public void setIgnoreModules(List<String> ignoreModules) {
        this.ignoreModules = ignoreModules;
    }

    public List<String> getIncludeModules() {
        return includeModules;
    }

    public void setIncludeModules(List<String> includeModules) {
        this.includeModules = includeModules;
    }
    
    public List<String> getIgnoreEcosystems() {
        return ignoreEcosystems;
    }

    public void setIgnoreEcosystems(List<String> ignoreEcosystems) {
        this.ignoreEcosystems = ignoreEcosystems;
    }

    public Map<String, String> getArchitectureMappings() {
        return architectureMappings;
    }

    public void setArchitectureMappings(Map<String, String> architectureMappings) {
        this.architectureMappings = architectureMappings;
    }

    public static class Key {
        private String id;
        private String secret;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }
    }
}
