# language: pl
Funkcja: BDD-01 Cykl produkcyjny z rozliczeniem kosztów na kontach WIP
  Jako Kierownik Produkcji
  Chcę zlecić produkcję wyrobu gotowego na podstawie BOM
  Aby zaktualizować stany surowców, wyrobów gotowych oraz konta księgowe

  Scenariusz: Pomyślne rozliczenie zlecenia
    Mając skonfigurowaną strukturę BOM dla produktu o SKU "FG-DEMO"
    Oraz wystarczającą ilość surowców na magazynie
    Gdy użytkownik loguje się jako "warehouse" z hasłem "warehouse"
    I użytkownik tworzy zlecenie produkcyjne dla produktu o SKU "FG-DEMO" w ilości 10
    I użytkownik zatwierdza zlecenie produkcyjne
    I użytkownik wydaje surowce z magazynu dla zlecenia
    Wtedy system przeksięguje wartość surowców na konto WIP "1320"
    I użytkownik kończy zlecenie produkcyjne w ilości 10
    Wtedy system przyjmuje wyrób gotowy na magazyn
    I konto przejściowe WIP jest zerowane
    I wartość zostaje przeniesiona na wyroby gotowe
