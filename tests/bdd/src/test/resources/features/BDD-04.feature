# language: pl
Funkcja: BDD-04 Proces sprzedaży i realizacja wydań magazynowych
  Jako Pracownik Działu Sprzedaży
  Chcę zarejestrować zamówienie sprzedaży i zrealizować dostawę wyrobów
  Aby zrealizować zapotrzebowanie klienta i pomniejszyć stan gotowych towarów

  Scenariusz: Rejestracja i wydanie zamówienia klienta
    Mając klienta o kodzie "CUST-DEMO" oraz wyrób gotowy o SKU "FG-DEMO"
    Gdy użytkownik loguje się jako "sales" z hasłem "sales"
    I użytkownik tworzy zamówienie sprzedaży dla klienta "CUST-DEMO" na produkt "FG-DEMO" w ilości 1 po cenie 50
    I użytkownik zatwierdza zamówienie sprzedaży
    Gdy użytkownik loguje się jako "warehouse" z hasłem "warehouse"
    I użytkownik realizuje dostawę wyrobów dla zamówienia sprzedaży
    Wtedy dostawa zostaje zarejestrowana ze statusem sukcesu

