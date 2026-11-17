import { useCallback, useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

const norm = (s) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const nomComplet = (j) => `${j.prenom || ''} ${j.nom || ''}`.trim()

function FormInscription({ joueurs, onClose, onDone }) {
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [solde, setSolde] = useState('')
  const [erreur, setErreur] = useState('')
  const [doublon, setDoublon] = useState(false)
  const [envoi, setEnvoi] = useState(false)

  const similaires =
    norm(nom).length >= 2
      ? joueurs.filter((j) => norm(`${j.prenom} ${j.nom}`).includes(norm(nom))).slice(0, 5)
      : []

  const valider = async (force) => {
    setEnvoi(true)
    setErreur('')
    const { error } = await supabase.rpc('register_player', {
      p_nom: nom,
      p_prenom: prenom,
      p_solde_initial: parseInt(solde, 10) || 0,
      p_force: force,
      p_email: email,
    })
    setEnvoi(false)
    if (error) {
      setDoublon(error.message.includes('DOUBLON'))
      setErreur(error.message)
      return
    }
    onDone(`Joueur ${prenom} ${nom} inscrit.`)
  }

  return (
    <Modal titre="Inscrire un joueur" onClose={onClose}>
      <input placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
      <input placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
      <input
        type="email"
        placeholder="Email (pour consulter ses jetons)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="number"
        min="0"
        placeholder="Jetons achetés à l'inscription (facultatif)"
        value={solde}
        onChange={(e) => setSolde(e.target.value)}
      />
      {similaires.length > 0 && (
        <div className="alerte">
          Fiches existantes similaires :
          <ul>
            {similaires.map((j) => (
              <li key={j.id}>
                n°{j.numero} — {j.prenom} {j.nom} ({j.solde} jetons)
              </li>
            ))}
          </ul>
        </div>
      )}
      {erreur && <p className="erreur">{erreur}</p>}
      <div className="boutons">
        <button className="secondaire" onClick={onClose}>Annuler</button>
        {doublon ? (
          <button disabled={envoi} onClick={() => valider(true)}>Inscrire quand même</button>
        ) : (
          <button disabled={envoi} onClick={() => valider(false)}>Inscrire</button>
        )}
      </div>
    </Modal>
  )
}

function FormRecharge({ joueur, onClose, onDone }) {
  const [montant, setMontant] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const valider = async () => {
    setEnvoi(true)
    setErreur('')
    const { error } = await supabase.rpc('recharge_player', {
      p_player_id: joueur.id,
      p_montant: parseInt(montant, 10),
    })
    setEnvoi(false)
    if (error) return setErreur(error.message)
    onDone(`+${montant} jetons pour ${nomComplet(joueur)}.`)
  }

  return (
    <Modal titre={`Recharger ${nomComplet(joueur)}`} onClose={onClose}>
      <p>Solde actuel : <strong>{joueur.solde}</strong> jetons</p>
      <input
        type="number"
        min="1"
        placeholder="Montant à ajouter"
        value={montant}
        onChange={(e) => setMontant(e.target.value)}
      />
      {erreur && <p className="erreur">{erreur}</p>}
      <div className="boutons">
        <button className="secondaire" onClick={onClose}>Annuler</button>
        <button disabled={envoi || !montant} onClick={valider}>Confirmer</button>
      </div>
    </Modal>
  )
}

function FormCorrection({ joueur, onClose, onDone }) {
  const [nouveau, setNouveau] = useState('')
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const valider = async () => {
    setEnvoi(true)
    setErreur('')
    const { error } = await supabase.rpc('correct_balance', {
      p_player_id: joueur.id,
      p_nouveau_solde: parseInt(nouveau, 10),
      p_motif: motif,
    })
    setEnvoi(false)
    if (error) return setErreur(error.message)
    onDone(`Solde de ${nomComplet(joueur)} corrigé.`)
  }

  return (
    <Modal titre={`Corriger ${nomComplet(joueur)}`} onClose={onClose}>
      <p>Solde actuel : <strong>{joueur.solde}</strong> jetons</p>
      <input
        type="number"
        min="0"
        placeholder="Nouveau solde"
        value={nouveau}
        onChange={(e) => setNouveau(e.target.value)}
      />
      <input
        placeholder="Motif (obligatoire)"
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
      />
      {erreur && <p className="erreur">{erreur}</p>}
      <div className="boutons">
        <button className="secondaire" onClick={onClose}>Annuler</button>
        <button disabled={envoi || nouveau === '' || !motif} onClick={valider}>Corriger</button>
      </div>
    </Modal>
  )
}

function FormSuppression({ joueur, table, onClose, onDone }) {
  const [mode, setMode] = useState('retirer')
  const [confirme, setConfirme] = useState(false)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const definitif = mode === 'definitif'
  const bloque = !!table

  const valider = async () => {
    setEnvoi(true)
    setErreur('')
    const { error } = await supabase.rpc('remove_player', {
      p_id: joueur.id,
      p_definitif: definitif,
    })
    setEnvoi(false)
    if (error) return setErreur(error.message)
    onDone(
      definitif
        ? `${nomComplet(joueur)} supprimé définitivement, avec son historique.`
        : `${nomComplet(joueur)} retiré des listes. Son historique est conservé.`
    )
  }

  return (
    <Modal titre={`Supprimer ${nomComplet(joueur)}`} onClose={onClose}>
      <p>
        Solde actuel : <strong>{joueur.solde}</strong> jeton(s).
      </p>

      {bloque ? (
        <p className="erreur">
          Ce joueur est installé à la table « {table} ». Clôture ou annule d'abord sa session depuis
          l'espace banquier.
        </p>
      ) : (
        <>
          <label className="case">
            <input
              type="radio"
              name="mode"
              checked={!definitif}
              onChange={() => {
                setMode('retirer')
                setConfirme(false)
              }}
            />
            Retirer des listes (recommandé)
          </label>
          <p className="discret">
            Le joueur disparaît de la recherche, du classement, des QR codes et de l'accès joueur. Son
            historique et son solde sont conservés, et tu peux le remettre quand tu veux.
          </p>

          <label className="case">
            <input
              type="radio"
              name="mode"
              checked={definitif}
              onChange={() => setMode('definitif')}
            />
            Supprimer définitivement
          </label>
          <p className="discret">
            Le joueur est effacé avec tout son historique (recharges, sessions, corrections). C'est
            irréversible, et les totaux de l'événement changent.
          </p>

          {definitif && (
            <label className="case">
              <input type="checkbox" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} />
              Je comprends que cette suppression est définitive.
            </label>
          )}
        </>
      )}

      {erreur && <p className="erreur">{erreur}</p>}
      <div className="boutons">
        <button className="secondaire" onClick={onClose}>Annuler</button>
        <button
          className="danger"
          disabled={envoi || bloque || (definitif && !confirme)}
          onClick={valider}
        >
          {definitif ? 'Supprimer définitivement' : 'Retirer des listes'}
        </button>
      </div>
    </Modal>
  )
}

export default function Respo() {
  const [stats, setStats] = useState(null)
  const [joueurs, setJoueurs] = useState([])
  const [tableDe, setTableDe] = useState({})
  const [recherche, setRecherche] = useState('')
  const [tri, setTri] = useState('numero')
  const [retires, setRetires] = useState(false)
  const [action, setAction] = useState(null)
  const [inscription, setInscription] = useState(false)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    const [s, p, se] = await Promise.all([
      supabase.rpc('get_stats'),
      supabase.from('players').select('*').order('numero').range(0, 999),
      supabase.from('sessions').select('player_id, game_tables(nom)').eq('statut', 'active'),
    ])
    if (s.data) setStats(s.data)
    if (p.data) setJoueurs(p.data)
    const map = {}
    ;(se.data || []).forEach((x) => {
      map[x.player_id] = x.game_tables?.nom || '?'
    })
    setTableDe(map)
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const liste = useMemo(() => {
    const q = norm(recherche)
    const filtre = joueurs.filter(
      (j) =>
        (retires || j.actif) &&
        (!q || norm(`${j.prenom} ${j.nom}`).includes(q) || String(j.numero) === q)
    )
    return [...filtre].sort((a, b) =>
      tri === 'solde'
        ? b.solde - a.solde
        : tri === 'nom'
          ? norm(a.nom).localeCompare(norm(b.nom))
          : a.numero - b.numero
    )
  }, [joueurs, recherche, tri, retires])

  const nbRetires = joueurs.filter((j) => !j.actif).length

  const fini = (msg) => {
    setMessage(msg)
    setErreur('')
    setAction(null)
    setInscription(false)
    charger()
  }

  const reactiver = async (j) => {
    setErreur('')
    const { error } = await supabase.rpc('restore_player', { p_id: j.id })
    if (error) return setErreur(error.message)
    fini(`${nomComplet(j)} remis dans les listes.`)
  }

  return (
    <Layout titre="Espace Respo">
      {stats && (
        <div className="stats">
          <div className="stat"><span>Joueurs inscrits</span><strong>{stats.joueurs}</strong></div>
          <div className="stat"><span>En jeu</span><strong>{stats.en_jeu}</strong></div>
          <div className="stat"><span>Tables actives</span><strong>{stats.tables_actives}</strong></div>
          <div className="stat"><span>Total rechargements</span><strong>{stats.total_recharges}</strong></div>
          <div className="stat"><span>Somme des soldes</span><strong>{stats.somme_soldes}</strong></div>
        </div>
      )}

      {message && <p className="ok">{message}</p>}
      {erreur && <p className="erreur">{erreur}</p>}

      <div className="barre">
        <input
          placeholder="Rechercher (nom, prénom ou n°)…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <select value={tri} onChange={(e) => setTri(e.target.value)}>
          <option value="numero">Tri : n°</option>
          <option value="nom">Tri : nom</option>
          <option value="solde">Tri : solde (décroissant)</option>
        </select>
        <button onClick={() => setInscription(true)}>+ Inscrire un joueur</button>
      </div>

      {nbRetires > 0 && (
        <label className="case" style={{ marginBottom: 10 }}>
          <input type="checkbox" checked={retires} onChange={(e) => setRetires(e.target.checked)} />
          Afficher les joueurs retirés ({nbRetires})
        </label>
      )}

      <div className="defile">
        <table className="tableau">
          <thead>
            <tr>
              <th>N°</th>
              <th>Nom</th>
              <th>Solde</th>
              <th>Statut</th>
              <th>Table</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((j) => (
              <tr key={j.id} className={j.actif ? '' : 'inactive'}>
                <td>{j.numero}</td>
                <td>{j.prenom} {j.nom}</td>
                <td><strong>{j.solde}</strong></td>
                <td>{!j.actif ? 'Retiré' : tableDe[j.id] ? 'À une table' : 'Disponible'}</td>
                <td>{tableDe[j.id] || '—'}</td>
                <td className="actions">
                  {j.actif ? (
                    <>
                      <button className="petit" onClick={() => setAction({ type: 'recharge', joueur: j })}>
                        Recharger
                      </button>
                      <button className="petit secondaire" onClick={() => setAction({ type: 'correction', joueur: j })}>
                        Corriger
                      </button>
                    </>
                  ) : (
                    <button className="petit" onClick={() => reactiver(j)}>Remettre</button>
                  )}
                  <button className="petit secondaire" onClick={() => setAction({ type: 'suppression', joueur: j })}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {liste.length === 0 && (
              <tr><td colSpan="6">Aucun joueur.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {inscription && (
        <FormInscription joueurs={joueurs} onClose={() => setInscription(false)} onDone={fini} />
      )}
      {action?.type === 'recharge' && (
        <FormRecharge joueur={action.joueur} onClose={() => setAction(null)} onDone={fini} />
      )}
      {action?.type === 'correction' && (
        <FormCorrection joueur={action.joueur} onClose={() => setAction(null)} onDone={fini} />
      )}
      {action?.type === 'suppression' && (
        <FormSuppression
          joueur={action.joueur}
          table={tableDe[action.joueur.id]}
          onClose={() => setAction(null)}
          onDone={fini}
        />
      )}
    </Layout>
  )
}