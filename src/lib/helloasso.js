// Lecture et préparation de l'export HelloAsso (billetterie).
// Fichier pur (sans React ni Supabase) : facile à tester.

export const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const propre = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

// Colonnes indispensables (comparées sans accents ni majuscules)
const COLONNES = {
  commande: 'reference commande',
  statut: 'statut de la commande',
  nom: 'nom participant',
  prenom: 'prenom participant',
  email: 'email payeur',
  tarif: 'tarif',
  billet: 'numero de billet',
}
const LIBELLES = {
  commande: 'Référence commande',
  statut: 'Statut de la commande',
  nom: 'Nom participant',
  prenom: 'Prénom participant',
  email: 'Email payeur',
  tarif: 'Tarif',
  billet: 'Numéro de billet',
}

// tableau = liste de lignes (la première contient les en-têtes)
export function lireLignes(tableau) {
  if (!tableau || tableau.length < 2) return { lignes: [], manquantes: [], vide: true }
  const index = {}
  tableau[0].forEach((h, i) => {
    const cle = norm(h)
    if (cle && !(cle in index)) index[cle] = i
  })
  const manquantes = Object.keys(COLONNES)
    .filter((k) => !(COLONNES[k] in index))
    .map((k) => LIBELLES[k])
  if (manquantes.length) return { lignes: [], manquantes, vide: false }

  const lignes = []
  tableau.slice(1).forEach((r, i) => {
    if (!r || r.every((c) => c === null || c === undefined || String(c).trim() === '')) return
    const v = (k) => r[index[COLONNES[k]]]
    lignes.push({
      n: i + 2,
      commande: propre(v('commande')),
      statut: propre(v('statut')),
      nom: propre(v('nom')),
      prenom: propre(v('prenom')),
      email: propre(v('email')).toLowerCase(),
      tarif: propre(v('tarif')),
      billet: propre(v('billet')),
    })
  })
  return { lignes, manquantes: [], vide: false }
}

export function resume(lignes) {
  const compter = (cle) => {
    const m = new Map()
    lignes.forEach((l) => m.set(l[cle], (m.get(l[cle]) || 0) + 1))
    return [...m].map(([valeur, n]) => ({ valeur, n }))
  }
  return { statuts: compter('statut'), tarifs: compter('tarif') }
}

export const statutParDefaut = (statut) => norm(statut) === 'valide'
export const typeParDefaut = (tarif) => (norm(tarif).includes('jeton') ? 'jetons' : 'entree')

const cleLigne = (l) => [l.commande, norm(l.nom), norm(l.prenom)].join('|')

// etat = { billets: Set des numéros de billet déjà importés,
//          entrees: Map(cle -> player_id) des entrées déjà importées }
export function construirePlan(lignes, { statutsOk, types, jetonsParLigne, etat }) {
  const retenues = lignes.filter((l) => statutsOk.has(l.statut))
  const stats = {
    total: lignes.length,
    ignoreesStatut: lignes.length - retenues.length,
    dejaImportees: 0,
    ignoreesTarif: 0,
    sansBillet: 0,
  }

  const aTraiter = []
  const vus = new Set()
  retenues.forEach((l) => {
    if (!l.billet) return void stats.sansBillet++
    if (etat.billets.has(l.billet) || vus.has(l.billet)) return void stats.dejaImportees++
    vus.add(l.billet)
    const type = types[l.tarif] || typeParDefaut(l.tarif)
    if (type === 'ignorer') return void stats.ignoreesTarif++
    aTraiter.push({ ...l, type })
  })

  const personnes = new Map() // clé unique -> personne
  const premiere = new Map() // clé de commande/nom -> clé unique de la 1re entrée
  const ambigus = []
  aTraiter
    .filter((l) => l.type === 'entree')
    .forEach((l) => {
      const k = cleLigne(l)
      let unique = k
      if (premiere.has(k)) {
        ambigus.push(l)
        unique = `${k}#${personnes.size}`
      } else premiere.set(k, unique)
      personnes.set(unique, {
        cle: k,
        nom: l.nom,
        prenom: l.prenom,
        email: l.email,
        commande: l.commande,
        billet_entree: l.billet,
        lignes_jetons: [],
      })
    })

  const recharges = new Map() // player_id -> { player_id, lignes }
  const orphelins = []
  const jetonsInvalides = new Set()
  aTraiter
    .filter((l) => l.type === 'jetons')
    .forEach((l) => {
      const nb = Number(jetonsParLigne[l.tarif])
      if (!Number.isInteger(nb) || nb <= 0) {
        jetonsInvalides.add(l.tarif)
        return
      }
      const k = cleLigne(l)
      const cible = personnes.get(premiere.get(k))
      if (cible) cible.lignes_jetons.push({ billet: l.billet, jetons: nb })
      else if (etat.entrees.has(k)) {
        const id = etat.entrees.get(k)
        if (!recharges.has(id)) recharges.set(id, { player_id: id, lignes: [] })
        recharges.get(id).lignes.push({ billet: l.billet, jetons: nb })
      } else orphelins.push(l)
    })

  const liste = [...personnes.values()].map((p) => ({
    ...p,
    jetons: p.lignes_jetons.reduce((s, x) => s + x.jetons, 0),
  }))
  const rech = [...recharges.values()].map((r) => ({
    ...r,
    jetons: r.lignes.reduce((s, x) => s + x.jetons, 0),
  }))

  return {
    personnes: liste,
    recharges: rech,
    orphelins,
    ambigus,
    stats,
    jetonsInvalides: [...jetonsInvalides],
  }
}

// Repère les personnes déjà présentes (même nom et prénom) dans la base ou dans le fichier
export function marquerDoublons(personnes, joueurs) {
  const cle = (p) => `${norm(p.nom)}|${norm(p.prenom)}`
  const base = new Map()
  joueurs.forEach((j) => base.set(cle(j), j))
  const compte = new Map()
  personnes.forEach((p) => compte.set(cle(p), (compte.get(cle(p)) || 0) + 1))
  return personnes.map((p) => ({
    ...p,
    existant: base.get(cle(p)) || null,
    memeNomDansFichier: compte.get(cle(p)) > 1,
  }))
}

export function construireDonnees(personnes, recharges) {
  return {
    personnes: personnes.map((p) => ({
      nom: p.nom,
      prenom: p.prenom,
      email: p.email,
      commande: p.commande,
      cle: p.cle,
      billet_entree: p.billet_entree,
      lignes_jetons: p.lignes_jetons,
    })),
    recharges: recharges.map((r) => ({ player_id: r.player_id, lignes: r.lignes })),
  }
}