import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const LIBELLES = { ouverture: 'Installation', cloture: 'Clôture', annulation: 'Annulation' }

const dateHeure = (d) =>
  new Date(d).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function TableActivite({ banquierId }) {
  const [lignes, setLignes] = useState([])
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    if (!banquierId) return
    const { data } = await supabase.rpc('get_banker_activity', { p_banquier: banquierId })
    setLignes(data || [])
    setChargement(false)
  }, [banquierId])

  useEffect(() => {
    charger()
    const t = setInterval(charger, 20000)
    return () => clearInterval(t)
  }, [charger])

  const nb = (type) => lignes.filter((l) => l.type === type).length

  return (
    <>
      <div className="stats">
        <div className="stat"><span>Installations</span><strong>{nb('ouverture')}</strong></div>
        <div className="stat"><span>Clôtures</span><strong>{nb('cloture')}</strong></div>
        <div className="stat"><span>Annulations</span><strong>{nb('annulation')}</strong></div>
      </div>

      <div className="defile">
        <table className="tableau">
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Joueur</th>
              <th>Table</th>
              <th>Apporté</th>
              <th>Départ</th>
              <th>Résultat</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i}>
                <td>{dateHeure(l.created_at)}</td>
                <td>{LIBELLES[l.type] || l.type}</td>
                <td>{l.prenom} {l.nom}</td>
                <td>{l.table_nom}</td>
                <td>{l.jetons_apportes}</td>
                <td>{l.jetons_depart ?? '—'}</td>
                <td>
                  {l.type === 'cloture' && l.variation !== null ? (
                    <strong className={l.variation >= 0 ? 'ok' : 'erreur'}>
                      {l.variation >= 0 ? '+' : ''}{l.variation}
                    </strong>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
            {!chargement && lignes.length === 0 && (
              <tr><td colSpan="7">Aucune action enregistrée.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}