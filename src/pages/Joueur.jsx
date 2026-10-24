import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import TablesDispo from '../components/TablesDispo'
import LienPlan from '../components/LienPlan'

export default function Joueur() {
  const { token } = useParams()
  const [joueur, setJoueur] = useState(undefined)

  useEffect(() => {
    const charger = async () => {
      const { data } = await supabase.rpc('get_player_page', { p_token: token })
      setJoueur(data && data.length ? data[0] : null)
    }
    charger()
    const t = setInterval(charger, 30000) // rafraîchit toutes les 30 s
    return () => clearInterval(t)
  }, [token])

  if (joueur === undefined) return <div className="login"><p>Chargement…</p></div>
  if (joueur === null)
    return <div className="login"><p>Lien invalide. Redemande ton QR code.</p></div>

  return (
    <div className="login">
      <div className="colonne">
        <div className="card centre">
          <p>{joueur.prenom} {joueur.nom}</p>
          <p className="discret">Total</p>
          <p className="gros">{joueur.total}</p>
          <p>jetons</p>
          <div className="solde-bloc">
            <div>
              <span>En réserve</span>
              <strong>{joueur.stock}</strong>
            </div>
            <div>
              <span>{joueur.table_nom ? `Misés à ${joueur.table_nom}` : 'Misés'}</span>
              <strong>{joueur.mise}</strong>
            </div>
          </div>
          {!joueur.table_nom && <p className="discret">Tu n'es installé à aucune table.</p>}
        </div>

        <TablesDispo miennes={joueur.table_nom ? [joueur.table_nom] : []} />
        <LienPlan />
      </div>
    </div>
  )
}