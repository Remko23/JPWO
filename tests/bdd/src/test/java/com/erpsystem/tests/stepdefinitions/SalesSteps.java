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

public class SalesSteps {

    private Long customerId;
    private Long finishedItemId;
    private BigDecimal qtyOrdered;
    private Response deliveryResponse;

    public SalesSteps() {
        RestAssured.baseURI = ProductionState.BASE_URI;
    }

    @Mając("klienta o kodzie {string} oraz wyrób gotowy o SKU {string}")
    public void majacKlientaIWyrobGotowy(String customerCode, String sku) {
        state.login("sales", "sales");
        customerId = state.findPartnerIdByCode(customerCode);
        finishedItemId = state.findItemIdBySku(sku);
    }

    @Gdy("użytkownik tworzy zamówienie sprzedaży dla klienta {string} na produkt {string} w ilości {int} po cenie {int}")
    public void tworzyZamowienieSprzedazy(String customerCode, String sku, Integer qty, Integer price) {
        qtyOrdered = new BigDecimal(qty);
        Map<String, Object> line = Map.of(
                "itemId", finishedItemId,
                "qtyOrdered", qtyOrdered,
                "unitPrice", new BigDecimal(price)
        );
        Map<String, Object> req = Map.of(
                "partnerId", customerId,
                "orderDate", LocalDate.now().toString(),
                "lines", List.of(line)
        );

        Response resp = given()
                .header("Authorization", state.authToken)
                .contentType(ContentType.JSON)
                .body(req)
                .when()
                .post("/api/sales/sales-orders");
        resp.then().statusCode(201);
        state.lastSoId = resp.jsonPath().getLong("id");
        state.lastSoLineId = resp.jsonPath().getLong("lines[0].id");
    }

    @Gdy("użytkownik zatwierdza zamówienie sprzedaży")
    public void zatwierdzaZamowienieSprzedazy() {
        Response resp = given()
                .header("Authorization", state.authToken)
                .when()
                .post("/api/sales/sales-orders/" + state.lastSoId + "/confirm");
        resp.then().statusCode(200);
    }

    @Gdy("użytkownik realizuje dostawę wyrobów dla zamówienia sprzedaży")
    public void realizujeDostaweWyrobow() {
        Long stockLocationId = state.stockLocationId();
        Map<String, Object> line = Map.of(
                "soLineId", state.lastSoLineId,
                "qty", qtyOrdered
        );
        Map<String, Object> req = Map.of(
                "salesOrderId", state.lastSoId,
                "stockLocationId", stockLocationId,
                "lines", List.of(line)
        );

        deliveryResponse = given()
                .header("Authorization", state.authToken)
                .contentType(ContentType.JSON)
                .body(req)
                .when()
                .post("/api/sales/deliveries");
    }

    @Wtedy("dostawa zostaje zarejestrowana ze statusem sukcesu")
    public void dostawaZostajeZarejestrowanaZeStatusemSukcesu() {
        deliveryResponse.then().statusCode(201);
        assertThat(deliveryResponse.jsonPath().getLong("id")).isNotNull();
    }
}

