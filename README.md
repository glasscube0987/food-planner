# food-planner – perheen ruokalista

Selaimessa toimiva sovellus viikon ruokalistan suunnitteluun. Toimii myös puhelimella.

## Ominaisuudet

- **Yhteinen lista**: perheen puhelimet näkevät saman viikon, kauppalistan, säännöt ja reseptit, ja muutokset päivittyvät heti. Omassa osoitteessa (GitHub Pages) tallennus on Firebasessa, ja puhelimet yhdistetään kutsulinkillä ilman tunnuksia. claude.ai-artifaktina tallennus on artifaktin omassa tietokannassa. Ilman yhteistä listaa tiedot ovat selaimen muistissa.
- **Viikko**: valitse ruoat itse tai arvo koko viikko kerralla. 🥡 tekee päivästä tähdepäivän: syödään edellisen päivän ruokaa, ja edellisenä päivänä tehdään tuplasatsi. Yksittäisen päivän voi arpoa uudelleen, ja lukitut 🔒 päivät pysyvät ennallaan. *Seuraava viikko* siirtää nykyisen viikon historiaan.
- **Reseptit**: ruokapoolissa on valmiina 30 suomalaista kotiruokaa. Voit lisätä omia reseptejä ja muokata tai poistaa niitä. Ulkopuolisia reseptejä tuodaan kahdella tavalla. Reseptin tekstin voi liittää miltä tahansa sivustolta: sovellus poimii ainekset ja ohjeen, ja claude.ai-artifaktina Claude tekee sen tarkemmin. Artifaktina reseptin voi myös pyytää Claudelta. Omassa osoitteessa reseptejä voi hakea avoimesta [TheMealDB](https://www.themealdb.com)-tietokannasta (englanniksi).
- **Kauppalista**: muodostuu viikon ruoista. Samat ainekset yhdistetään, määrät skaalataan ruokailijoiden määrään ja yksiköt muunnetaan (5 dl + 1 l = 1,5 l). Perusmausteet näkyvät omana "Tarkista kaapista" ‑osionaan. Listaan voi lisätä muita ostoksia, ostetut voi merkitä, ja listan voi jakaa tai kopioida.
- **Säännöt**: arvonnan asetukset.
  - liha-, kala- ja kasvisruokien määrä viikossa (tai "ei väliä")
  - tähdepäivien määrä viikossa (oletus 2): arvonta valitsee niiden edelle ruoan, joka riittää kahdeksi päiväksi
  - suunniteltavat päivät
  - arkipäivien enimmäisvalmistusaika
  - saman ruokatyypin välttäminen peräkkäisinä päivinä
  - edellisten viikkojen ruokien toistamisen esto
  - pois suljettavat ja vaadittavat tunnisteet

Tiedot tallentuvat selaimen muistiin (localStorage). Säännöt-välilehdellä ne voi viedä tiedostoon ja tuoda toiselle laitteelle.

## Yhteinen lista Firebasella

1. Luo projekti osoitteessa https://console.firebase.google.com (Google Analytics ei tarvita).
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
3. **Build → Firestore Database → Create database** (sijainti esim. `europe-north1`, production mode).
4. **Firestore Database → Rules:** korvaa sisältö tiedoston [`firestore.rules`](firestore.rules) säännöillä ja paina Publish.
5. **Project settings → Your apps → Web (`</>`)**: rekisteröi sovellus ja kopioi `firebaseConfig`-arvot tiedostoon [`src/firebaseConfig.ts`](src/firebaseConfig.ts).

Asetukset eivät ole salaisia: pääsyä rajaavat säännöt ja perhekoodi, joka on vain perheen puhelimissa.

## Julkaisu

`main`-haaraan tehty muutos julkaistaan GitHub Pagesiin työnkululla [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Repon asetuksissa pitää olla **Settings → Pages → Source: GitHub Actions**.

## Kehitys

```sh
npm install
npm run dev        # kehityspalvelin
npm test           # yksikkötestit (arvonta, kauppalista, jäsennys)
npm run build      # tuotantoversio kansioon dist/
```

Rakennettu Reactilla, TypeScriptillä ja Vitellä. Sovelluslogiikka on kansiossa `src/lib/`, perusreseptit tiedostossa `src/data/seedRecipes.ts`.
