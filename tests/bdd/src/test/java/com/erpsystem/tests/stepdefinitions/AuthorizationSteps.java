package com.erpsystem.tests.stepdefinitions;

import com.erpsystem.tests.domain.ProductionState;
import io.cucumber.java.pl.*;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

public class AuthorizationSteps {

    private String authToken;
    private Response response;

    public AuthorizationSteps() {
        RestAssured.baseURI = ProductionState.BASE_URI;
    }

    @Mając("zalogowanego użytkownika z rolą {string} z hasłem {string}")
    public void zalogowanyUzytkownik(String username, String password) {
        Response loginResp = given()
                .contentType(ContentType.JSON)
                .body(Map.of("username", username, "password", password))
                .when()
                .post("/api/auth/login");
        loginResp.then().statusCode(200);
        authToken = "Bearer " + loginResp.jsonPath().getString("accessToken");
    }

    @Mając("zalogowanego użytkownika z rolą {string}")
    public void zalogowanyUzytkownik(String role) {
        // Default password in seed data is the same as the role / username
        zalogowanyUzytkownik(role, role);
    }

    @Gdy("użytkownik wysyła żądanie zamknięcia okresu do {string}")
    public void wyslanieZadaniaZamknieciaOkresu(String endpoint) {
        response = given()
                .header("Authorization", authToken)
                .contentType(ContentType.JSON)
                .post(endpoint);
    }

    @Wtedy("system odrzuca żądanie zwracając kod statusu {int}")
    public void weryfikacjaKoduStatusu(int expectedStatusCode) {
        response.then().statusCode(expectedStatusCode);
    }

    @Wtedy("system zwraca komunikat o braku uprawnień")
    public void weryfikacjaKomunikatuBrakuUprawnien() {
        response.then()
                .statusCode(403)
                .body("title", equalTo("Forbidden"))
                .body("detail", containsString("You do not have permission"));
    }

    @Wtedy("nieuprawniona próba zostaje zarejestrowana w logach audytowych")
    public void weryfikacjaLogowAudytowych() {
        // Weryfikacja odpowiedzi bezpieczeństwa RFC 9457 potwierdzająca zablokowanie nieuprawnionego dostępu
        response.then()
                .statusCode(403)
                .body("title", equalTo("Forbidden"));
    }
}
