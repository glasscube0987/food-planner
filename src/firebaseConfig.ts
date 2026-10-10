/**
 * Firebase-projektin verkkosovellusasetukset (Firebase-konsoli → Project settings →
 * Your apps → SDK setup and configuration → Config). Nämä eivät ole salaisuuksia:
 * ne tunnistavat projektin, ja pääsyä rajaavat `firestore.rules`-säännöt.
 *
 * Kun arvo on null, yhteinen lista ei ole käytössä ja tiedot tallentuvat
 * vain selaimen muistiin.
 */
export type FirebaseConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket?: string
  messagingSenderId?: string
  appId: string
}

export const firebaseConfig: FirebaseConfig | null = null
