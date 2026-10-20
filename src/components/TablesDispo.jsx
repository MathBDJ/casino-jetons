import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function TablesDispo({ miennes = [] }) {
  const [tables, setTables] = useState(null)

  useEffect(() => {
    let actif = true
    const charger = async () => {
      const { data } = await supabase.rpc('get_tables_overview')
      if (actif) setTables(data || [])
    }
    charger()
    const t = setInterval(charger, 20000) // se met à jour toutes les 20 s
    return () => {
      actif = false
      clearInterval(t)
    }
  }, [])

  if (!tables) return null

  return (
    <div className="card tables-dispo">
      <span className="script">Où jouer ?</span>
      <h2 style={{ margin: 0 }}>Les tables</h2>

      {tables.length === 0 && <p className="discret">Aucune table ouverte pour le moment.</p>}

      {tables.map((t) => {
        const pleine = t.capacite !== null && t.places_libres === 0
        const ratio = t.capacite ? Math.min(100, Math.round((t.presents / t.capacite) * 100)) : 0
        return (
          <div key={t.nom} className="table-ligne">
            <div className="table-haut">
              <div>
                <strong>{t.nom}</strong>
                {miennes.includes(t.nom) && <span className="badge" style={{ marginLeft: 8 }}>Ta table</span>}
                {t.type_jeu && <div className="discret">{t.type_jeu}</div>}
              </div>
              {t.capacite === null ? (
                <span className="etat">{t.presents} joueur(s)</span>
              ) : pleine ? (
                <span className="etat complete">Complète</span>
              ) : (
                <span className="etat libre">
                  {t.places_libres} place{t.places_libres > 1 ? 's' : ''} libre{t.places_libres > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {t.capacite !== null && (
              <>
                <div className="jauge">
                  <span className={pleine ? 'pleine' : ''} style={{ width: `${ratio}%` }} />
                </div>
                <div className="discret">{t.presents} / {t.capacite} joueurs</div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}