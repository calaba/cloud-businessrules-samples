package com.sap.rule.sample.security;

import com.sap.xs2.security.commons.SAPOfflineTokenServicesCloud;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import static org.springframework.http.HttpMethod.*;
import org.springframework.security.access.AccessDecisionManager;
import org.springframework.security.access.AccessDecisionVoter;
import org.springframework.security.access.vote.AuthenticatedVoter;
import org.springframework.security.access.vote.UnanimousBased;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.config.annotation.web.configuration.EnableResourceServer;
import org.springframework.security.oauth2.config.annotation.web.configuration.ResourceServerConfigurerAdapter;
import org.springframework.security.oauth2.provider.expression.OAuth2WebSecurityExpressionHandler;
import org.springframework.security.web.access.expression.WebExpressionVoter;
import org.springframework.util.Assert;

import java.util.ArrayList;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableResourceServer
@Profile("cloud")
public class WebSecurityConfiguration extends ResourceServerConfigurerAdapter {


    private static Logger logger = LoggerFactory.getLogger(WebSecurityConfiguration.class);

    @Value("${vcap.services.java-rule-sample-uaa.credentials.xsappname}")
    private String xsAppName;

    @Bean
    @Profile("cloud")
    protected static SAPOfflineTokenServicesCloud offlineTokenServicesBean() {
        return new SAPOfflineTokenServicesCloud();
    }


    // TODO https://github.wdf.sap.corp/cc-java-dev/cc-coursematerial/issues/471
    @Bean
    protected static AccessDecisionManager accessDecisionManagerBean() {
        List<AccessDecisionVoter<?>> voterList = new ArrayList<>();
        WebExpressionVoter expressionVoter = new WebExpressionVoter();
        expressionVoter.setExpressionHandler(new OAuth2WebSecurityExpressionHandler());
        voterList.add(expressionVoter);
        voterList.add(new AuthenticatedVoter());
        return new UnanimousBased(voterList);
    }

    public static String buildOauthScopeString(String xsAppName, Scope... scopes) {
        Assert.hasText(xsAppName, "XSAppName must not be null or empty!");
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("#oauth2.hasScope('%s.%s')", xsAppName, scopes[0].getValue()));

        for (int i = 1; i < scopes.length; i++) {
            sb.append(" and ");
            sb.append(String.format("#oauth2.hasScope('%s.%s')", xsAppName, scopes[i].getValue()));
        }

        return sb.toString();
    }

    @Override
    public void configure(HttpSecurity http) throws Exception {
        logger.info("Initializing Http security");


        http.sessionManagement()
                // session is created by approuter
                .sessionCreationPolicy(SessionCreationPolicy.NEVER).and()
                // demand specific scopes depending on intended request
                .authorizeRequests()
                // enable OAuth2 checks
                .accessDecisionManager(accessDecisionManagerBean()).antMatchers(GET, "/health").permitAll().antMatchers(GET, "/env")
                .permitAll().antMatchers(POST, "/**")
                .access(buildOauthScopeString(xsAppName, Scope.WRITE)).antMatchers(PATCH, "/**")
                .access(buildOauthScopeString(xsAppName, Scope.WRITE)).antMatchers(PUT, "/**")
                .access(buildOauthScopeString(xsAppName, Scope.WRITE)).antMatchers(DELETE, "/**")
                .access(buildOauthScopeString(xsAppName, Scope.DELETE)).antMatchers(GET, "/**")
                .access(buildOauthScopeString(xsAppName, Scope.READ)).antMatchers(HEAD, "/**")
                .access(buildOauthScopeString(xsAppName, Scope.READ)).anyRequest().denyAll(); // deny anything not configured above

    }
}