import { useCallback, useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

const norm = (s) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const LIBELLES = {
  solde_initial: 'Solde initial',
  recharge: 'Recharge',
  session: 'Fin de session',
  correction: 'Correction',
  ouverture: 'Installation',
  annulation: 'Annulation',
}

const dateHeure = (d) =>
  new Date(d).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function Historique() {
  const [lignes, setLignes] = useState([])
  const [recherche, setRecherche] = useState('')
  const [type, setType] = useState('tous')
  const [par, setPar] = useState('tous')
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    const { data } = await supabase.rpc('get_event_log', { p_limit: 500 })
    setLignes(data || [])
    setChargement(false)
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const auteurs = useMemo(
    () => [...new Set(lignes.map((l) => l.par).filter(Boolean))].sort(),
    [lignes]
  )

  const affichees = useMemo(() => {
    const q = norm(recherche)
    return lignes.filter(
      (l) =>
        (type === 'tous' || l.type === type) &&
        (par === 'tous' || l.par === par) &&
        (!q || norm(`${l.prenom} ${l.nom}`).includes(q) || String(l.numero) === q)
    )
  }, [lignes, recherche, type, par])

  return (
    <Layout titre="Espace Respo">
      <div className="barre">
        <h2 style={{ margin: 0, flex: 1 }}>Historique de l'événement</h2>
        <button className="secondaire" onClick={charger}>Actualiser</button>
      </div>

      <div className="barre">
        <input
          placeholder="Filtrer par joueur (nom ou n°)…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="tous">Tous les types</option>
          <option value="solde_initial">Soldes initiaux</option>
          <option value="recharge">Recharges</option>
          <option value="ouverture">Installations</option>
          <option value="session">Fins de session</option>
          <option value="annulation">Annulations</option>
          <option value="correction">Corrections</option>
        </select>
        <select value={par} onChange={(e) => setPar(e.target.value)}>
          <option value="tous">Toute l'équipe</option>
          {auteurs.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <p className="discret">
        {affichees.length} événement(s) affiché(s){lignes.length >= 500 ? ' (les 500 plus récents)' : ''}
      </p>

      <div className="defile">
        <table className="tableau">
          <thead>
            <tr>
              <th>Date</th>
              <th>Joueur</th>
              <th>Type</th>
              <th>Table</th>
              <th>Variation</th>
              <th>Avant</th>
              <th>Après</th>
              <th>Par</th>
              <th>Motif</th>
            </tr>
          </thead>
          <tbody>
            {affichees.map((l) => (
              <tr key={l.id}>
                <td>{dateHeure(l.created_at)}</td>
                <td>{l.prenom} {l.nom}</td>
                <td>{LIBELLES[l.type] || l.type}</td>
                <td>{l.table_nom || '—'}</td>
                <td>
                  {l.type === 'ouverture' ? (
                    <span>{l.montant} apportés</span>
                  ) : l.type === 'annulation' ? (
                    '—'
                  ) : (
                    <strong className={l.montant >= 0 ? 'ok' : 'erreur'}>
                      {l.montant >= 0 ? '+' : ''}{l.montant}
                    </strong>
                  )}
                </td>
                <td>{l.solde_avant ?? '—'}</td>
                <td>{l.solde_apres ?? '—'}</td>
                <td>{l.par || '—'}</td>
                <td>{l.motif || ''}</td>
              </tr>
            ))}
            {!chargement && affichees.length === 0 && (
              <tr><td colSpan="9">Aucun événement.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}