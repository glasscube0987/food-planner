# food-planner – perheen ruokalista

Selaimessa toimiva sovellus viikon ruokalistan suunnitteluun. Toimii myös puhelimella.

## Ominaisuudet

- **Viikko**: valitse ruoat itse tai arvo koko viikko kerralla. Yksittäisen päivän voi arpoa uudelleen, ja lukitut 🔒 päivät pysyvät ennallaan. *Seuraava viikko* siirtää nykyisen viikon historiaan.
- **Reseptit**: ruokapoolissa on valmiina 30 suomalaista kotiruokaa. Voit lisätä omia reseptejä ja muokata tai poistaa niitä. Lisää reseptejä voi hakea avoimesta [TheMealDB](https://www.themealdb.com)-tietokannasta (englanniksi).
- **Kauppalista**: muodostuu viikon ruoista. Samat ainekset yhdistetään, määrät skaalataan ruokailijoiden määrään ja yksiköt muunnetaan (5 dl + 1 l = 1,5 l). Perusmausteet näkyvät omana "Tarkista kaapista" ‑osionaan. Listaan voi lisätä muita ostoksia, ostetut voi merkitä, ja listan voi jakaa tai kopioida.
- **Säännöt**: arvonnan asetukset.
  - liha-, kala- ja kasvisruokien määrä viikossa (tai "ei väliä")
  - suunniteltavat päivät
  - arkipäivien enimmäisvalmistusaika
  - saman ruokatyypin välttäminen peräkkäisinä päivinä
  - edellisten viikkojen ruokien toistamisen esto
  - pois suljettavat ja vaadittavat tunnisteet

Tiedot tallentuvat selaimen muistiin (localStorage). Säännöt-välilehdellä ne voi viedä tiedostoon ja tuoda toiselle laitteelle.

## Kehitys

```sh
npm install
npm run dev        # kehityspalvelin
npm test           # yksikkötestit (arvonta, kauppalista, jäsennys)
npm run build      # tuotantoversio kansioon dist/
```

Rakennettu Reactilla, TypeScriptillä ja Vitellä. Sovelluslogiikka on kansiossa `src/lib/`, perusreseptit tiedostossa `src/data/seedRecipes.ts`.
