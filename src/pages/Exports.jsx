import { useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

const TAILLE_PAGE = 1000

// Lit toutes les lignes, par paquets de 1000 (limite de l'API)
async function toutLire(construire) {
  const lignes = []
  for (let debut = 0; ; debut += TAILLE_PAGE) {
    const { data, error } = await construire().range(debut, debut + TAILLE_PAGE - 1)
    if (error) throw new Error(error.message)
    lignes.push(...data)
    if (data.length < TAILLE_PAGE) break
  }
  return lignes
}

function cellule(v) {
  if (v === null || v === undefined) return ''
  let s = String(v)
  // Un texte qui commencerait par = + - @ serait interprété comme une formule par Excel
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s
  if (/[";\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'
  return s
}

function telecharger(nomFichier, entetes, lignes) {
  const contenu = [entetes, ...lignes].map((l) => l.map(cellule).join(';')).join('\r\n')
  // \uFEFF : indique à Excel que le fichier est en UTF-8 (accents)
  const blob = new Blob(['\uFEFF' + contenu], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomFichier
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const dh = (d) => (d ? new Date(d).toLocaleString('fr-FR') : '')
const ref = (id) => (id ? String(id).slice(0, 8).toUpperCase() : '')

function horodatage() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}h${p(d.getMinutes())}`
}

const TYPES = {
  solde_initial: 'Solde initial',
  recharge: 'Recharge',
  session: 'Fin de session',
  correction: 'Correction',
}
const STATUTS = { active: 'En cours', terminee: 'Terminée', annulee: 'Annulée' }

async function construireJoueurs() {
  const [joueurs, actives] = await Promise.all([
    toutLire(() =>
      supabase
        .from('players')
        .select('id, numero, nom, prenom, email, solde, actif, created_at')
        .order('numero')
    ),
    toutLire(() =>
      supabase
        .from('sessions')
        .select('id, player_id, jetons_apportes, game_tables(nom)')
        .eq('statut', 'active')
        .order('id')
    ),
  ])
  const parJoueur = {}
  actives.forEach((s) => {
    parJoueur[s.player_id] = s
  })
  return {
    entetes: ['Numéro', 'Nom', 'Prénom', 'Email', 'Total jetons', 'En réserve', 'Misés', 'Statut', 'Table', 'Inscrit le'],
    lignes: joueurs.map((j) => {
      const s = parJoueur[j.id]
      const mise = s ? s.jetons_apportes : 0
      return [
        j.numero,
        j.nom,
        j.prenom,
        j.email,
        j.solde,
        j.solde - mise,
        mise,
        !j.actif ? 'Désactivé' : s ? 'À une table' : 'Disponible',
        s?.game_tables?.nom || '',
        dh(j.created_at),
      ]
    }),
  }
}

async function construireClassement() {
  const joueurs = await toutLire(() =>
    supabase
      .from('players')
      .select('id, numero, nom, prenom, solde')
      .eq('actif', true)
      .order('solde', { ascending: false })
      .order('numero')
  )
  return {
    entetes: ['Rang', 'Numéro', 'Nom', 'Prénom', 'Total jetons'],
    lignes: joueurs.map((j) => [
      1 + joueurs.filter((o) => o.solde > j.solde).length,
      j.numero,
      j.nom,
      j.prenom,
      j.solde,
    ]),
  }
}

async function construireHistorique() {
  const lignes = await toutLire(() =>
    supabase
      .from('transactions')
      .select(
        'id, created_at, type, montant, solde_avant, solde_apres, motif, session_id, players(numero, nom, prenom), profiles(nom)'
      )
      .order('created_at')
      .order('id')
  )
  return {
    entetes: ['Date', 'Numéro', 'Nom', 'Prénom', 'Type', 'Variation', 'Solde avant', 'Solde après', 'Par', 'Motif', 'Réf. session'],
    lignes: lignes.map((t) => [
      dh(t.created_at),
      t.players?.numero,
      t.players?.nom,
      t.players?.prenom,
      TYPES[t.type] || t.type,
      t.montant,
      t.solde_avant,
      t.solde_apres,
      t.profiles?.nom,
      t.motif,
      ref(t.session_id),
    ]),
  }
}

async function construireSessions() {
  const [sessions, profils] = await Promise.all([
    toutLire(() =>
      supabase
        .from('sessions')
        .select(
          'id, started_at, ended_at, statut, jetons_apportes, jetons_depart, variation, banquier_id, closed_by, players(numero, nom, prenom), game_tables(nom)'
        )
        .order('started_at')
        .order('id')
    ),
    toutLire(() => supabase.from('profiles').select('id, nom').order('id')),
  ])
  const noms = {}
  profils.forEach((p) => {
    noms[p.id] = p.nom
  })
  return {
    entetes: ['Réf. session', 'Début', 'Fin', 'Numéro', 'Nom', 'Prénom', 'Table', 'Banquier (ouverture)', 'Clôturé par', 'Statut', 'Jetons apportés', 'Jetons au départ', 'Variation'],
    lignes: sessions.map((s) => [
      ref(s.id),
      dh(s.started_at),
      dh(s.ended_at),
      s.players?.numero,
      s.players?.nom,
      s.players?.prenom,
      s.game_tables?.nom,
      noms[s.banquier_id],
      s.closed_by ? noms[s.closed_by] : '',
      STATUTS[s.statut] || s.statut,
      s.jetons_apportes,
      s.jetons_depart,
      s.variation,
    ]),
  }
}

const EXPORTS = [
  {
    cle: 'joueurs',
    fichier: 'joueurs',
    titre: 'Registre des joueurs',
    desc: 'Tous les joueurs : coordonnées, total, jetons en réserve et misés, statut, table.',
    construire: construireJoueurs,
  },
  {
    cle: 'classement',
    fichier: 'classement',
    titre: 'Classement général',
    desc: 'Joueurs actifs triés par total de jetons, avec leur rang.',
    construire: construireClassement,
  },
  {
    cle: 'historique',
    fichier: 'historique',
    titre: 'Historique des mouvements',
    desc: 'Soldes initiaux, recharges, fins de session et corrections, avec solde avant et après.',
    construire: construireHistorique,
  },
  {
    cle: 'sessions',
    fichier: 'sessions',
    titre: 'Sessions de jeu',
    desc: 'Chaque présence à une table : joueur, table, banquier, jetons apportés, départ et résultat.',
    construire: construireSessions,
  },
]

export default function Exports() {
  const [enCours, setEnCours] = useState('')
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')

  const lancer = async (exp) => {
    const { entetes, lignes } = await exp.construire()
    telecharger(`${exp.fichier}_${horodatage()}.csv`, entetes, lignes)
    return lignes.length
  }

  const un = async (exp) => {
    setEnCours(exp.cle)
    setErreur('')
    setMessage('')
    try {
      const n = await lancer(exp)
      setMessage(`${exp.titre} : ${n} ligne(s) téléchargée(s).`)
    } catch (e) {
      setErreur(e.message)
    }
    setEnCours('')
  }

  const tout = async () => {
    setEnCours('tout')
    setErreur('')
    setMessage('')
    try {
      for (const exp of EXPORTS) {
        await lancer(exp)
        await new Promise((r) => setTimeout(r, 700))
      }
      setMessage('Sauvegarde complète téléchargée (4 fichiers).')
    } catch (e) {
      setErreur(e.message)
    }
    setEnCours('')
  }

  return (
    <Layout titre="Espace Respo">
      <div className="barre">
        <h2 style={{ margin: 0, flex: 1 }}>Exports CSV</h2>
        <button disabled={!!enCours} onClick={tout}>
          {enCours === 'tout' ? 'Téléchargement…' : '💾 Tout télécharger (sauvegarde)'}
        </button>
      </div>

      <p className="discret">
        Fichiers compatibles Excel. Ils contiennent des données personnelles (noms, emails) : conserve-les
        sur un appareil sécurisé et supprime-les quand ils ne servent plus. Si le navigateur demande
        d'autoriser plusieurs téléchargements, accepte.
      </p>

      {message && <p className="ok">{message}</p>}
      {erreur && <p className="erreur">{erreur}</p>}

      <div className="grille">
        {EXPORTS.map((exp) => (
          <div key={exp.cle} className="carte-table">
            <strong>{exp.titre}</strong>
            <p className="discret">{exp.desc}</p>
            <div>
              <button className="petit" disabled={!!enCours} onClick={() => un(exp)}>
                {enCours === exp.cle ? 'Préparation…' : '⬇️ Télécharger'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}