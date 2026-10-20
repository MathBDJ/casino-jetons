import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import TablesDispo from '../components/TablesDispo'

function lire() {
  try {
    return localStorage.getItem('email_joueur') || ''
  } catch {
    return ''
  }
}

export default function JoueurEmail() {
  const [saisie, setSaisie] = useState(lire())
  const [email, setEmail] = useState(lire())
  const [joueurs, setJoueurs] = useState(null) // null = pas encore cherché
  const [chargement, setChargement] = useState(false)

  useEffect(() => {
    if (!email) return
    let actif = true
    const charger = async (premier) => {
      if (premier) setChargement(true)
      const { data } = await supabase.rpc('get_players_by_email', { p_email: email })
      if (!actif) return
      setJoueurs(data || [])
      setChargement(false)
    }
    charger(true)
    const t = setInterval(() => charger(false), 30000)
    return () => {
      actif = false
      clearInterval(t)
    }
  }, [email])

  const chercher = (e) => {
    e.preventDefault()
    const v = saisie.trim().toLowerCase()
    setJoueurs(null)
    setEmail(v)
    try {
      localStorage.setItem('email_joueur', v)
    } catch {
      /* sans importance */
    }
  }

  const changer = () => {
    setEmail('')
    setJoueurs(null)
    try {
      localStorage.removeItem('email_joueur')
    } catch {
      /* sans importance */
    }
  }

  const miennes = (joueurs || []).map((j) => j.table_nom).filter(Boolean)

  return (
    <div className="login">
      <div className="colonne">
        <div className="card" style={{ maxWidth: 'none' }}>
          <div className="marque-grande">
            <span className="script">La Nuit de l'Institut</span>
            <h1>Mes jetons</h1>
          </div>

          {!email && (
            <form onSubmit={chercher} style={{ display: 'contents' }}>
              <p className="discret">Entre l'adresse email utilisée pour ton inscription.</p>
              <input
                type="email"
                placeholder="Ton email"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                required
              />
              <button type="submit">Voir mes jetons</button>
            </form>
          )}

          {email && chargement && <p>Chargement…</p>}

          {email && joueurs && joueurs.length === 0 && (
            <p className="erreur">
              Aucun joueur trouvé avec cet email. Vérifie l'adresse, ou utilise ton QR code.
            </p>
          )}

          {email &&
            joueurs &&
            joueurs.map((j) => (
              <div key={j.numero} className="centre" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p>{j.prenom} {j.nom}</p>
                <p className="gros">{j.total}</p>
                <p className="discret">jetons au total</p>
                <div className="solde-bloc">
                  <div><span>En réserve</span><strong>{j.stock}</strong></div>
                  <div><span>{j.table_nom ? `Misés à ${j.table_nom}` : 'Misés'}</span><strong>{j.mise}</strong></div>
                </div>
                {!j.table_nom && <p className="discret">Tu n'es installé à aucune table.</p>}
              </div>
            ))}

          {email && (
            <button className="secondaire" onClick={changer}>Changer d'email</button>
          )}
          <Link to="/login" className="discret centre">← Connexion équipe</Link>
        </div>

        {email && joueurs && joueurs.length > 0 && <TablesDispo miennes={miennes} />}
      </div>
    </div>
  )
}