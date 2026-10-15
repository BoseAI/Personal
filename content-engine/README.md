# Content engine: Shorts automatici a costo zero

Ogni mattina GitHub Actions:

1. legge le notizie tech/AI del momento (Google News, Google Trends, The Verge, TechCrunch);
2. sceglie la più interessante e scrive lo script con Gemini (piano gratuito);
3. genera la voce italiana con edge-tts (gratis);
4. disegna le scene e monta un video verticale 1080×1920 con sottotitoli parola per parola;
5. lo carica su YouTube come **privato**: lo guardi dall'app YouTube Studio e lo pubblichi con un tap.

Il passo 5 è voluto: il tuo controllo rende il canale "autentico" agli occhi di YouTube (i contenuti
prodotti in serie senza intervento umano non vengono monetizzati) ed evita di pubblicare errori.

## Configurazione (una volta sola, tutto gratis)

### 1. Chiave Gemini
- Vai su https://aistudio.google.com/apikey → *Create API key*.
- Su GitHub: repository → **Settings → Secrets and variables → Actions → New repository secret**:
  `GEMINI_API_KEY` = la chiave.

A questo punto il workflow funziona già: crea il video e lo allega al run (lo scarichi da GitHub).

### 2. Caricamento su YouTube
1. Crea il canale YouTube (consigliato un account Brand dedicato).
2. Su https://console.cloud.google.com crea un progetto e abilita **YouTube Data API v3**.
3. *Schermata consenso OAuth*: tipo **Esterno**, aggiungi la tua email tra gli utenti di test.
4. *Credenziali → Crea credenziali → ID client OAuth → App desktop*. Copia ID e secret.
5. Sul tuo computer:
   ```bash
   pip install requests
   python content-engine/youtube_auth.py ID_CLIENT SECRET_CLIENT
   ```
6. Aggiungi i secret `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`.

> **Da sapere:** finché il progetto Google Cloud non supera l'audit di YouTube, i video caricati via API
> restano privati (va benissimo: li pubblichi tu). Con l'app in modalità "test" il refresh token scade
> dopo 7 giorni: quando sei pronto, pubblica l'app nella schermata consenso (non serve la verifica per uso
> personale) così il token non scade più.

### 3. Attivare l'esecuzione giornaliera
Le esecuzioni programmate di GitHub partono solo dal branch principale: fai il merge di questo branch su
`main`. Puoi anche lanciarlo a mano: **Actions → Short giornaliero → Run workflow** (con un argomento a scelta).

## Uso in locale

```bash
pip install -r content-engine/requirements.txt   # serve anche ffmpeg installato
export GEMINI_API_KEY=...
python content-engine/run.py                     # trend del giorno
python content-engine/run.py --topic "iPhone 18" # argomento tuo
python content-engine/run.py --script mio.json   # script scritto a mano (vedi examples/)
python content-engine/run.py --offline           # prova senza rete (audio muto)
```

Il risultato finisce in `content-engine/output/<data>_<titolo>/` (`video.mp4`, `script.json`, `descrizione.txt`).

## Personalizzazione

| Variabile | Default | A cosa serve |
|---|---|---|
| `CHANNEL_NAME` | `AI SPIEGATA` | marchio in alto nel video |
| `NICHE` | AI e tech | tema del canale (entra nel prompt) |
| `TTS_VOICE` | `it-IT-DiegoNeural` | anche `it-IT-IsabellaNeural`, `it-IT-ElsaNeural` |
| `TTS_RATE` | `+8%` | velocità della voce |
| `YT_PRIVACY` | `private` | `public` solo quando ti fidi del sistema |
| `GEMINI_MODEL` | `gemini-2.5-flash` | modello del piano gratuito |

Musica di sottofondo: metti file `.mp3` senza copyright (es. dalla Libreria audio di YouTube Studio) in
`content-engine/assets/music/`; ne viene scelto uno a caso a volume basso.

## Il tuo lavoro: circa 10 minuti al giorno
- Apri YouTube Studio, guarda lo Short privato, se è corretto → **Pubblica**.
- Una volta a settimana: guarda quali video hanno funzionato e rispondi ai commenti.
