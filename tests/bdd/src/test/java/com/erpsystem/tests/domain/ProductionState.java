package com.erpsystem.tests.domain;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;

public class ProductionState {

    public static final String BASE_URI = resolveBaseUri();

    private static String resolveBaseUri() {
        String prop = System.getProperty("base.uri");
        if (prop != null && !prop.isBlank() && !prop.equals("${base.uri}")) {
            return prop;
        }
        String env = System.getenv("BASE_URI");
        if (env != null && !env.isBlank()) {
            return env;
        }
        return "http://localhost:8081";
    }

    public String authToken;
    public Long workOrderId;
    public String workOrderStatus;
    public String finishedSku;

    // Purchasing & Sales state
    public Long lastPoId;
    public Long lastPoLineId;
    public Long lastSoId;
    public Long lastSoLineId;

    public ProductionState() {
        RestAssured.baseURI = BASE_URI;
    }

    public String login(String username, String password) {
        Response resp = given()
                .contentType(ContentType.JSON)
                .body(Map.of("username", username, "password", password))
                .when()
                .post("/api/auth/login");
        resp.then().statusCode(200);
        this.authToken = "Bearer " + resp.jsonPath().getString("accessToken");
        return this.authToken;
    }

    /** Resolves an item id by SKU via GET /api/masterdata/items/by-sku?sku=... */
    public Long findItemIdBySku(String sku) {
        Response resp = given()
                .header("Authorization", authToken)
                .when()
                .get("/api/masterdata/items/by-sku?sku=" + sku);
        resp.then().statusCode(200);
        return resp.jsonPath().getLong("id");
    }

    /** Resolves a partner id by code via GET /api/masterdata/partners */
    public Long findPartnerIdByCode(String code) {
        Response resp = given()
                .header("Authorization", authToken)
                .when()
                .get("/api/masterdata/partners");
        resp.then().statusCode(200);
        List<Map<String, Object>> partners = resp.jsonPath().getList("$");
        for (Map<String, Object> p : partners) {
            if (code.equals(p.get("code"))) {
                return ((Number) p.get("id")).longValue();
            }
        }
        throw new AssertionError("no partner with code " + code);
    }

    /** Finds the first ACTIVE BOM whose parentItemId equals the given item id. */
    public Long findActiveBomIdForItem(Long itemId) {
        Response resp = given()
                .header("Authorization", authToken)
                .when()
                .get("/api/manufacturing/boms");
        resp.then().statusCode(200);
        List<Map<String, Object>> boms = resp.jsonPath().getList("$");
        for (Map<String, Object> bom : boms) {
            Long parent = ((Number) bom.get("parentItemId")).longValue();
            String status = (String) bom.get("status");
            if (parent.equals(itemId) && "ACTIVE".equals(status)) {
                return ((Number) bom.get("id")).longValue();
            }
        }
        throw new AssertionError("no ACTIVE BOM for item " + itemId);
    }

    public Long stockLocationId() {
        Response resp = given()
                .header("Authorization", authToken)
                .when()
                .get("/api/masterdata/locations");
        resp.then().statusCode(200);
        List<Map<String, Object>> locations = resp.jsonPath().getList("$");
        for (Map<String, Object> loc : locations) {
            if ("STOCK".equals(loc.get("locationType"))) {
                return ((Number) loc.get("id")).longValue();
            }
        }
        throw new AssertionError("no STOCK location found");
    }
}
