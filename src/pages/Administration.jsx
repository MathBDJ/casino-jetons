import { useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { appelerFonction } from '../lib/api'

export default function Administration() {
  const [ouvert, setOuvert] = useState(false)
  const [supprimerJoueurs, setSupprimerJoueurs] = useState(false)
  const [mdp, setMdp] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState('')

  const fermer = () => {
    setOuvert(false)
    setMdp('')
    setErreur('')
  }

  const reinitialiser = async () => {
    setEnvoi(true)
    setErreur('')
    const r = await appelerFonction({
      action: 'reset_data',
      password: mdp,
      supprimer_joueurs: supprimerJoueurs,
    })
    setEnvoi(false)
    if (r.error) return setErreur(r.error)
    fermer()
    setMessage(
      supprimerJoueurs
        ? 'Réinitialisation terminée : historique et joueurs supprimés.'
        : 'Réinitialisation terminée : historique supprimé, soldes remis à 0.'
    )
  }

  return (
    <Layout titre="Espace Administrateur">
      <h2>Administration</h2>
      {message && <p className="ok">{message}</p>}

      <div className="card" style={{ maxWidth: 'none' }}>
        <strong>Réinitialiser les données de test</strong>
        <p className="discret">
          Supprime tout l'historique (recharges, sessions, corrections) et remet tous les soldes à 0.
          Les tables et l'équipe sont conservées. Action définitive.
        </p>
        <label className="case">
          <input
            type="checkbox"
            checked={supprimerJoueurs}
            onChange={(e) => setSupprimerJoueurs(e.target.checked)}
          />
          Supprimer aussi tous les joueurs (repartir d'une liste vide)
        </label>
        <div>
          <button className="danger" onClick={() => setOuvert(true)}>Réinitialiser…</button>
        </div>
      </div>

      {ouvert && (
        <Modal titre="Confirmer la réinitialisation" onClose={fermer}>
          <p className="erreur">
            Tout l'historique sera supprimé définitivement
            {supprimerJoueurs ? ', ainsi que tous les joueurs' : ' et tous les soldes remis à 0'}.
          </p>
          <p>Entre ton mot de passe pour confirmer :</p>
          <input
            autoFocus
            type="password"
            placeholder="Mot de passe"
            value={mdp}
            onChange={(e) => setMdp(e.target.value)}
          />
          {erreur && <p className="erreur">{erreur}</p>}
          <div className="boutons">
            <button className="secondaire" onClick={fermer}>Annuler</button>
            <button className="danger" disabled={envoi || !mdp} onClick={reinitialiser}>
              Tout supprimer
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}