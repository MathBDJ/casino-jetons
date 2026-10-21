import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const connecter = async (e) => {
    e.preventDefault()
    setEnvoi(true)
    setErreur('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErreur('Email ou mot de passe incorrect.')
    setEnvoi(false)
  }

  return (
    <div className="login">
      <form onSubmit={connecter} className="card">
        <div className="marque-grande">
          <img src="/logo.png" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <span className="script">La Nuit de l'Institut</span>
          <h1>Le Grand Casino</h1>
        </div>
        <p className="discret centre">Espace organisation</p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {erreur && <p className="erreur">{erreur}</p>}
        <button type="submit" disabled={envoi}>
          {envoi ? 'Connexion…' : 'Se connecter'}
        </button>
        <Link to="/joueur" className="discret centre">Je suis joueur : voir mes jetons →</Link>
      </form>
    </div>
  )
}