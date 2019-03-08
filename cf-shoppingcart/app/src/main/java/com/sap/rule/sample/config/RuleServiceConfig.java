package com.sap.rule.sample.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class RuleServiceConfig {

    @Value("${vcap.services.java-ruleservice.credentials.uaa.clientid}")
    private String clientId;

    @Value("${vcap.services.java-ruleservice.credentials.uaa.clientsecret}")
    private String clientSecret;

    @Value("${vcap.services.java-ruleservice.credentials.uaa.url}")
    private String uaaUrl;

    @Value("${vcap.services.java-ruleservice.credentials.repository_url}")
    private String repositoryURL;

    @Value("${vcap.services.java-ruleservice.credentials.runtime_url}")
    private String runtimeURL;

    public static String basePath = "rules-service";

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getUaaUrl() {
        return uaaUrl;
    }

    public void setUaaUrl(String uaaUrl) {
        this.uaaUrl = uaaUrl;
    }

    public String getRepositoryURL() {
        return repositoryURL;
    }

    public void setRepositoryURL(String repositoryURL) {
        this.repositoryURL = repositoryURL;
    }

    public String getRuntimeURL() {
        return runtimeURL;
    }

    public void setRuntimeURL(String runtimeURL) {
        this.runtimeURL = runtimeURL;
    }
}
