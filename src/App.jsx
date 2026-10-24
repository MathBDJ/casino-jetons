import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Login from './pages/Login'
import Respo from './pages/Respo'
import Tables from './pages/Tables'
import Equipe from './pages/Equipe'
import Historique from './pages/Historique'
import Classement from './pages/Classement'
import QrCodes from './pages/QrCodes'
import Exports from './pages/Exports'
import Administration from './pages/Administration'
import Banquiers from './pages/Banquiers'
import Banquier from './pages/Banquier'
import MonHistorique from './pages/MonHistorique'
import Recherche from './pages/Recherche'
import Alertes from './pages/Alertes'
import Plan from './pages/Plan'
import PlanGestion from './pages/PlanGestion'
import Joueur from './pages/Joueur'
import JoueurEmail from './pages/JoueurEmail'
import AlerteBanniere from './components/AlerteBanniere'
import AlerteBouton from './components/AlerteBouton'
import Signature from './components/Signature'

const STAFF = ['respo', 'president']

function Accueil() {
  const { session, profile, loading, signOut } = useAuth()
  if (loading) return <div className="login"><p>Chargement…</p></div>
  // Visiteur non connecté : la page d'accueil est celle des joueurs
  if (!session) return <Navigate to="/joueur" replace />
  if (!profile || !profile.actif)
    return (
      <div className="login">
        <div className="card">
          <p>Ton compte n'a pas de profil actif. Contacte un responsable.</p>
          <button onClick={signOut}>Déconnexion</button>
        </div>
      </div>
    )
  return <Navigate to={profile.role === 'banquier' ? '/banquier' : '/respo'} replace />
}

function Protege({ roles, children }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <div className="login"><p>Chargement…</p></div>
  if (!session) return <Navigate to="/login" replace />
  if (!profile || !profile.actif || !roles.includes(profile.role)) return <Navigate to="/" replace />
  return children
}

function PageLogin() {
  const { session, loading } = useAuth()
  if (loading) return <div className="login"><p>Chargement…</p></div>
  if (session) return <Navigate to="/" replace />
  return <Login />
}

// Éléments présents sur toutes les pages
function Globaux() {
  const { profile } = useAuth()
  const staff = !!profile && profile.actif && STAFF.includes(profile.role)
  return (
    <>
      {staff && <AlerteBanniere />}
      <AlerteBouton />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Globaux />
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/login" element={<PageLogin />} />
          <Route path="/joueur" element={<JoueurEmail />} />
          <Route path="/j/:token" element={<Joueur />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/recherche" element={<Protege roles={['respo', 'president', 'banquier']}><Recherche /></Protege>} />
          <Route path="/respo" element={<Protege roles={STAFF}><Respo /></Protege>} />
          <Route path="/respo/tables" element={<Protege roles={STAFF}><Tables /></Protege>} />
          <Route path="/respo/plan" element={<Protege roles={STAFF}><PlanGestion /></Protege>} />
          <Route path="/respo/equipe" element={<Protege roles={STAFF}><Equipe /></Protege>} />
          <Route path="/respo/historique" element={<Protege roles={STAFF}><Historique /></Protege>} />
          <Route path="/respo/classement" element={<Protege roles={STAFF}><Classement /></Protege>} />
          <Route path="/respo/alertes" element={<Protege roles={STAFF}><Alertes /></Protege>} />
          <Route path="/respo/qr" element={<Protege roles={STAFF}><QrCodes /></Protege>} />
          <Route path="/respo/exports" element={<Protege roles={STAFF}><Exports /></Protege>} />
          <Route path="/respo/banquiers" element={<Protege roles={['president']}><Banquiers /></Protege>} />
          <Route path="/respo/admin" element={<Protege roles={['president']}><Administration /></Protege>} />
          <Route path="/banquier" element={<Protege roles={['banquier']}><Banquier /></Protege>} />
          <Route path="/banquier/historique" element={<Protege roles={['banquier']}><MonHistorique /></Protege>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Signature />
      </BrowserRouter>
    </AuthProvider>
  )
}