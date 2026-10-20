import { useCallback, useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { useAuth } from '../AuthContext'
import { supabase } from '../lib/supabase'

const MIN_JETONS = 20 // doit correspondre à la règle dans la fonction SQL open_session

const norm = (s) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const nomComplet = (p) => `${p?.prenom || ''} ${p?.nom || ''}`.trim()

const heure = (d) =>
  new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

function FormAjout({ table, onClose, onDone }) {
  const [dispo, setDispo] = useState([])
  const [recherche, setRecherche] = useState('')
  const [choix, setChoix] = useState(null)
  const [jetons, setJetons] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    supabase.rpc('list_available_players').then(({ data }) => setDispo(data || []))
  }, [])

  const resultats = useMemo(() => {
    const q = norm(recherche)
    if (!q) return []
    return dispo
      .filter((j) => norm(`${j.prenom} ${j.nom}`).includes(q) || String(j.numero) === q)
      .slice(0, 6)
  }, [dispo, recherche])

  const valider = async () => {
    setEnvoi(true)
    setErreur('')
    const { error } = await supabase.rpc('open_session', {
      p_player_id: choix.id,
      p_table_id: table.id,
      p_jetons: parseInt(jetons, 10),
    })
    setEnvoi(false)
    if (error) return setErreur(error.message)
    onDone(`${nomComplet(choix)} installé avec ${jetons} jetons.`)
  }

  return (
    <Modal titre="Ajouter un joueur" onClose={onClose}>
      {!choix ? (
        <>
          <input
            autoFocus
            placeholder="Rechercher (nom, prénom ou n°)…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          <div className="resultats">
            {resultats.map((j) => (
              <button key={j.id} className="secondaire resultat" onClick={() => setChoix(j)}>
                <span>n°{j.numero} — {nomComplet(j)}</span>
                <strong>{j.solde} jetons</strong>
              </button>
            ))}
            {recherche && resultats.length === 0 && (
              <p className="discret">
                Aucun joueur disponible. Il est peut-être déjà à une table, ou pas encore inscrit.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <p>
            <strong>{nomComplet(choix)}</strong> — solde total : <strong>{choix.solde}</strong> jetons
          </p>
          <input
            autoFocus
            type="number"
            min={MIN_JETONS}
            max={choix.solde}
            placeholder={`Jetons apportés à la table (min ${MIN_JETONS})`}
            value={jetons}
            onChange={(e) => setJetons(e.target.value)}
          />
          <button className="petit secondaire" onClick={() => { setChoix(null); setJetons('') }}>
            ← Changer de joueur
          </button>
        </>
      )}
      {erreur && <p className="erreur">{erreur}</p>}
      <div className="boutons">
        <button className="secondaire" onClick={onClose}>Annuler</button>
        <button disabled={envoi || !choix || !jetons} onClick={valider}>Installer</button>
      </div>
    </Modal>
  )
}

function FormCloture({ session, onClose, onDone }) {
  const [depart, setDepart] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const valeur = depart === '' ? null : parseInt(depart, 10)
  const variation = valeur === null ? null : valeur - session.jetons_apportes

  const valider = async () => {
    setEnvoi(true)
    setErreur('')
    const { error } = await supabase.rpc('close_session', {
      p_session_id: session.id,
      p_jetons_depart: valeur,
    })
    setEnvoi(false)
    if (error) return setErreur(error.message)
    onDone(
      `${nomComplet(session.players)} : ${variation >= 0 ? '+' : ''}${variation} jetons. Session clôturée.`
    )
  }

  return (
    <Modal titre={`Clôturer — ${nomComplet(session.players)}`} onClose={onClose}>
      <p>
        Jetons apportés à l'arrivée : <strong>{session.jetons_apportes}</strong>
      </p>
      <input
        autoFocus
        type="number"
        min="0"
        placeholder="Jetons possédés au départ"
        value={depart}
        onChange={(e) => setDepart(e.target.value)}
      />
      {variation !== null && (
        <p className={variation >= 0 ? 'ok' : 'erreur'} style={{ fontSize: '1.2rem', margin: 0 }}>
          Résultat : {variation >= 0 ? '+' : ''}{variation} jetons
        </p>
      )}
      {erreur && <p className="erreur">{erreur}</p>}
      <div className="boutons">
        <button className="secondaire" onClick={onClose}>Annuler</button>
        <button disabled={envoi || valeur === null || valeur < 0} onClick={valider}>
          Valider la clôture
        </button>
      </div>
    </Modal>
  )
}

export default function Banquier() {
  const { profile } = useAuth()
  const [table, setTable] = useState(undefined) // undefined = chargement, null = aucune table
  const [sessions, setSessions] = useState([])
  const [ajout, setAjout] = useState(false)
  const [cloture, setCloture] = useState(null)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    if (!profile) return
    const { data: t } = await supabase
      .from('game_tables')
      .select('*')
      .eq('banquier_id', profile.id)
      .maybeSingle()
    setTable(t || null)
    if (!t) return setSessions([])
    const { data: s } = await supabase
      .from('sessions')
      .select('*, players(prenom, nom, solde, numero)')
      .eq('table_id', t.id)
      .order('started_at', { ascending: false })
      .limit(60)
    setSessions(s || [])
  }, [profile])

  useEffect(() => {
    charger()
    const t = setInterval(charger, 15000)
    return () => clearInterval(t)
  }, [charger])

  const actives = sessions.filter((s) => s.statut === 'active')
  const terminees = sessions.filter((s) => s.statut !== 'active').slice(0, 12)

  const fini = (msg) => {
    setMessage(msg)
    setAjout(false)
    setCloture(null)
    charger()
  }

  const annuler = async (s) => {
    if (!window.confirm(`Annuler la session de ${nomComplet(s.players)} ? Son solde ne change pas.`)) return
    setErreur('')
    const { error } = await supabase.rpc('cancel_session', { p_session_id: s.id })
    if (error) return setErreur(error.message)
    fini('Session annulée.')
  }

  if (table === undefined)
    return <Layout titre="Espace Banquier"><p>Chargement…</p></Layout>

  if (table === null)
    return (
      <Layout titre="Espace Banquier">
        <div className="card">
          <p>Aucune table ne t'est affectée pour l'instant. Demande à un responsable.</p>
        </div>
      </Layout>
    )

  return (
    <Layout titre="Espace Banquier">
      <div className="barre">
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{table.nom}</h2>
          <p className="discret">
            {table.type_jeu || 'Jeu non précisé'} · {actives.length}
            {table.capacite ? `/${table.capacite}` : ''} joueur(s) présent(s)
          </p>
        </div>
        <button
          onClick={() => setAjout(true)}
          disabled={!!table.capacite && actives.length >= table.capacite}
        >
          + Ajouter un joueur
        </button>
      </div>

      {!table.actif && <p className="erreur">Cette table est désactivée.</p>}
      {message && <p className="ok">{message}</p>}
      {erreur && <p className="erreur">{erreur}</p>}

      <h3>Joueurs à la table</h3>
      <div className="grille">
        {actives.map((s) => (
          <div key={s.id} className="carte-table">
            <div className="carte-haut">
              <strong>{nomComplet(s.players)}</strong>
              <span className="badge">n°{s.players?.numero}</span>
            </div>
            <p>Apporté : <strong>{s.jetons_apportes}</strong> jetons</p>
            <p className="discret">Arrivé à {heure(s.started_at)}</p>
            <div className="boutons" style={{ justifyContent: 'flex-start' }}>
              <button className="petit" onClick={() => setCloture(s)}>Clôturer</button>
              <button className="petit secondaire" onClick={() => annuler(s)}>Annuler</button>
            </div>
          </div>
        ))}
        {actives.length === 0 && <p className="discret">Personne à la table.</p>}
      </div>

      <h3>Dernières sessions terminées</h3>
      <div className="defile">
        <table className="tableau">
          <thead>
            <tr>
              <th>Joueur</th><th>Arrivée</th><th>Apporté</th><th>Départ</th><th>Résultat</th><th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {terminees.map((s) => (
              <tr key={s.id}>
                <td>{nomComplet(s.players)}</td>
                <td>{heure(s.started_at)}</td>
                <td>{s.jetons_apportes}</td>
                <td>{s.jetons_depart ?? '—'}</td>
                <td>
                  {s.variation === null || s.variation === undefined ? (
                    '—'
                  ) : (
                    <strong className={s.variation >= 0 ? 'ok' : 'erreur'}>
                      {s.variation >= 0 ? '+' : ''}{s.variation}
                    </strong>
                  )}
                </td>
                <td>{s.statut === 'annulee' ? 'Annulée' : 'Terminée'}</td>
              </tr>
            ))}
            {terminees.length === 0 && <tr><td colSpan="6">Aucune session terminée.</td></tr>}
          </tbody>
        </table>
      </div>

      {ajout && <FormAjout table={table} onClose={() => setAjout(false)} onDone={fini} />}
      {cloture && <FormCloture session={cloture} onClose={() => setCloture(null)} onDone={fini} />}
    </Layout>
  )
}