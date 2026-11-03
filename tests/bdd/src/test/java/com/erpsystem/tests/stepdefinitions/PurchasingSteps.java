package com.erpsystem.tests.stepdefinitions;

import com.erpsystem.tests.domain.ProductionState;
import io.cucumber.java.pl.*;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static com.erpsystem.tests.stepdefinitions.ProductionSteps.state;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

public class PurchasingSteps {

    private Long rawItemId;
    private Long vendorId;
    private BigDecimal qtyOrdered;
    private BigDecimal initialOnHand;

    public PurchasingSteps() {
        RestAssured.baseURI = ProductionState.BASE_URI;
    }

    @Mając("dostawcę o kodzie {string} oraz surowiec o SKU {string}")
    public void majacDostawceISurowiec(String vendorCode, String sku) {
        state.login("warehouse", "warehouse");
        vendorId = state.findPartnerIdByCode(vendorCode);
        rawItemId = state.findItemIdBySku(sku);

        Response resp = given()
                .header("Authorization", state.authToken)
                .when()
                .get("/api/inventory/items/" + rawItemId + "/on-hand");
        resp.then().statusCode(200);
        initialOnHand = new BigDecimal(resp.jsonPath().get("onHandQty").toString());
    }

    @Gdy("użytkownik tworzy zamówienie zakupu dla dostawcy {string} na produkt {string} w ilości {int} po cenie {int}")
    public void tworzyZamowienieZakupu(String vendorCode, String sku, Integer qty, Integer price) {
        qtyOrdered = new BigDecimal(qty);
        Map<String, Object> line = Map.of(
                "itemId", rawItemId,
                "qtyOrdered", qtyOrdered,
                "unitPrice", new BigDecimal(price)
        );
        Map<String, Object> req = Map.of(
                "partnerId", vendorId,
                "orderDate", LocalDate.now().toString(),
                "lines", List.of(line)
        );

        Response resp = given()
                .header("Authorization", state.authToken)
                .contentType(ContentType.JSON)
                .body(req)
                .when()
                .post("/api/purchasing/purchase-orders");
        resp.then().statusCode(201);
        state.lastPoId = resp.jsonPath().getLong("id");
        state.lastPoLineId = resp.jsonPath().getLong("lines[0].id");
    }

    @Gdy("użytkownik zatwierdza zamówienie zakupu")
    public void zatwierdzaZamowienieZakupu() {
        Response resp = given()
                .header("Authorization", state.authToken)
                .when()
                .post("/api/purchasing/purchase-orders/" + state.lastPoId + "/confirm");
        resp.then().statusCode(200);
    }

    @Gdy("użytkownik rejestruje przyjęcie towaru do magazynu")
    public void rejestrujePrzyjecieTowaru() {
        Long stockLocationId = state.stockLocationId();
        Map<String, Object> line = Map.of(
                "poLineId", state.lastPoLineId,
                "qty", qtyOrdered
        );
        Map<String, Object> req = Map.of(
                "purchaseOrderId", state.lastPoId,
                "stockLocationId", stockLocationId,
                "lines", List.of(line)
        );

        Response resp = given()
                .header("Authorization", state.authToken)
                .contentType(ContentType.JSON)
                .body(req)
                .when()
                .post("/api/purchasing/goods-receipts");
        resp.then().statusCode(201);
    }

    @Wtedy("stan magazynowy surowca {string} zostaje powiększony")
    public void stanMagazynowyZostajePowiekszony(String sku) {
        Response resp = given()
                .header("Authorization", state.authToken)
                .when()
                .get("/api/inventory/items/" + rawItemId + "/on-hand");
        resp.then().statusCode(200);
        BigDecimal currentOnHand = new BigDecimal(resp.jsonPath().get("onHandQty").toString());
        assertThat(currentOnHand).isGreaterThanOrEqualTo(initialOnHand.add(qtyOrdered));
    }
}

