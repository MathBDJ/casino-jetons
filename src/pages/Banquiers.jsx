import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import TableActivite from '../components/TableActivite'
import { supabase } from '../lib/supabase'

export default function Banquiers() {
  const [banquiers, setBanquiers] = useState([])
  const [choix, setChoix] = useState('')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, nom, actif')
      .eq('role', 'banquier')
      .order('nom')
      .then(({ data }) => {
        setBanquiers(data || [])
        if (data && data.length) setChoix(data[0].id)
      })
  }, [])

  return (
    <Layout titre="Espace Administrateur">
      <div className="barre">
        <h2 style={{ margin: 0, flex: 1 }}>Historique par banquier</h2>
        <select value={choix} onChange={(e) => setChoix(e.target.value)}>
          {banquiers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nom}{b.actif ? '' : ' (désactivé)'}
            </option>
          ))}
        </select>
      </div>
      {banquiers.length === 0 && <p className="discret">Aucun banquier pour l'instant.</p>}
      {choix && <TableActivite key={choix} banquierId={choix} />}
    </Layout>
  )
}