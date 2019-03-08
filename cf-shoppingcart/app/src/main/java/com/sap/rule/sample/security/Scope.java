package com.sap.rule.sample.security;

public enum Scope {
    READ("read"), WRITE("write"), DELETE("delete");

    private final String value;

    private Scope(String value) {
        this.value = value;
    }

    public String getValue() {
        return this.value;
    }
}
