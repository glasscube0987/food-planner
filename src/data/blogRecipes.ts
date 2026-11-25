import { parseIngredientLines } from '../lib/parse'
import type { Recipe } from '../lib/types'

/**
 * Viimeistä murua myöten -blogin (viimeistamuruamyoten.com) suosituimmat pääruoat.
 * Suosio arvioitiin lukijoiden kommenttien määrästä (marraskuu 2026), koska blogissa
 * ei ole tähtiarvosteluja; arvontojen paisuttamat ja juhlaruokakirjoitukset jätettiin pois.
 * Aineslistat ovat blogista, ohjeet tiivistetty omin sanoin; koko ohje on lähdelinkissä.
 */
const blog = (
  slug: string,
  name: string,
  minutes: number,
  servings: number,
  lastsTwoDays: boolean,
  tags: string[],
  ingredients: string,
  instructions: string,
): Recipe => ({
  id: `vmm-${slug}`,
  name,
  category: 'kasvis',
  minutes,
  tags: ['kasvis', ...tags],
  servings,
  ...(lastsTwoDays ? { lastsTwoDays: true } : {}),
  ingredients: parseIngredientLines(ingredients),
  instructions,
  source: { name: 'Viimeistä murua myöten', url: `https://viimeistamuruamyoten.com/${slug}/` },
  isOwn: false,
})

export const BLOG_RECIPES: Recipe[] = [
  blog('taydellinen-tomaattikeitto', 'Uunitomaattikeitto', 80, 4, true, ['keitto'], `
1 kg tomaatti
2 sipuli
5 valkosipulinkynsi
1 porkkana
3 rkl oliiviöljy
1 rkl balsamiviinietikka
1 kasvisliemikuutio
1 ruukku basilika
2 tl sokeri
suola
mustapippuri`, 'Paahda halkaistut tomaatit, lohkotut sipulit ja porkkana sekä kuorelliset valkosipulit öljyn, sokerin ja suolan kanssa 220 °C:ssa noin 45 minuuttia. Siirrä kattilaan kuorittujen valkosipulien, basilikan ja 4 dl liemen kanssa ja keitä hiljaa 20–30 minuuttia. Mausta balsamicolla, sokerilla ja pippurilla ja soseuta.'),
  blog('maailman-parhaat-falafelit', 'Rapeat falafelit', 50, 4, false, ['viikonloppu'], `
2,5 dl kuivattu kikherne
1/2 sipuli
3 valkosipulinkynsi
1/2 nippu persilja
1/2 nippu korianteri
2,5 tl juustokumina
2 tl korianterijauhe
1 tl ruokasooda
seesaminsiemen
rypsiöljy
suola`, 'Liota kuivatut kikherneet yön yli (älä käytä tölkkikikherneitä). Aja kikherneet, sipulit, yrtit ja mausteet karkeaksi massaksi ja anna vetäytyä jääkaapissa 1–2 tuntia. Sekoita joukkoon veteen liuotettu sooda, pyörittele palloiksi ja seesaminsiemeniin. Paista öljyssä tai öljyttynä 200 °C:n uunissa noin 30 minuuttia. Tarjoa pitaleivän, salaatin ja kastikkeen kanssa.'),
  blog('palak-paneer-kaurapalalla-v', 'Pinaattitofucurry (palak paneer)', 35, 4, true, ['curry'], `
600 g tofu
2 chili
12 valkosipulinkynsi
1 sipuli
2 rkl inkivääri
3 rkl rypsiöljy
1 rkl juustokumina
1 rkl garam masala
1/2 tl kurkuma
500 g pakastepinaatti
2 dl kauramaito
2 rkl tomaattipyree
3 dl riisi
suola`, 'Ruskista tofukuutiot pannulla ja nosta sivuun. Soseuta chili, sipuli, valkosipuli ja inkivääri tahnaksi ja kuullota öljyssä mausteiden kanssa. Lisää sulatettu pinaatti, kauramaito ja tomaattipyree ja hauduta viitisen minuuttia. Mausta suolalla, lisää tofu ja tarjoa riisin kanssa.'),
  blog('tikka-masala-kikherneilla-v-gf', 'Kikherne-tikka masala', 40, 4, true, ['curry', 'arki'], `
1 sipuli
1 punasipuli
4 valkosipulinkynsi
1 paprika
1 chili
1 rkl inkivääri
2 tl juustokumina
1 tl garam masala
1 tl paprikajauhe
1/2 tl kurkuma
1 tlk tomaattimurska
1 rkl tomaattipyree
2 dl kaurakerma
1 tlk kikherne
3 rkl oliiviöljy
3 dl riisi`, 'Kuullota hienonnetut sipulit, valkosipuli ja chili öljyssä. Lisää inkivääri, paprikapalat ja mausteet ja hauduta, kunnes paprika on pehmeää. Lisää tomaattipyree, tomaattimurska ja kikherneet ja anna hautua vähintään 15 minuuttia. Viimeistele öljyllä ja kaurakermalla ja tarjoa riisin kanssa.'),
  blog('intialainen-tofucurry-v-gf', 'Intialainen tofucurry', 40, 4, true, ['curry'], `
1 sipuli
3 valkosipulinkynsi
2 rkl inkivääri
1,5 rkl garam masala
1/2 rkl kurkuma
1/2 rkl juustokumina
1 tl kardemumma
2 rkl sitruunamehu
2 rkl rypsiöljy
1 tlk kookosmaito
2 tomaatti
2 rkl tomaattipyree
1 rkl sokeri
300 g marinoitu tofu
3 dl riisi
suola`, 'Aja sipuli, valkosipuli, inkivääri, mausteet ja sitruunamehu tahnaksi ja kuullota öljyssä viitisen minuuttia. Lisää kookosmaito, pilkotut tomaatit, tomaattipyree ja sokeri ja hauduta noin 20 minuuttia. Kuivaa ja ruskista tofukuutiot kuivalla pannulla ja lisää kastikkeeseen. Tarjoa riisin kanssa.'),
  blog('tomaatti-kookos-linssikeitto-vegaani-gluteeniton', 'Tomaatti-kookos-linssikeitto', 35, 4, true, ['keitto', 'arki'], `
2 sipuli
2 rkl oliiviöljy
2 kasvisliemikuutio
2 dl punainen linssi
2 tlk tomaattimurska
2 tl juustokumina
2 tl currymauste
1 tl korianterijauhe
1 tl kurkuma
1 tlk kookosmaito
1 tl sokeri
suola`, 'Kuullota hienonnettu sipuli öljyssä. Lisää 8 dl vettä liemikuutioiden kanssa, linssit, tomaattimurska ja mausteet ja keitä noin 20 minuuttia, kunnes linssit ovat pehmeitä. Lisää kookosmaito, sokeri ja suola ja soseuta. Keitto kestää myös pakastamisen.'),
  blog('tofu-kookoskorma-v-gf', 'Tofu-kookoskorma', 30, 4, true, ['curry', 'nopea'], `
300 g marinoitu tofu
1 sipuli
2 valkosipulinkynsi
2 tl inkivääri
3 rkl rypsiöljy
2 rkl currymauste
1 tl chilihiutale
1,5 rkl sokeri
2,5 dl kookoskerma
500 g paseerattu tomaatti
3 dl riisi
suola`, 'Kuivaa tofukuutiot talouspaperin välissä. Kuullota hienonnetut sipulit, valkosipuli ja inkivääri öljyssä, lisää curry, chili ja sokeri ja paista hetki. Lisää kookoskerma ja tomaatti ja anna porista miedolla lämmöllä (mitä pidempään, sitä parempi). Ruskista tofu toisella pannulla, lisää kastikkeeseen ja tarjoa riisin kanssa.'),
  blog('vegaaninen-lasagne-v', 'Kasvislasagne soijarouheella', 100, 10, true, ['uuniruoka', 'pasta', 'viikonloppu'], `
12 lasagnelevy
1 sipuli
6 valkosipulinkynsi
1 porkkana
1 munakoiso
1 dl oliiviöljy
2 dl soijarouhe
1 kasvisliemikuutio
1/2 rkl paprikajauhe
1/2 dl punaviinietikka
1 rkl tomaattipyree
2 tlk tomaattimurska
1 l kasvimaito
1/2 dl rypsiöljy
1 dl vehnäjauho
2 dl kaurakerma
400 g vegaaninen juustoraaste
suola`, 'Kuullota sipuli ja valkosipuli, lisää raastettu porkkana ja kuutioitu munakoiso ja hauduta noin 10 minuuttia. Lisää soijarouhe ja 5 dl lientä ja kypsennä noin 20 minuuttia, sitten mausteet, etikka, tomaattipyree ja tomaattimurska, ja hauduta vielä vartti. Tee valkokastike öljystä, jauhoista, kasvimaidosta ja kaurakermasta ja mausta muskotilla. Kokoa kerroksiksi juuston kanssa ja paista 200 °C:ssa noin 45 minuuttia.'),
  blog('linssiragu-v-eli-maailman-paras-spagetti-bolognese', 'Linssibolognese', 70, 4, true, ['pasta'], `
1 punasipuli
3 valkosipulinkynsi
1 fenkoli
2 porkkana
2 tl fenkolinsiemen
2 tl kuivattu timjami
2 tl sokeri
2 rkl balsamiviinietikka
1 tlk tomaattimurska
1,5 dl kuivattu vihreä linssi
1 kasvisliemikuutio
1,5 dl punaviini
2 rkl soijakastike
400 g spagetti
oliiviöljy`, 'Kuullota ohuet sipulisiivut, valkosipuli, ohueksi leikattu fenkoli ja raastettu porkkana öljyssä pehmeiksi. Lisää mausteet, sokeri ja balsamico, sitten tomaattimurska, 8 dl lientä, punaviini ja linssit. Anna poreilla 45–60 minuuttia, kunnes linssit ovat kypsiä. Mausta soijalla ja tarjoa spagetin kanssa.'),
  blog('munakoiso-kikherne-kasvis-tagine-vegaani', 'Munakoiso-kikhernetagine ja kuskus', 60, 4, true, ['pata'], `
2 sipuli
3 valkosipulinkynsi
1,5 rkl inkivääri
1 tl kurkuma
1 tl kaneli
2 tl juustokumina
1 munakoiso
1 tlk kikherne
1/2 sitruuna
400 g tomaattimurska
1 kasvisliemikuutio
1 rkl hunaja
1 dl kuivattu aprikoosi
3 dl kuskus
1 sitruuna
1 nippu persilja
2 rkl oliiviöljy
suola`, 'Kuullota lohkotut sipulit, valkosipuli ja inkivääri ja lisää kaneli, kurkuma ja juustokumina. Lisää kuutioitu munakoiso, kikherneet, sitruunamehu, tomaattimurska, 5 dl lientä, hunaja ja kuivatut hedelmät. Hauduta kannen alla liedellä noin puoli tuntia tai uunissa 175 °C:ssa pari tuntia. Tarjoa sitruunalla ja persiljalla maustetun kuskusin kanssa. Maistuu seuraavana päivänä vielä paremmalta.'),
  blog('mustapapuhampurilaiset-vegaani', 'Mustapapuhampurilaiset', 45, 4, false, ['perjantai', 'lasten suosikki'], `
4 hampurilaissämpylä
1 tlk mustapapu
1 sipuli
4 valkosipulinkynsi
1 dl kaurahiutale
1/2 dl auringonkukansiemen
1/4 dl oliiviöljy
1 rkl soijakastike
1/2 tl savupaprikajauhe
1/2 tl juustokumina
3 porkkana
1 dl vegaaninen majoneesi
1 lime
1 avokado
1 pss salaatti
suola`, 'Kuullota sipuli ja valkosipuli. Aja valutetut pavut, sipulit, kaurahiutaleet, siemenet, öljy, soija ja mausteet massaksi ja muotoile pihveiksi. Paista 200 °C:n uunissa noin 15 minuuttia. Tee raastetuista porkkanoista, majoneesista ja limestä coleslaw ja kokoa hampurilaiset avokadon ja salaatin kanssa.'),
  blog('marokkolaiset-vegepyorykat-ja-tomaattitagine-v', 'Marokkolaiset vegepyörykät tomaattipadassa', 60, 4, true, ['pata'], `
275 g kasvisjauheliha
3 sipuli
2 valkosipulinkynsi
1 tl kaneli
1 tl paprikajauhe
1 nippu persilja
2 rkl rusina
1 paprika
2 tl juustokumina
1 tl kurkuma
1 tl kuivattu timjami
2 tlk tomaattimurska
1 rkl sitruunamehu
1 tl sokeri
1 tlk vihreä oliivi
3,5 dl kuskus
1 kasvisliemikuutio
1 appelsiini
suola`, 'Kuullota sipulisiivut mausteiden kanssa, lisää paprikapalat ja sitten tomaattimurska, sitruunamehu, sokeri ja suola, ja hauduta kannen alla ainakin puoli tuntia. Sekoita vegejauhis, kuullotettu sipuli, valkosipuli, persilja, rusinat ja mausteet ja pyörittele pyöryköiksi. Paista pyörykät pannulla ja nosta pataan oliivien kanssa. Tarjoa appelsiinilla maustetun kuskusin kanssa.'),
  blog('linssipyorykat-tagliatellea-tomaattikastiketta-vegaani-normaaliversio', 'Linssipyörykät ja tomaattipasta', 50, 3, false, ['pasta', 'lasten suosikki'], `
2 dl kuivattu linssi
1/2 dl kaurahiutale
2 rkl perunajauho
2 sipuli
5 valkosipulinkynsi
50 g parmesaani
2 rkl tomaattipyree
1 tlk tomaattimurska
1,5 tl sokeri
1 rkl balsamiviinietikka
250 g tagliatelle
suola
mustapippuri`, 'Keitä linssit kypsiksi ja valuta. Sekoita joukkoon kuullotettu sipuli, valkosipuli, kaurahiutaleet, perunajauhot, parmesaani (tai ravintohiiva), tomaattipyree ja mausteet ja anna vetäytyä. Tee kastike kuullotetusta sipulista ja tomaattimurskasta ja mausta sokerilla, suolalla ja balsamicolla. Paista pyörykät pannulla tai 200 °C:n uunissa 15–20 minuuttia ja tarjoa pastan kanssa.'),
  blog('nachoja-linssi-suklaamolea-ja-appelsiinisalsaa-vegaani', 'Nachot linssimolella ja appelsiinisalsalla', 35, 4, false, ['perjantai'], `
1 sipuli
1 valkosipulinkynsi
1 dl punainen linssi
2 rkl tomaattipyree
1,5 tl juustokumina
1 tl kaneli
1 tl savupaprikajauhe
1 kasvisliemikuutio
20 g tumma suklaa
1 avokado
2 lime
2 appelsiini
1 chili
1 punasipuli
1 pss nachot
1 prk kaurafraiche
korianteri
suola`, 'Kuullota sipuli, lisää mausteet, tomaattipyree, 5 dl lientä ja linssit ja keitä noin 10 minuuttia. Sulata suklaa joukkoon ja mausta. Sekoita salsa appelsiinilohkoista, punasipulista, chilistä ja limestä ja soseuta avokado limen kanssa kastikkeeksi. Kokoa nachojen päälle mole, salsa, avokado, fraiche ja korianteri.'),
  blog('butter-tofu-gf', 'Butter tofu', 45, 4, true, ['curry'], `
2 sipuli
5 valkosipulinkynsi
2 rkl inkivääri
1 tl chilihiutale
1 rkl garam masala
2 tl paprikajauhe
1,5 tl juustokumina
1 tl korianterijauhe
1 tl kurkuma
400 g paseerattu tomaatti
2 dl kaurakerma
50 g voi
300 g tofu
3 dl riisi
suola`, 'Kuivaa tofukuutiot painon alla. Soseuta sipulit, valkosipuli, inkivääri ja mausteet tahnaksi ja kypsennä rasvassa miedolla lämmöllä noin 10 minuuttia. Lisää paseerattu tomaatti, kaurakerma ja voi ja anna poreilla 15–20 minuuttia. Paista tofu rapeaksi, lisää kastikkeeseen ja tarjoa riisin kanssa.'),
  blog('mujadarra-riisi-vegaani-gluteeniton', 'Mujadarra eli linssiriisi', 40, 4, true, ['arki'], `
2 dl basmatiriisi
3 sipuli
3 valkosipulinkynsi
1 tl sokeri
2 tl ras el hanout
1 rkl juustokumina
1 tl kaneli
1 tl kurkuma
1 tlk ruskea linssi
1 granaattiomena
1 ruukku minttu
rypsiöljy
suola`, 'Keitä riisi. Paista yksi siivutettu sipuli öljyssä rapeaksi ja ruskeaksi, lisää loput sipulit, valkosipuli ja sokeri ja kuullota miedolla lämmöllä noin 15 minuuttia. Lisää mausteet ja riisi ja paista välillä pohjaan tarttuen noin 5 minuuttia, sitten linssit. Tarjoa granaattiomenan siementen ja mintun kanssa.'),
  blog('meksikolainen-makaronilaatikko-v', 'Meksikolainen makaronilaatikko', 60, 6, true, ['uuniruoka', 'lasten suosikki'], `
400 g makaroni
2 dl soijarouhe
1 pss tacomauste
1/2 rkl paprikajauhe
2 sipuli
3 valkosipulinkynsi
2 paprika
250 g kirsikkatomaatti
5 dl soijamaito
2,5 dl kaurakerma
1 pss nachot
150 g vegaaninen juustoraaste
rypsiöljy`, 'Keitä makaronit vähän pakkausohjetta lyhyemmin. Kuullota sipulit ja paprikapalat paprikajauheen kanssa, lisää tacomauste, soijarouhe ja 4 dl vettä ja anna rouheen kypsyä. Sekoita vuoassa makaronit, rouheseos, halkaistut kirsikkatomaatit, soijamaito ja kaurakerma. Murenna päälle nachoja ja juustoa ja paista 200 °C:ssa 30 minuuttia.'),
  blog('vanhan-jerusalemin-linssikeitto-v-gf', 'Jerusalemin linssikeitto', 50, 4, true, ['keitto', 'arki'], `
1 sipuli
2 valkosipulinkynsi
1 porkkana
2 rkl oliiviöljy
1/2 rkl juustokumina
1 tl kurkuma
3 kasvisliemikuutio
3 dl punainen linssi
1 sitruuna
1 nippu persilja
suola`, 'Kuullota sipuli öljyssä, lisää raastettu porkkana, valkosipuli ja juustokuminansiemenet ja paahda hetki. Lisää kurkuma, chili, 1,5 l lientä ja linssit (halutessa myös perunakuutioita) ja keitä 30–45 minuuttia. Soseuta halutessasi osittain ja mausta suolalla, sitruunan mehulla ja kuorella. Tarjoa persiljan kanssa.'),
  blog('malesialainen-tofulaksa-v-gf', 'Tofulaksa', 45, 4, false, ['keitto'], `
1 rkl seesamiöljy
1 rkl sitruunaruohotahna
1 chili
2 rkl inkivääri
3 valkosipulinkynsi
2 kevätsipuli
1 tl kurkuma
1 kasvisliemikuutio
1 lime
1 tlk kookosmaito
3 rkl soijakastike
1 rkl fariinisokeri
600 g marinoitu tofu
200 g riisinuudeli
1 pss maapähkinä`, 'Kuullota chili, sitruunaruoho, inkivääri, valkosipuli, kevätsipuli ja kurkuma seesamiöljyssä. Lisää 5 dl lientä ja limenlehdet tai -mehu ja keitä 10–15 minuuttia, sitten kookosmaito, soija ja sokeri. Paista kuivatut tofukuutiot rapeiksi ja kuorruta makealla soijalla. Kokoa kulhoon nuudelit, tofu ja pähkinät ja kaada liemi päälle.'),
  blog('vegetonnikala-pasta-puttanesca-vegaani-gluteeniton', 'Pasta puttanesca vegetonnikalalla', 25, 2, false, ['pasta', 'nopea'], `
70 g auringonkukansiemen
1/2 punasipuli
2 rkl kapris
1/2 rkl sitruunamehu
1/2 nori-levä
1 tlk tomaattimurska
1 rkl oliiviöljy
1 rkl punaviinietikka
1 tl chilihiutale
2 valkosipulinkynsi
1 dl vihreä oliivi
125 g pasta
basilika`, 'Liota auringonkukansiemenet yön yli ja aja karkeaksi massaksi punasipulin, kapristen, sitruunamehun, öljyn ja norilevän kanssa: siitä tulee vegetonnikala. Lämmitä tomaattimurska, öljy, etikka, chili, valkosipuli, kaprikset ja oliivit kastikkeeksi ja lisää suurin osa tonnikalaseoksesta. Tarjoa pastan päällä basilikan ja lopun tonnikalaseoksen kanssa.'),
  blog('maa-artisokkakeitto', 'Maa-artisokkakeitto', 40, 4, true, ['keitto'], `
1 sipuli
2 valkosipulinkynsi
1 rkl rypsiöljy
2 peruna
500 g maa-artisokka
1 rkl sitruunamehu
1 kasvisliemikuutio
2 dl kasvikerma
suola`, 'Kuullota sipuli ja valkosipuli. Lisää kuoritut ja paloitellut perunat ja maa-artisokat, liemikuutio, noin 6 dl vettä ja sitruunamehu ja keitä pehmeiksi. Soseuta ja lisää kerma ja suola. Päälle voi paistaa ohuista maa-artisokkasiivuista sipsejä.'),
  blog('libanonilainen-kikhernecurry-v', 'Libanonilainen kikhernecurry', 50, 4, true, ['curry'], `
1 tlk kikherne
1 munakoiso
250 g bataatti
1/2 dl oliiviöljy
1 sipuli
1 rkl inkivääri
1,5 rkl currymauste
1/2 tl kaneli
1/2 tl kurkuma
1 tl chilitahna
1 rkl tahini
5 dl turkkilainen kaurajogurtti
1/2 sitruuna
3/4 dl kookoshiutale
3 dl kuskus
1 granaattiomena`, 'Paista munakoisosiivut ruskeiksi ja keitä bataattikuutiot puolikypsiksi. Kuullota sipuli ja inkivääri, lisää mausteet ja kikherneet, sitten chilitahna, tahini, puolet jogurtista ja ¾ dl vettä sekä munakoiso ja bataatti, ja hauduta noin puoli tuntia. Paahda kookoshiutaleet öljyssä chilin kanssa ja sekoita loppuun jogurttiin raitaksi. Tarjoa kuskusin, raitan ja granaattiomenan kanssa.'),
  blog('intialainen-garam-masala-porkkana-bataattikeitto-vegaani', 'Garam masala -bataattikeitto', 45, 4, true, ['keitto'], `
2 sipuli
400 g bataatti
200 g porkkana
2 chili
2 valkosipulinkynsi
1 kasvisliemikuutio
1 lime
2 tl garam masala
1 tlk kookosmaito
suola
mustapippuri`, 'Paahda lohkotut porkkanat, bataatti, sipulit ja chilit pellillä 220 °C:ssa noin 25 minuuttia. Siirrä kattilaan, lisää 5 dl lientä, garam masala ja valkosipuli ja keitä hetki. Lisää limen mehu ja kookosmaito, soseuta ja mausta suolalla ja pippurilla.'),
  blog('kahden-juuston-punaviinipasta', 'Punaviinipasta kahdella juustolla', 25, 2, false, ['pasta', 'nopea'], `
3 dl punaviini
140 g spagetti
3 valkosipulinkynsi
1 dl saksanpähkinä
50 g homejuusto
100 g vuohenjuusto
2 tl kuivattu timjami
2 tl kuivattu rosmariini
oliiviöljy
suola
mustapippuri`, 'Keitä spagetti al denteksi vesi-punaviiniseoksessa ja ota keitinlientä talteen. Paahda rouhitut saksanpähkinät kuivalla pannulla. Paista valkosipuli öljyssä ripauksen chiliä kanssa, lisää ½ dl keitinlientä ja anna haihtua. Sekoita joukkoon pasta, yrtit, juustot, pähkinät ja pippuri.'),
  blog('vihrea-pasta', 'Vihreä pasta', 20, 4, false, ['pasta', 'nopea', 'arki'], `
400 g pasta
100 g lehtikaali
1 ruukku basilika
70 g pinaatti
1/2 dl ravintohiiva
300 g silkkitofu
1 sitruuna
2 valkosipulinkynsi
1/2 dl auringonkukansiemen
1 pss pinjansiemen
suola`, 'Keitä pasta. Aja lehtikaali, basilika, pinaatti, ravintohiiva, silkkitofu, sitruunan mehu, valkosipuli ja siemenet blenderissä tasaiseksi kastikkeeksi. Sekoita kastike kuumaan, valutettuun pastaan ja anna lämmetä keittämättä. Viimeistele paahdetuilla pinjansiemenillä ja pippurilla.'),
  blog('beanit-nuudeliwokki-v', 'Härkäpapu-nuudeliwokki', 20, 4, false, ['nopea', 'arki'], `
3 valkosipulinkynsi
3 porkkana
3 rkl seesamiöljy
2 rkl misotahna
3 rkl ruokosokeri
2 rkl soijakastike
1 rkl riisiviinietikka
1 rkl tomaattipyree
150 g pakastepapu
1 pkt härkäpapusuikale
100 g nuudeli
seesaminsiemen`, 'Paista hienonnettu valkosipuli ja raastettu porkkana seesamiöljyssä pehmeiksi. Lisää miso, sokeri, soija, etikka, tomaattipyree ja pari ruokalusikallista vettä, sitten pavut ja härkäpapusuikaleet, ja paista pari minuuttia. Keitä nuudelit ja sekoita ne lopuksi wokkiin. Ripottele päälle seesaminsiemeniä.'),
  blog('indonesialainen-tempecurry-v-gf', 'Indonesialainen tempecurry ja kookosriisi', 60, 3, false, ['curry', 'viikonloppu'], `
375 g tempe
5 kuivattu chili
3 valkosipulinkynsi
3 salottisipuli
3 rkl inkivääri
2 tl sitruunaruohotahna
1 dl maapähkinä
5 rkl soijakastike
1/2 dl rypsiöljy
2 punasipuli
1/2 dl fariinisokeri
2,5 rkl tamarinditahna
3 dl riisi
2 dl kookosmaito
1 kurkku
2 rkl riisiviinietikka
1 lime`, 'Paista tempekuutiot öljyssä ruskeiksi. Liota kuivatut chilit, poista siemenet ja aja tahnaksi sipulien, valkosipulin, inkiväärin, sitruunaruohon, maapähkinöiden ja soijan kanssa, ja kuullota öljyssä 5–10 minuuttia. Lisää punasipulirenkaat ja sokeri, sitten tempe, soija, tamarindi, vesi ja pähkinät. Tarjoa kookosmaidossa keitetyn riisin ja etikalla ja limellä pikkelöidyn kurkun kanssa.'),
  blog('meksikolainen-tomaattikeitto-v', 'Meksikolainen tomaatti-papukeitto', 50, 4, true, ['keitto'], `
1 sipuli
3 valkosipulinkynsi
2 porkkana
2 chili
1 tlk tomaattimurska
1 kasvisliemikuutio
1 rkl fariinisokeri
1 tl kuivattu oregano
1 tlk mustapapu
150 g maissi
1 lime
1 prk kaurafraiche
1 pss nachot
oliiviöljy
suola`, 'Kuullota sipuli ja raastettu porkkana, lisää chilit (mieluiten chipotle), tomaattimurska ja osa vedestä ja keitä 5 minuuttia. Soseuta, lisää loput 7,5 dl vedestä liemikuution, sokerin, oreganon ja suolan kanssa ja anna porista puoli tuntia. Lisää maissi ja huuhdellut mustapavut. Tarjoa limen, fraichen, korianterin ja nachojen kanssa.'),
]
