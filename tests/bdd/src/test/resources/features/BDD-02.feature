# language: pl
Funkcja: BDD-02 Kontrola dostępu oparta na rolach i autoryzacja
  Jako Pracownik Magazynu
  Chcę mieć dostęp wyłącznie do operacji magazynowych
  Aby operacje finansowe i zamknięcie okresu były chronione przed nieuprawnioną modyfikacją

  Scenariusz: Próba ręcznego zamknięcia okresu fiskalnego przez Magazyniera
    Mając zalogowanego użytkownika z rolą "warehouse" z hasłem "warehouse"
    Gdy użytkownik wysyła żądanie zamknięcia okresu do "/api/ledger/fiscal-years/2026/periods/1/close"
    Wtedy system odrzuca żądanie zwracając kod statusu 403
    I system zwraca komunikat o braku uprawnień

