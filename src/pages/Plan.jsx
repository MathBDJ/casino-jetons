import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import PlanContenu from '../components/PlanContenu'
import { useAuth } from '../AuthContext'

export default function Plan() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const retour = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  if (loading) return <div className="login"><p>Chargement…</p></div>

  // Membre de l'organisation connecté : avec son menu
  if (profile && profile.actif)
    return (
      <Layout titre="Plan de l'événement">
        <h2>Plan de l'événement</h2>
        <PlanContenu />
      </Layout>
    )

  // Visiteur : page simple, sans connexion
  return (
    <div className="login">
      <div className="colonne large">
        <div className="card">
          <div className="marque-grande">
            <span className="script">La Nuit de l'Institut</span>
            <h1>Plan de l'événement</h1>
          </div>
          <PlanContenu />
          <button className="secondaire" onClick={retour}>← Retour</button>
        </div>
      </div>
    </div>
  )
}