import { useCallback, useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../AuthContext'
import { supabase } from '../lib/supabase'

const norm = (s) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function Recherche() {
  const { profile } = useAuth()
  const [joueurs, setJoueurs] = useState([])
  const [q, setQ] = useState('')
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    const { data } = await supabase.rpc('players_overview')
    setJoueurs(data || [])
    setChargement(false)
  }, [])

  useEffect(() => {
    charger()
    const t = setInterval(charger, 20000)
    return () => clearInterval(t)
  }, [charger])

  const resultats = useMemo(() => {
    const s = norm(q.trim())
    if (!s) return []
    if (s.length < 2 && !/^\d+$/.test(s)) return []
    return joueurs
      .filter(
        (j) =>
          norm(`${j.prenom} ${j.nom}`).includes(s) ||
          norm(`${j.nom} ${j.prenom}`).includes(s) ||
          String(j.numero) === s
      )
      .slice(0, 8)
  }, [joueurs, q])

  return (
    <Layout titre={profile?.role === 'banquier' ? 'Espace Banquier' : 'Espace Respo'}>
      <div className="barre">
        <h2 style={{ margin: 0, flex: 1 }}>Rechercher un joueur</h2>
        <button className="secondaire" onClick={charger}>Actualiser</button>
      </div>

      <input
        style={{ width: '100%', boxSizing: 'border-box', marginBottom: 14 }}
        autoFocus
        placeholder="Nom, prénom ou n°…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="grille">
        {resultats.map((j) => (
          <div key={j.id} className="carte-table">
            <div className="carte-haut">
              <strong>{j.prenom} {j.nom}</strong>
              <span className="badge">n°{j.numero}</span>
            </div>
            <p className="moyen">{j.total} <span className="discret">jetons</span></p>
            <div className="solde-bloc">
              <div><span>En réserve</span><strong>{j.stock}</strong></div>
              <div><span>Misés</span><strong>{j.mise}</strong></div>
            </div>
            <p className="discret">{j.table_nom ? `À la table : ${j.table_nom}` : 'Pas à une table'}</p>
          </div>
        ))}
        {q.trim() && resultats.length === 0 && !chargement && (
          <p className="discret">Aucun joueur trouvé.</p>
        )}
      </div>
    </Layout>
  )
}