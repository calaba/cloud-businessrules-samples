package com.sap.rule.sample.controller;

import com.sap.rule.sample.config.RuleServiceConfig;
import com.sap.xs2.security.container.SecurityContext;
import com.sap.xs2.security.container.UserInfo;
import com.sap.xs2.security.container.UserInfoException;
import com.sap.xs2.security.container.XSTokenRequestImpl;
import com.sap.xsa.security.container.XSTokenRequest;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.util.EntityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URISyntaxException;

@RestController
public class XSRFController {

    @Autowired
    private RuleServiceConfig ruleServiceConfig;

    private static final Logger logger = LoggerFactory.getLogger(XSRFController.class);

    @RequestMapping("/rest/v1/xsrf-token")
    public String xsrfCall() throws UserInfoException, URISyntaxException {
        UserInfo userInfo = SecurityContext.getUserInfo();
        String requestTokenForClient = getUserToken(userInfo);

        String uri = getXsrfToken();

        CloseableHttpClient httpClient = HttpClientBuilder.create().build();
        HttpGet httpGet = new HttpGet(uri);
        httpGet.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + requestTokenForClient);

        String response = null;
        try(CloseableHttpResponse httpResponse = httpClient.execute(httpGet)){
            response = EntityUtils.toString(httpResponse.getEntity(), "UTF-8");
        } catch (ClientProtocolException e) {
            logger.error(e.getMessage(), e);
        } catch (IOException e) {
            logger.error(e.getMessage(), e);
        }
        return response;
    }

    private String getXsrfToken() {
        String path = "/rest/v1/xsrf-token";
        return getRuleRuntimeUrl(path);
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
