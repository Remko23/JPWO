package com.erpsystem.tests.stepdefinitions;

import com.erpsystem.tests.domain.ProductionState;
import io.cucumber.java.pl.*;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

public class ProductionSteps {

    public static final ProductionState state = new ProductionState();
    private BigDecimal initialWipNet = BigDecimal.ZERO;

    public ProductionSteps() {
        RestAssured.baseURI = ProductionState.BASE_URI;
    }

    private BigDecimal getWipNet(String accountCode) {
        Response resp = given()
                .header("Authorization", state.authToken)
                .when()
                .get("/api/ledger/trial-balance");
        resp.then().statusCode(200);
        List<Map<String, Object>> lines = resp.jsonPath().getList("lines");
        Map<String, Object> wipLine = lines.stream()
                .filter(l -> accountCode.equals(l.get("code")))
                .findFirst()
                .orElse(null);
        if (wipLine == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal debit = new BigDecimal(wipLine.get("totalDebit").toString());
        BigDecimal credit = new BigDecimal(wipLine.get("totalCredit").toString());
        return debit.subtract(credit);
    }

    @Mając("skonfigurowaną strukturę BOM dla produktu o SKU {string}")
    public void skonfigurowanaStrukturaBom(String sku) {
        state.finishedSku = sku;
    }

    @Mając("wystarczającą ilość surowców na magazynie")
    public void wystarczajacaIloscSurowcow() {
        // precondition: the seed profile guarantees sufficient on-hand raw material.
    }

    @Gdy("użytkownik loguje się jako {string} z hasłem {string}")
    public void uzytkownikLogujeSie(String username, String password) {
        state.login(username, password);
        initialWipNet = getWipNet("1320");
    }

    @Gdy("użytkownik tworzy zlecenie produkcyjne dla produktu o SKU {string} w ilości {int}")
    public void utworzZlecenieProdukcyjne(String sku, Integer qty) {
        Long itemId = state.findItemIdBySku(sku);
        Long bomId = state.findActiveBomIdForItem(itemId);
        Response resp = given()
                .header("Authorization", state.authToken)
                .contentType(ContentType.JSON)
                .body(Map.of("itemId", itemId, "bomId", bomId, "qtyToProduce", new BigDecimal(qty)))
                .when()
                .post("/api/manufacturing/work-orders");
        resp.then().statusCode(201);
        state.workOrderId = resp.jsonPath().getLong("id");
    }

    @Gdy("użytkownik zatwierdza zlecenie produkcyjne")
    public void zatwierdzZlecenie() {
        Response resp = given()
                .header("Authorization", state.authToken)
                .when()
                .post("/api/manufacturing/work-orders/" + state.workOrderId + "/release");
        resp.then().statusCode(200);
    }

    @Gdy("użytkownik wydaje surowce z magazynu dla zlecenia")
    public void wydajSurowce() {
        Long stockLocationId = state.stockLocationId();
        Response resp = given()
                .header("Authorization", state.authToken)
                .contentType(ContentType.JSON)
                .body(Map.of("stockLocationId", stockLocationId))
                .when()
                .post("/api/manufacturing/work-orders/" + state.workOrderId + "/issue");
        resp.then().statusCode(200);
        state.workOrderStatus = resp.jsonPath().getString("status");
    }

    @Gdy("użytkownik kończy zlecenie produkcyjne w ilości {int}")
    public void konczZlecenie(Integer qtyProduced) {
        Long stockLocationId = state.stockLocationId();
        Response resp = given()
                .header("Authorization", state.authToken)
                .contentType(ContentType.JSON)
                .body(Map.of("qtyProduced", new BigDecimal(qtyProduced), "stockLocationId", stockLocationId))
                .when()
                .post("/api/manufacturing/work-orders/" + state.workOrderId + "/complete");
        resp.then().statusCode(200);
        state.workOrderStatus = resp.jsonPath().getString("status");
    }

    @Wtedy("system przeksięguje wartość surowców na konto WIP {string}")
    public void przeksiegowacNaWip(String wipAccount) {
        BigDecimal currentWipNet = getWipNet(wipAccount);
        assertThat(currentWipNet).isGreaterThan(initialWipNet);
    }

    @Wtedy("system przyjmuje wyrób gotowy na magazyn")
    public void przyjmijWyrobGotowy() {
        Long itemId = state.findItemIdBySku(state.finishedSku);
        Response resp = given()
                .header("Authorization", state.authToken)
                .when()
                .get("/api/inventory/items/" + itemId + "/on-hand");
        resp.then().statusCode(200);
        BigDecimal onHand = new BigDecimal(resp.jsonPath().get("onHandQty").toString());
        assertThat(onHand).isGreaterThan(BigDecimal.ZERO);
    }

    @Wtedy("konto przejściowe WIP jest zerowane")
    public void wipZerowane() {
        // Po zakończeniu zlecenia, saldo WIP wraca do stanu bazowego (zlecenia rozliczone bilansują się do 0)
        BigDecimal currentWipNet = getWipNet("1320");
        assertThat(currentWipNet).isEqualByComparingTo(initialWipNet);

        // Dodatkowo potwierdzamy status DONE zlecenia produkcyjnego
        Response woResp = given()
                .header("Authorization", state.authToken)
                .when()
                .get("/api/manufacturing/work-orders/" + state.workOrderId);
        woResp.then().statusCode(200);
        assertThat(woResp.jsonPath().getString("status")).isEqualTo("DONE");
    }

    @Wtedy("wartość zostaje przeniesiona na wyroby gotowe")
    public void przeniesionaNaWyrobyGotowe() {
        Long itemId = state.findItemIdBySku(state.finishedSku);
        Response resp = given()
                .header("Authorization", state.authToken)
                .when()
                .get("/api/inventory/items/" + itemId + "/on-hand");
        resp.then().statusCode(200);
        BigDecimal totalValue = new BigDecimal(resp.jsonPath().get("totalValue").toString());
        assertThat(totalValue).isGreaterThan(BigDecimal.ZERO);
    }
}
