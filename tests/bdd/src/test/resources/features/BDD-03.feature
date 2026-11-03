# language: pl
Funkcja: BDD-03 Proces zakupowy i przyjęcie towaru do magazynu
  Jako Pracownik Magazynu
  Chcę złożyć zamówienie zakupu i przyjąć dostawę surowców
  Aby uzupełnić stany magazynowe materiałów produkcyjnych

  Scenariusz: Przyjęcie dostawy surowców od dostawcy
    Mając dostawcę o kodzie "VEND-DEMO" oraz surowiec o SKU "RM-DEMO"
    Gdy użytkownik loguje się jako "warehouse" z hasłem "warehouse"
    I użytkownik tworzy zamówienie zakupu dla dostawcy "VEND-DEMO" na produkt "RM-DEMO" w ilości 10 po cenie 10
    I użytkownik zatwierdza zamówienie zakupu
    I użytkownik rejestruje przyjęcie towaru do magazynu
    Wtedy stan magazynowy surowca "RM-DEMO" zostaje powiększony

