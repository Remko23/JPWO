package com.erpsystem.tests.stepdefinitions;

import com.erpsystem.tests.domain.ProductionState;
import io.cucumber.java.pl.*;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static com.erpsystem.tests.stepdefinitions.ProductionSteps.state;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

public class InventorySteps {

    private Long itemId;
    private Response adjustmentResponse;

    public InventorySteps() {
        RestAssured.baseURI = ProductionState.BASE_URI;
    }

    @Mając("produkt o SKU {string}")
    public void majacProduktOSku(String sku) {
        state.login("warehouse", "warehouse");
        itemId = state.findItemIdBySku(sku);
    }

    @Gdy("użytkownik wykonuje korektę ilościową dla produktu {string} o wartość {int} z powodem {string}")
    public void wykonujeKorekteIlosciowa(String sku, Integer qtyDelta, String reason) {
        Long stockLocationId = state.stockLocationId();
        Map<String, Object> req = Map.of(
                "itemId", itemId,
                "locationId", stockLocationId,
                "qtyDelta", new BigDecimal(qtyDelta),
                "reason", reason,
                "postingDate", LocalDate.now().toString()
        );

        adjustmentResponse = given()
                .header("Authorization", state.authToken)
                .contentType(ContentType.JSON)
                .body(req)
                .when()
                .post("/api/inventory/adjustments");
    }

    @Wtedy("system zapisuje korektę magazynową")
    public void systemZapisujeKorekteMagazynowa() {
        adjustmentResponse.then().statusCode(201);
        assertThat(adjustmentResponse.jsonPath().getLong("id")).isNotNull();
    }

    @Wtedy("stan magazynowy produktu {string} jest większy od zera")
    public void stanMagazynowyJestWiekszyOdZera(String sku) {
        Response resp = given()
                .header("Authorization", state.authToken)
                .when()
                .get("/api/inventory/items/" + itemId + "/on-hand");
        resp.then().statusCode(200);
        BigDecimal onHand = new BigDecimal(resp.jsonPath().get("onHandQty").toString());
        assertThat(onHand).isGreaterThan(BigDecimal.ZERO);
    }
}
