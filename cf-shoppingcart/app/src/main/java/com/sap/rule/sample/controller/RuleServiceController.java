package com.sap.rule.sample.controller;

import com.sap.rule.sample.config.RuleServiceConfig;
import com.sap.xs2.security.container.SecurityContext;
import com.sap.xs2.security.container.UserInfo;
import com.sap.xs2.security.container.UserInfoException;
import com.sap.xs2.security.container.XSTokenRequestImpl;
import com.sap.xsa.security.container.XSTokenRequest;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.util.EntityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URISyntaxException;

@RestController
public class RuleServiceController {

    @Autowired
    private RuleServiceConfig ruleServiceConfig;

    private static final Logger logger = LoggerFactory.getLogger(RuleServiceController.class);

    @RequestMapping(value = {"/rest/v1/rule-services/java/{projectName}/{ruleServiceName}"}, method = RequestMethod.POST, produces = {"application/json; charset=utf-8"})
    public String invokeRuleService(@PathVariable String projectName, @PathVariable String ruleServiceName, @RequestBody String inputFacts)
            throws UserInfoException, IOException, URISyntaxException {
        UserInfo userInfo = SecurityContext.getUserInfo();
        String requestTokenForClient = getUserToken(userInfo);
        String path = new StringBuilder("/rest/v1/rule-services/java/").append(projectName).append("/").append(ruleServiceName).toString();

        String uri = getRuleRuntimeUrl(path);
        CloseableHttpClient httpClient = HttpClientBuilder.create().build();
        HttpPost httpPost = new HttpPost(uri);
        httpPost.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + requestTokenForClient);
        httpPost.setEntity(new StringEntity(inputFacts));

        httpPost.addHeader(HttpHeaders.ACCEPT, "application/json");
        httpPost.addHeader(HttpHeaders.CONTENT_TYPE, "application/json");

        String response = null;
        try(CloseableHttpResponse httpResponse = httpClient.execute(httpPost)){
            response = EntityUtils.toString(httpResponse.getEntity(), "UTF-8");
        } catch (IOException e) {
            logger.error(e.getMessage(), e);
            throw e;
        }
        return response;
    }

    private String getUserToken(UserInfo userInfo) throws URISyntaxException, UserInfoException {
        XSTokenRequest tokenRequest = new XSTokenRequestImpl(ruleServiceConfig.getUaaUrl());
        tokenRequest.setType(XSTokenRequest.TYPE_USER_TOKEN)
                .setClientId(ruleServiceConfig.getClientId())
                .setClientSecret(ruleServiceConfig.getClientSecret());
        String requestTokenForClient = userInfo.requestToken(tokenRequest);
        return requestTokenForClient;
    }

    private String getRuleRuntimeUrl(String path) {
        String runtimeUrl = ruleServiceConfig.getRuntimeURL();
        return UriComponentsBuilder.fromHttpUrl(runtimeUrl).path(ruleServiceConfig.basePath).path(path).build().toUriString();
    }
}
