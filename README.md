# food-planner – perheen ruokalista

Selaimessa toimiva sovellus viikon ruokalistan suunnitteluun. Toimii myös puhelimella.

## Ominaisuudet

- **Yhteinen lista**: claude.ai-artifaktina avattuna suunnitelma, kauppalista, säännöt ja omat reseptit tallentuvat yhteisesti. Kaikki, joille sivu on jaettu muokkaajina, näkevät muutokset heti omalla puhelimellaan. Muualla tiedot tallentuvat selaimen muistiin.
- **Viikko**: valitse ruoat itse tai arvo koko viikko kerralla. 🥡 tekee päivästä tähdepäivän: syödään edellisen päivän ruokaa, ja edellisenä päivänä tehdään tuplasatsi. Yksittäisen päivän voi arpoa uudelleen, ja lukitut 🔒 päivät pysyvät ennallaan. *Seuraava viikko* siirtää nykyisen viikon historiaan.
- **Reseptit**: ruokapoolissa on valmiina 30 suomalaista kotiruokaa. Voit lisätä omia reseptejä ja muokata tai poistaa niitä. Ulkopuolisia reseptejä tuodaan kahdella tavalla. Artifaktina voit liittää reseptin tekstin miltä tahansa sivustolta (Claude muuntaa sen) tai pyytää Claudelta reseptin. Muualla haku tehdään avoimesta [TheMealDB](https://www.themealdb.com)-tietokannasta (englanniksi).
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

## Kehitys

```sh
npm install
npm run dev        # kehityspalvelin
npm test           # yksikkötestit (arvonta, kauppalista, jäsennys)
npm run build      # tuotantoversio kansioon dist/
```

Rakennettu Reactilla, TypeScriptillä ja Vitellä. Sovelluslogiikka on kansiossa `src/lib/`, perusreseptit tiedostossa `src/data/seedRecipes.ts`.
