# language: pl
Funkcja: BDD-05 Korekta magazynowa i weryfikacja stanu zapasów
  Jako Pracownik Magazynu
  Chcę zarejestrować korektę ilościową stanu towaru
  Aby uzgodnić stan faktyczny zapasów po inwentaryzacji

  Scenariusz: Wykonanie dodatniej korekty magazynowej
    Mając produkt o SKU "RM-DEMO"
    Gdy użytkownik loguje się jako "warehouse" z hasłem "warehouse"
    I użytkownik wykonuje korektę ilościową dla produktu "RM-DEMO" o wartość 5 z powodem "INVENTORY_COUNT"
    Wtedy system zapisuje korektę magazynową
    I stan magazynowy produktu "RM-DEMO" jest większy od zera

