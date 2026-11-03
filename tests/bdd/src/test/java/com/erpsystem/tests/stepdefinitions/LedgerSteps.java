package com.erpsystem.tests.stepdefinitions;

import com.erpsystem.tests.domain.ProductionState;
import io.cucumber.java.pl.*;
import io.restassured.RestAssured;
import io.restassured.response.Response;

import java.math.BigDecimal;

import static com.erpsystem.tests.stepdefinitions.ProductionSteps.state;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

public class LedgerSteps {

    private Response trialBalanceResponse;

    public LedgerSteps() {
        RestAssured.baseURI = ProductionState.BASE_URI;
    }

    @Gdy("użytkownik pobiera zestawienie obrotów i sald")
    public void pobieraZestawienieObrotowISald() {
        trialBalanceResponse = given()
                .header("Authorization", state.authToken)
                .when()
                .get("/api/ledger/trial-balance");
        trialBalanceResponse.then().statusCode(200);
    }

    @Wtedy("suma debetów w księdze głównej jest równa sumie kredytów")
    public void sumaDebetowRownaSumieKredytow() {
        BigDecimal totalDebit = new BigDecimal(trialBalanceResponse.jsonPath().get("totalDebit").toString());
        BigDecimal totalCredit = new BigDecimal(trialBalanceResponse.jsonPath().get("totalCredit").toString());
        assertThat(totalDebit).isEqualByComparingTo(totalCredit);
    }

    @Wtedy("zestawienie obrotów i sald jest zbilansowane")
    public void zestawienieJestZbilansowane() {
        boolean balanced = trialBalanceResponse.jsonPath().getBoolean("balanced");
        assertThat(balanced).isTrue();
    }
}

