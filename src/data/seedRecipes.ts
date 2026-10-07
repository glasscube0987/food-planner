import { parseIngredientLines } from '../lib/parse'
import type { Category, Recipe } from '../lib/types'

/**
 * Sovelluksen mukana tulevat perusreseptit: tavallisia suomalaisia kotiruokia,
 * tekstit kirjoitettu tätä sovellusta varten. Ainesten nimet on kirjoitettu
 * perusmuodossa, jotta kauppalista yhdistää samat ainekset.
 */
/** Ruoat, jotka on helppo tehdä tuplasatsina ja jotka maistuvat myös seuraavana päivänä. */
const BATCH = new Set([
  'jauhelihakastike', 'lihapullat', 'makaronilaatikko', 'kaalilaatikko', 'karjalanpaisti', 'broilerikastike',
  'chili', 'lasagne', 'lihakeitto', 'kanakeitto', 'lohikeitto', 'kalakeitto', 'kasvissosekeitto',
  'kasvislasagne', 'kikhernecurry', 'linssikeitto', 'kasvispihvit', 'hernekeitto',
])

const recipe = (
  id: string,
  name: string,
  category: Category,
  minutes: number,
  tags: string[],
  ingredients: string,
  instructions: string,
  servings = 4,
): Recipe => ({
  ...(BATCH.has(id) ? { lastsTwoDays: true } : {}),
  id: `perus-${id}`,
  name,
  category,
  minutes,
  tags,
  servings,
  ingredients: parseIngredientLines(ingredients),
  instructions,
  source: { name: 'Sovelluksen perusreseptit' },
  isOwn: false,
})

export const SEED_RECIPES: Recipe[] = [
  // Liha
  recipe('jauhelihakastike', 'Jauhelihakastike ja perunat', 'liha', 35, ['nopea', 'arki', 'lasten suosikki'], `
400 g jauheliha
1 sipuli
2 rkl vehnäjauho
4 dl vesi
1 lihaliemikuutio
1 kg peruna
suola
mustapippuri`, 'Keitä perunat. Ruskista jauheliha ja hienonnettu sipuli pannulla. Ripottele jauhot pinnalle, lisää vesi ja liemikuutio ja anna hautua 10 minuuttia. Mausta suolalla ja pippurilla.'),
  recipe('lihapullat', 'Lihapullat ja muusi', 'liha', 50, ['lasten suosikki'], `
500 g jauheliha
1 sipuli
1 kananmuna
1 dl korppujauho
1 dl maito
1 kg peruna
50 g voi
2 dl maito
suola
mustapippuri`, 'Turvota korppujauhot maidossa. Sekoita joukkoon jauheliha, kananmuna, hienonnettu sipuli ja mausteet. Pyörittele pullat ja paista uunissa 225 °C noin 15 minuuttia. Keitä perunat ja survo muusiksi voin ja lämpimän maidon kanssa.'),
  recipe('makaronilaatikko', 'Makaronilaatikko', 'liha', 70, ['uuniruoka', 'lasten suosikki'], `
400 g makaroni
400 g jauheliha
1 sipuli
3 kananmuna
7 dl maito
suola
mustapippuri`, 'Keitä makaronit puolikypsiksi. Ruskista jauheliha ja sipuli. Sekoita vuoassa makaronit ja jauheliha. Vatkaa munat ja maito, mausta ja kaada vuokaan. Paista 200 °C noin 50 minuuttia.'),
  recipe('kaalilaatikko', 'Kaalilaatikko', 'liha', 120, ['uuniruoka', 'perinne'], `
1 kg valkokaali
400 g jauheliha
1 dl riisi
2 dl vesi
2 rkl siirappi
1 tl meirami
suola
puolukkahillo`, 'Silppua kaali ja kuullota kattilassa. Ruskista jauheliha. Sekoita kaali, jauheliha, raaka riisi, vesi ja mausteet vuokaan ja valuta siirappi pinnalle. Paista 175 °C noin 1,5 tuntia välillä sekoittaen. Tarjoa puolukan kanssa.'),
  recipe('karjalanpaisti', 'Karjalanpaisti', 'liha', 180, ['perinne', 'viikonloppu'], `
500 g naudanliha
500 g porsaanliha
2 sipuli
10 maustepippuri
2 laakerinlehti
suola
1 kg peruna`, 'Kuutioi lihat ja sipulit. Kerrosta pataan suolan ja mausteiden kanssa, lisää vettä niin että lihat juuri peittyvät. Haudu kannen alla 175 °C noin 3 tuntia. Tarjoa keitettyjen perunoiden kanssa.'),
  recipe('broileripasta', 'Kermainen broileripasta', 'liha', 25, ['nopea', 'arki', 'pasta'], `
400 g pasta
400 g broilerin suikale
1 sipuli
2 dl ruokakerma
100 g pinaatti
50 g parmesaani
suola`, 'Keitä pasta. Paista broileri ja sipuli pannulla. Lisää kerma ja pinaatti ja anna kiehahtaa. Sekoita pastan joukkoon ja raasta päälle parmesaania.'),
  recipe('broilerikastike', 'Broilerikastike ja riisi', 'liha', 30, ['arki'], `
400 g broilerin suikale
1 sipuli
1 paprika
2 dl ruokakerma
1 rkl currymauste
3 dl riisi
suola`, 'Keitä riisi. Paista broileri, sipuli ja paprika. Lisää curry ja kerma ja hauduta 5 minuuttia. Mausta suolalla.'),
  recipe('chili', 'Chili con carne', 'liha', 45, ['tulinen'], `
400 g jauheliha
1 sipuli
2 valkosipulinkynsi
400 g tomaattimurska
380 g kidneypavut
1 rkl chilijauhe
1 tl juustokumina
3 dl riisi
suola`, 'Ruskista jauheliha, sipuli ja valkosipuli. Lisää mausteet, tomaattimurska ja huuhdotut pavut. Hauduta 20 minuuttia. Tarjoa riisin kanssa.'),
  recipe('lasagne', 'Lasagne', 'liha', 90, ['uuniruoka', 'viikonloppu', 'pasta'], `
400 g jauheliha
1 sipuli
400 g tomaattimurska
250 g lasagnelevy
50 g voi
5 rkl vehnäjauho
8 dl maito
150 g juustoraaste
suola`, 'Valmista jauhelihakastike tomaattimurskasta, jauhelihasta ja sipulista. Tee valkokastike voista, jauhoista ja maidosta. Kerrosta vuokaan levyt, jauhelihakastike ja valkokastike, ja ripottele pinnalle juustoa. Paista 200 °C noin 45 minuuttia.'),
  recipe('tacot', 'Tacot', 'liha', 25, ['nopea', 'lasten suosikki', 'perjantai'], `
400 g jauheliha
1 pss tacomauste
8 tortilla
1 jäävuorisalaatti
2 tomaatti
1 kurkku
150 g juustoraaste
1 prk salsakastike
1 prk smetana`, 'Ruskista jauheliha ja mausta tacomausteella pakkauksen ohjeen mukaan. Pilko kasvikset. Jokainen kokoaa omat tacot.'),
  recipe('lihakeitto', 'Lihakeitto', 'liha', 120, ['keitto', 'perinne'], `
500 g naudanliha
1 kg peruna
3 porkkana
1 lanttu
1 sipuli
10 maustepippuri
suola`, 'Kuutioi liha, keitä vedessä mausteiden kanssa ja kuori vaahto. Hauduta tunti. Lisää kuutioidut juurekset ja keitä kypsiksi.'),
  recipe('nakkikastike', 'Nakkikastike ja perunat', 'liha', 30, ['nopea', 'arki', 'lasten suosikki'], `
400 g nakki
1 sipuli
2 dl ruokakerma
2 rkl tomaattipyree
1 kg peruna
suola`, 'Keitä perunat. Paista paloitellut nakit ja sipuli. Lisää kerma ja tomaattipyree ja anna kiehahtaa.'),
  recipe('pyttipannu', 'Pyttipannu', 'liha', 30, ['nopea', 'arki'], `
1 kg peruna
300 g kinkku
1 sipuli
4 kananmuna
punajuuri
suola`, 'Kuutioi keitetyt perunat, kinkku ja sipuli ja paista pannulla rapeiksi. Paista kananmunat. Tarjoa punajuuren kanssa.'),
  recipe('kanakeitto', 'Kanakeitto', 'liha', 40, ['keitto', 'arki'], `
400 g broilerin suikale
600 g peruna
2 porkkana
1 purjo
1 kanaliemikuutio
1 l vesi
suola`, 'Keitä kuutioidut perunat ja porkkanat liemessä. Lisää broileri ja purjo ja keitä vielä 10 minuuttia.'),

  // Kala
  recipe('lohikeitto', 'Lohikeitto', 'kala', 40, ['keitto', 'perinne'], `
400 g lohi
800 g peruna
1 porkkana
1 sipuli
1 kalaliemikuutio
1 l vesi
2 dl kuohukerma
1 nippu tilli
suola`, 'Keitä kuutioidut perunat, porkkana ja sipuli liemessä. Lisää kuutioitu lohi ja kerma ja anna hautua 5 minuuttia. Lisää tilli.'),
  recipe('uunilohi', 'Uunilohi ja perunat', 'kala', 35, ['uuniruoka', 'arki'], `
600 g lohi
1 kg peruna
1 sitruuna
1 nippu tilli
1 prk kermaviili
suola`, 'Keitä perunat. Mausta lohi suolalla ja sitruunalla ja paista 200 °C noin 20 minuuttia. Sekoita kermaviiliin tilliä kastikkeeksi.'),
  recipe('kalapuikot', 'Kalapuikot ja muusi', 'kala', 25, ['nopea', 'lasten suosikki', 'arki'], `
500 g kalapuikko
1 kg peruna
50 g voi
2 dl maito
1 kurkku
suola`, 'Paista kalapuikot uunissa pakkauksen ohjeen mukaan. Keitä perunat ja survo muusiksi voin ja maidon kanssa. Tarjoa kurkun kanssa.'),
  recipe('silakkapihvit', 'Silakkapihvit', 'kala', 45, ['perinne'], `
600 g silakkafilee
1 dl ruisjauho
50 g voi
1 kg peruna
1 nippu tilli
suola`, 'Mausta fileet suolalla ja tillillä ja paina ne pareittain vastakkain. Kääntele ruisjauhoissa ja paista voissa. Tarjoa perunoiden kanssa.'),
  recipe('tonnikalapasta', 'Tonnikalapasta', 'kala', 20, ['nopea', 'arki', 'pasta'], `
400 g pasta
2 tlk tonnikala
400 g tomaattimurska
1 sipuli
2 valkosipulinkynsi
suola`, 'Keitä pasta. Kuullota sipuli ja valkosipuli, lisää tomaattimurska ja tonnikala ja hauduta 10 minuuttia. Sekoita pastaan.'),
  recipe('kirjolohi', 'Paahdettu kirjolohi ja juurekset', 'kala', 45, ['uuniruoka'], `
600 g kirjolohi
1 kg peruna
4 porkkana
1 punasipuli
2 rkl öljy
1 sitruuna
suola`, 'Pilko juurekset pellille, sekoita öljyyn ja paahda 225 °C 25 minuuttia. Nosta kala juuresten päälle ja paista vielä 15 minuuttia.'),
  recipe('kalakeitto', 'Kermainen kalakeitto', 'kala', 35, ['keitto'], `
400 g valkoinen kalafilee
800 g peruna
1 purjo
1 kalaliemikuutio
1 l vesi
2 dl ruokakerma
suola`, 'Keitä kuutioidut perunat ja purjo liemessä. Lisää paloiteltu kala ja kerma ja hauduta, kunnes kala on kypsää.'),

  // Kasvis
  recipe('kasvissosekeitto', 'Kasvissosekeitto', 'kasvis', 35, ['keitto', 'nopea'], `
4 porkkana
600 g peruna
1 sipuli
1 kasvisliemikuutio
1 l vesi
1 dl ruokakerma
suola`, 'Keitä pilkotut kasvikset liemessä pehmeiksi. Soseuta, lisää kerma ja mausta.'),
  recipe('pinaattiletut', 'Pinaattiletut', 'kasvis', 40, ['lasten suosikki', 'perinne'], `
5 dl maito
2 kananmuna
2,5 dl vehnäjauho
150 g pinaatti
1 tl suola
puolukkahillo`, 'Vatkaa maito, munat, jauhot ja suola taikinaksi ja lisää pinaatti. Anna turvota 15 minuuttia ja paista ohuiksi letuiksi. Tarjoa puolukan kanssa.'),
  recipe('kasvislasagne', 'Kasvislasagne', 'kasvis', 80, ['uuniruoka', 'pasta'], `
1 kesäkurpitsa
1 munakoiso
1 paprika
400 g tomaattimurska
250 g lasagnelevy
8 dl maito
5 rkl vehnäjauho
50 g voi
150 g juustoraaste
suola`, 'Kuullota kuutioidut kasvikset ja lisää tomaattimurska. Tee valkokastike voista, jauhoista ja maidosta. Kerrosta levyt ja kastikkeet vuokaan, juustoa pinnalle. Paista 200 °C noin 45 minuuttia.'),
  recipe('kikhernecurry', 'Kikhernecurry', 'kasvis', 30, ['nopea', 'vegaani', 'arki'], `
2 prk kikherne
1 sipuli
2 valkosipulinkynsi
400 g tomaattimurska
4 dl kookosmaito
2 rkl currymauste
3 dl riisi
suola`, 'Keitä riisi. Kuullota sipuli ja valkosipuli, lisää curry, tomaattimurska, kookosmaito ja kikherneet. Hauduta 15 minuuttia.'),
  recipe('linssikeitto', 'Punainen linssikeitto', 'kasvis', 30, ['keitto', 'vegaani', 'nopea'], `
3 dl punainen linssi
1 sipuli
2 porkkana
400 g tomaattimurska
1 kasvisliemikuutio
1 l vesi
1 tl juustokumina
suola`, 'Kuullota sipuli ja porkkana. Lisää linssit, tomaattimurska, liemi ja mausteet ja keitä 20 minuuttia. Soseuta halutessasi.'),
  recipe('pestopasta', 'Pestopasta ja kirsikkatomaatit', 'kasvis', 15, ['nopea', 'pasta', 'arki'], `
400 g pasta
1 prk pesto
250 g kirsikkatomaatti
50 g parmesaani`, 'Keitä pasta ja sekoita joukkoon pesto ja puolitetut tomaatit. Raasta päälle parmesaania.'),
  recipe('kasvispizza', 'Kotipizza kasviksilla', 'kasvis', 60, ['perjantai', 'lasten suosikki'], `
5 dl vehnäjauho
2,5 dl vesi
1 pss kuivahiiva
1 rkl öljy
2 dl tomaattikastike
200 g mozzarella
1 paprika
200 g herkkusieni
1 punasipuli`, 'Sekoita taikina ja anna kohota 30 minuuttia. Kauli pellille, levitä kastike ja täytteet ja paista 250 °C noin 12 minuuttia.'),
  recipe('halloumiwokki', 'Halloumiwokki', 'kasvis', 25, ['nopea', 'arki'], `
250 g halloumi
1 pss wokkivihannes
3 rkl soijakastike
3 dl riisi`, 'Keitä riisi. Paista kuutioitu halloumi rapeaksi ja nosta sivuun. Paista vihannekset, lisää soija ja halloumi.'),
  recipe('kasvispihvit', 'Kasvispihvit ja perunamuusi', 'kasvis', 40, ['arki'], `
2 prk kikherne
1 sipuli
1 dl korppujauho
1 kananmuna
1 kg peruna
50 g voi
2 dl maito
suola`, 'Soseuta kikherneet, sekoita sipuli, korppujauho ja muna, muotoile pihveiksi ja paista. Keitä perunat ja survo muusiksi voin ja maidon kanssa.'),
  recipe('hernekeitto', 'Kasvishernekeitto', 'kasvis', 60, ['keitto', 'perinne', 'vegaani'], `
1 kg herne
1 sipuli
2 porkkana
1,5 l vesi
1 kasvisliemikuutio
sinappi
suola`, 'Keitä herneet (pakasteherneet tai liotetut kuivaherneet), sipuli ja porkkana liemessä pehmeiksi. Mausta ja tarjoa sinapin kanssa.'),
]
