# BoseIA

App personale (PWA) installabile su iPhone e usabile da qualsiasi browser: finanze, liste della spesa, allenamento e alimentazione.

**Stack:** React 19 + TypeScript + Vite · Tailwind CSS v4 · TanStack Query · Recharts · Supabase (Postgres, Auth, Realtime, RLS) · deploy su Vercel. Tutto nei piani gratuiti.

## Struttura

```
src/
  auth/               login, sessione
  components/ui/      componenti base (Button, Sheet, IconPicker, …)
  components/layout/  shell con navigazione a tab
  lib/                client Supabase, formattazione €, date, icone
  modules/core/       sezioni (moduli), profilo, amministratore
  modules/home/       home con la scelta delle sezioni
  modules/finance/    conti, movimenti, categorie, ricorrenti, report
  modules/shopping/   liste della spesa condivise
  modules/workout/    catalogo esercizi, schede, allenamento live, corsa/nuoto
  modules/nutrition/  diario pasti, acqua, peso, obiettivi e valutazione
  modules/settings/   profilo, conti, utenti e sezioni (admin)
supabase/
  migrations/         schema del DB (unica fonte di verità)
  tests/              test SQL dello schema su Postgres locale
```

## Modello dati (finanze)

- **Conti** (`accounts`): ogni utente ha il suo conto personale, creato al primo accesso. I conti condivisi si creano dall'app.
- **Ruoli** (`account_members`), assegnati per conto: `owner` gestisce il conto e gli accessi, `editor` scrive, `viewer` legge. I permessi sono applicati dalla RLS di Postgres.
- **Categorie**: albero a due livelli (categoria › sottocategoria), separato per conto, con icona e colore. Quelle usate si archiviano invece di eliminarle.
- **Trasferimenti**: una categoria di uscita può puntare a una categoria di entrata di un altro conto. Ogni movimento confermato in quella categoria genera l'entrata speculare, sincronizzata da un trigger. Quando crei un conto condiviso, o vi aggiungi un membro con ruolo editor, nel conto personale dei membri compare "Trasferimenti › Versamento ‹conto›".
- **Ricorrenti**: con frequenza settimanale, mensile o annuale e "ogni N". Ognuna si può registrare in automatico oppure creare come *da confermare*. Le occorrenze scadute vengono generate da `generate_recurring()` a ogni apertura dell'app: l'operazione è idempotente.

## Spesa

- Ogni utente crea le sue **liste** (Alimentari, Materiale casa…) con icona e colore e può condividerle con altri utenti, ognuno con il suo ruolo (`owner` / `editor` / `viewer`).
- Elementi: nome + quantità (default 1). Aggiungere un elemento già presente ne aumenta la quantità, o lo rimette in lista se era spuntato.
- Per ogni lista si sceglie cosa succede agli spuntati: **in fondo**, **restano** al loro posto o **eliminati** (con *Annulla*).
- Ricerca su tutte le liste e dentro la singola lista; aggiornamenti in tempo reale tra i membri.

## Allenamento

- **Catalogo** di ~190 esercizi (`workout/catalog.ts`) con muscoli primari/secondari; ricerca per muscolo con ordinamento per pertinenza; esercizi personalizzati.
- **Schede** (`workout_plans.blocks`, JSON): blocchi singoli, superserie e circuiti; tipo di serie (normale, drop set, piramidale, rest-pause). Il *focus* pesa 1 per serie sui muscoli primari e 0,5 sui secondari.
- **Allenamento live** salvato in `localStorage` fino al termine: carichi precompilati dall'ultima sessione, timer di recupero (a fine giro per superserie/circuiti).
- **Corsa e nuoto** registrati a mano (un'app web non può leggere Salute/Apple Watch), riepilogo settimanale e progressi (1RM stimato con Epley).

## Alimentazione

- **Cibi**: catalogo di ~180 alimenti comuni (valori medi CREA/USDA per 100 g), cibi propri, ricerca e codice a barre su **Open Food Facts** (i prodotti usati vengono salvati tra i propri).
- **Obiettivi**: Mifflin-St Jeor × attività quotidiana (sport escluso), −20% / +10% per dimagrire / massa; proteine e grassi in g/kg, carboidrati per differenza, acqua 35 ml/kg. Nei giorni di allenamento si aggiungono le kcal stimate (MET × peso × ore) e 500 ml d'acqua per ora. Ogni valore si può correggere a mano.
- **Valutazione del giorno** (0-100): calorie 35, proteine 25, acqua 20, equilibrio carboidrati/grassi 10, movimento 10.
- **Peso**: pesate con media mobile a 7 giorni e peso obiettivo.

## Amministratore e sezioni

Il primo utente registrato è amministratore (`profiles.is_admin`). Da Impostazioni → *Utenti e sezioni* decide quali sezioni vede ciascun utente (`user_module_access`) e può nominare altri amministratori.

## Setup (una volta)

### 1. Supabase
1. Crea un progetto gratuito su [supabase.com](https://supabase.com).
2. **SQL Editor**: esegui **in ordine** ogni file di `supabase/migrations/` (uno per query). Ogni nuova migration va eseguita una sola volta. In alternativa usa la CLI: `supabase link` seguito da `supabase db push`.
3. **Authentication → Sign In / Providers**: disattiva *Allow new users to sign up*, così l'accesso avviene solo su invito.
4. **Authentication → Users → Add user**: crea il tuo utente e quello della tua ragazza con email e password, spuntando *Auto Confirm*. Il nome visualizzato si può cambiare dalle Impostazioni dell'app.
5. **Project Settings → API**: copia *Project URL* e *Publishable key*.

### 2. Locale
```bash
cp .env.example .env.local   # incolla URL e key
npm install
npm run dev
```

### 3. Deploy (Vercel)
1. Su [vercel.com](https://vercel.com) importa il repository GitHub.
2. Imposta le variabili `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Da quel momento ogni push sul branch principale pubblica una nuova versione.

### 4. iPhone
Apri l'URL in Safari, poi Condividi → **Aggiungi alla schermata Home**.

## Comandi

| | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | typecheck + build di produzione |
| `npm run lint` | oxlint |
| `npm run db:test` | migration + test SQL su un DB Postgres locale usa-e-getta (`PGURL=postgres://…`) |
