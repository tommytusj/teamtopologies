# Team Topologies Tower

Et nettleserbasert fysikkspill inspirert av Team Topologies og Jenga. Spilleren drar og stabler blokkformer som representerer ulike teamtyper innenfor et gitt tidsspill, og poeng gis ut fra høyden av det stabile tårnet.

## Hvordan spille

1. Åpne `index.html` i en moderne nettleser
2. Skriv inn ditt navn i tekstfeltet
3. Trykk "Start spill" for å begynne
4. Dra blokkene fra bunnen av skjermen og stabl dem på plattformen
5. Bygg tårnet så høyt som mulig innen 20 sekunder
6. Når tiden går ut, måles høyden av tårnet og resultatet lagres

## Team-typer og blokker

- **Plattform-team**: Brede, lave blokker (160×40px) i blå farge
- **Stream-aligned team (Verdistrøm)**: Firkantede blokker (80×80px) i gul farge  
- **Enabling team**: Høye, smale blokker (80×120px) i rosa farge
- **Complicated Subsystem team**: Små firkanter (60×60px) i oransje farge

## Tekniske detaljer

### Fysikkmotor
Spillet bruker Matter.js for realistisk fysikk:
- Redusert tyngdekraft for bedre spillbarhet
- Høy friksjon for stabil stabling
- Ingen sprett (restitution = 0)
- Blokkene roterer ikke når de dras

### Mobilstøtte
- Responsiv design som tilpasser seg skjermstørrelse
- Touch-drag kontroller for mobile enheter
- Touch-vennlige knappestørrelser
- Forhindrer zoom på iOS ved input

### Supabase-integrasjon

For å aktivere score-lagring til Supabase, oppdater følgende i `script.js`:

```javascript
const supabaseUrl = 'https://your-project.supabase.co'; // Din Supabase URL
const supabaseKey = 'your-anon-key'; // Din offentlige anon nøkkel
```

#### Supabase-oppsett

1. Opprett en tabell kalt `resultater` med følgende struktur:
```sql
CREATE TABLE resultater (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

2. Aktiver Row Level Security (RLS) og legg til en policy for INSERT:
```sql
-- Aktiver RLS
ALTER TABLE resultater ENABLE ROW LEVEL SECURITY;

-- Policy for å tillate insert for alle
CREATE POLICY "Allow insert for all" ON resultater
FOR INSERT TO public
WITH CHECK (true);
```

3. Erstatt placeholder-verdiene i `script.js` med dine faktiske Supabase-konfigurasjoner.

## Filstruktur

```
team-topologies-game/
├── index.html      # Hovedside med HTML-struktur
├── style.css       # CSS for styling og responsivt design  
├── script.js       # JavaScript med spillogikk og Matter.js
└── README.md       # Denne filen
```

## Nettleser-kompatibilitet

Spillet krever en moderne nettleser med støtte for:
- ES6+ JavaScript (const, let, arrow functions, async/await)
- Canvas API
- Touch events (for mobile)
- CSS Flexbox

Testet i Chrome, Firefox, Safari og Edge.