import { NavLink } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Layout({ titre, children }) {
  const { profile, signOut } = useAuth()
  const estStaff = profile?.role === 'respo' || profile?.role === 'president'
  return (
    <div className="app">
      <header className="topbar">
        <div className="marque">
          <img src="/logo.png" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <div>
            <span className="marque-titre">Le Grand Casino</span>
            <span className="script">{titre}</span>
          </div>
        </div>
        <span>
          {profile?.nom} <button className="secondaire petit" onClick={signOut}>Déconnexion</button>
        </span>
      </header>
      {estStaff && (
        <nav className="nav">
          <NavLink to="/respo" end>Joueurs</NavLink>
          <NavLink to="/recherche">Recherche</NavLink>
          <NavLink to="/respo/tables">Tables</NavLink>
          <NavLink to="/respo/historique">Historique</NavLink>
          <NavLink to="/respo/classement">Classement</NavLink>
          <NavLink to="/respo/alertes">🚨 Alertes</NavLink>
          <NavLink to="/respo/qr">QR codes</NavLink>
          <NavLink to="/respo/exports">Exports</NavLink>
          <NavLink to="/respo/equipe">Équipe</NavLink>
          {profile.role === 'president' && <NavLink to="/respo/banquiers">Banquiers</NavLink>}
          {profile.role === 'president' && <NavLink to="/respo/admin">Administration</NavLink>}
        </nav>
      )}
      {profile?.role === 'banquier' && (
        <nav className="nav">
          <NavLink to="/banquier" end>Ma table</NavLink>
          <NavLink to="/banquier/historique">Mon historique</NavLink>
          <NavLink to="/recherche">Recherche joueur</NavLink>
        </nav>
      )}
      <main className="content">{children}</main>
    </div>
  )
}