import { useCallback, useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

export default function Classement() {
  const [joueurs, setJoueurs] = useState([])

  const charger = useCallback(async () => {
    const { data } = await supabase
      .from('players')
      .select('id, numero, nom, prenom, solde')
      .eq('actif', true)
      .order('solde', { ascending: false })
    setJoueurs(data || [])
  }, [])

  useEffect(() => {
    charger()
    const t = setInterval(charger, 20000)
    return () => clearInterval(t)
  }, [charger])

  // Même règle que la page joueur : les ex æquo partagent le même rang
  const classes = joueurs.map((j) => ({
    ...j,
    rang: 1 + joueurs.filter((o) => o.solde > j.solde).length,
  }))

  return (
    <Layout titre="Espace Respo">
      <div className="barre">
        <h2 style={{ margin: 0, flex: 1 }}>Classement</h2>
        <button className="secondaire" onClick={charger}>Actualiser</button>
      </div>

      <div className="defile">
        <table className="tableau">
          <thead>
            <tr>
              <th>Rang</th>
              <th>Joueur</th>
              <th>N°</th>
              <th>Solde</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((j) => (
              <tr key={j.id}>
                <td><strong>{j.rang === 1 ? '🥇' : j.rang === 2 ? '🥈' : j.rang === 3 ? '🥉' : j.rang}</strong></td>
                <td>{j.prenom} {j.nom}</td>
                <td>{j.numero}</td>
                <td><strong>{j.solde}</strong></td>
              </tr>
            ))}
            {classes.length === 0 && <tr><td colSpan="4">Aucun joueur.</td></tr>}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}