# Testy API w Postmanie

## Uruchomienie

1. Uruchom lokalne demo ERP z katalogu głównego projektu:

   ```powershell
   docker compose -f compose.demo.yaml up --build
   ```

   API jest dostępne przez frontendowy proxy pod `http://localhost:8081`. Poczekaj, aż aplikacja będzie gotowa.

2. W Postmanie zaimportuj:
   - `JPWO - API tests.postman_collection.json`
   - `JPWO Local.postman_environment.json`
3. Wybierz środowisko **JPWO Local**. Adres `http://localhost:8081` jest już ustawiony zarówno w środowisku, jak i w kolekcji — nie trzeba edytować URL-i poszczególnych requestów. `{{baseUrl}}` to zmienna Postmana, którą Postman automatycznie rozwija przy wysyłaniu requestu. Dane logowania w środowisku to `admin` / `admin`.
4. Uruchom całą kolekcję w Collection Runnerze, od pierwszego requestu do ostatniego. Nie uruchamiaj pojedynczego requestu ze środka scenariusza — wcześniejsze kroki przygotowują dane i zapisują identyfikatory.

W środowisku demo domyślny użytkownik to `admin` z hasłem `admin`. To konto demonstracyjne, nie używaj tych danych poza lokalnym środowiskiem.

## Scenariusze

Kolekcja wykonuje logowanie, znajduje aktywną lokalizację typu `STOCK`, przygotowuje unikalne dane i uruchamia osiem scenariuszy:

| ID testu | Moduł | Nazwa testu |
|---|---|---|
| `API-SAL-01` | `sales` | Realizacja wydania |
| `API-SAL-02` | `sales` | Księgowanie faktury |
| `API-PRD-01` | `manufacturing` | Pobranie surowców |
| `API-PRD-02` | `manufacturing` | Przyjęcie wyrobu gotowego |
| `API-PAY-01` | `payments` | Rejestracja wpłaty klienta |
| `API-PAY-02` | `payments` | Rozliczenie pozostałej wpłaty |
| `API-HR-01` | `hr` | Wyliczenie listy płac |
| `API-HR-02` | `hr` | Księgowanie listy płac |

Osiem testów weryfikuje statusy dokumentów, kwoty, salda kont i identyfikatory wpisów. Pozostałe requesty przygotowują dane lub pobierają stan kontrolny; ich błędy HTTP są widoczne w Runnerze jako błędy requestów. Kolekcja tworzy własne kartoteki, zlecenia, dokumenty, wpłaty i wpisy księgowe, więc kolejne uruchomienia nie korzystają z tych samych numerów. Dla listy płac automatycznie wybierany jest niewykorzystany okres.

## Zakres ośmiu testów do sprawozdania

Collection Runner wysyła dodatkowe requesty przygotowawcze (logowanie, utworzenie kartotek, dokumentów i odczyt stanu kont przed księgowaniem). Są one potrzebne do wykonania scenariuszy, ale nie są osobnymi testami. W zakładce **Test Results** powinno być dokładnie osiem nazwanych testów — po dwa na każdą kategorię:

1. **API-SAL-01 — Realizacja wydania:** odpowiedź wydania ma status `POSTED`; sprawdzana jest wysłana ilość 2 szt., koszt jednostkowy 10 oraz identyfikator wpisu księgowego.
2. **API-SAL-02 — Księgowanie faktury:** faktura zawiera netto 200, VAT 10, brutto/należność 210 i COGS 20. Porównanie salda próbnego przed i po wystawieniu faktury sprawdza zmiany kont: 1200 Wn 210, 4100 Ma 200, 2400 Ma 10, 5100 Wn 20 i 1340 Ma 20; saldo próbne pozostaje zbilansowane.
3. **API-PRD-01 — Pobranie surowców:** zlecenie przechodzi do `IN_PROGRESS`; sprawdzane są pobrane 2 sztuki o rzeczywistym koszcie 20 i powiązanie z wpisem księgowym.
4. **API-PRD-02 — Przyjęcie wyrobu gotowego:** zlecenie przechodzi do `DONE`; sprawdzane są wyprodukowane 2 sztuki, koszt całkowity 20 oraz stan wyrobu: 2 sztuki, koszt średni 10, wartość 20.
5. **API-PAY-01 — Rejestracja wpłaty klienta:** wpłata 100 jest zaksięgowana i przypisana do faktury; faktura ma status `PARTIALLY_PAID`, otrzymano 100, a saldo otwarte wynosi 110. Kontrola salda próbnego sprawdza spadek należności na 1200 o 100 i wzrost środków pieniężnych na 1010 o 100.
6. **API-PAY-02 — Rozliczenie pozostałej wpłaty:** wpłata pozostałych 110 jest przypisana do tej samej faktury; faktura przechodzi do `PAID`, saldo otwarte wynosi 0, należność na 1200 spada o 110, środki na 1010 rosną o 110, a saldo próbne pozostaje zbilansowane.
7. **API-HR-01 — Wyliczenie listy płac:** dla pracownika testowego sprawdzane są kwoty brutto 5000, podatek 300, ubezpieczenie 250 i netto 4450; kontrolowana jest też zgodność sumy brutto z sumą potrąceń i netto.
8. **API-HR-02 — Księgowanie listy płac:** lista ma status `POSTED` i identyfikator wpisu. Porównanie salda próbnego przed i po księgowaniu sprawdza Wn 6100 na kwotę brutto oraz Ma 2200 netto, 2210 podatku i 2220 ubezpieczenia; globalne saldo próbne jest zbilansowane.

Testy salda próbnego porównują wartości przed i po danej operacji, dzięki czemu sprawdzają jej wpływ na konta, a nie tylko obecność wcześniejszych wpisów z danych demo.

## Uwaga

Testy zapisują dane i księgowania w bazie. Uruchamiaj je wyłącznie na lokalnej/testowej instancji, nigdy na produkcji. Do czystego demo można odtworzyć bazę poleceniami:

```powershell
docker compose -f compose.demo.yaml down -v
docker compose -f compose.demo.yaml up --build
```

Jeśli wcześniej zaimportowałeś inną wersję środowiska, zaimportuj ponownie plik `JPWO Local.postman_environment.json` i wybierz **JPWO Local**. Dla lokalnego backendu dostępnego bezpośrednio na porcie `8080` zmień tylko wartość zmiennej `baseUrl` w środowisku Postmana na `http://localhost:8080`; nie zmieniaj URL-i w requestach.
