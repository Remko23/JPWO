# language: pl
Funkcja: BDD-06 Weryfikacja spójności księgi głównej i bilansu
  Jako Główny Księgowy
  Chcę zweryfikować zestawienie obrotów i sald księgi głównej
  Aby mieć pewność, że wszystkie operacje spełniają zasadę podwójnego zapisu

  Scenariusz: Zestawienie obrotów i sald jest zbilansowane
    Gdy użytkownik loguje się jako "accountant" z hasłem "accountant"
    I użytkownik pobiera zestawienie obrotów i sald
    Wtedy suma debetów w księdze głównej jest równa sumie kredytów
    I zestawienie obrotów i sald jest zbilansowane

