import { useCallback, useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { useAuth } from '../AuthContext'
import { supabase } from '../lib/supabase'
import { appelerFonction } from '../lib/api'

const ROLES = { president: 'Administrateur', respo: 'Responsable', banquier: 'Banquier' }
const ORDRE = { president: 0, respo: 1, banquier: 2 }

function genererMdp() {
  const car = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const tab = new Uint32Array(10)
  crypto.getRandomValues(tab)
  return Array.from(tab, (n) => car[n % car.length]).join('')
}

function FormNouveau({ estPresident, onClose, onDone }) {
  const [email, setEmail] = useState('')
  const [nom, setNom] = useState('')
  const [role, setRole] = useState('banquier')
  const [mdp, setMdp] = useState(genererMdp())
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [cree, setCree] = useState(null)

  const valider = async () => {
    setEnvoi(true)
    setErreur('')
    const r = await appelerFonction({ action: 'create', email, nom, role, password: mdp })
    setEnvoi(false)
    if (r.error) return setErreur(r.error)
    setCree({ email, mdp, nom })
  }

  if (cree)
    return (
      <Modal titre="Compte créé ✅" onClose={() => onDone(`${cree.nom} ajouté.`)}>
        <p>Note ces identifiants et donne-les à {cree.nom} :</p>
        <div className="identifiants">
          <div>Email : <strong>{cree.email}</strong></div>
          <div>Mot de passe : <strong>{cree.mdp}</strong></div>
        </div>
        <p className="discret">Le mot de passe ne sera plus affichable ensuite (mais tu pourras en définir un nouveau).</p>
        <div className="boutons">
          <button onClick={() => onDone(`${cree.nom} ajouté.`)}>Terminé</button>
        </div>
      </Modal>
    )

  return (
    <Modal titre="Nouveau membre" onClose={onClose}>
      <input placeholder="Nom affiché (ex : Lucas)" value={nom} onChange={(e) => setNom(e.target.value)} />
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="banquier">Banquier</option>
        {estPresident && <option value="respo">Responsable</option>}
      </select>
      <div className="barre" style={{ margin: 0 }}>
        <input value={mdp} onChange={(e) => setMdp(e.target.value)} />
        <button className="secondaire" onClick={() => setMdp(genererMdp())}>Générer</button>
      </div>
      {erreur && <p className="erreur">{erreur}</p>}
      <div className="boutons">
        <button className="secondaire" onClick={onClose}>Annuler</button>
        <button disabled={envoi || !nom.trim() || !email.trim() || mdp.length < 8} onClick={valider}>
          Créer le compte
        </button>
      </div>
    </Modal>
  )
}

function FormMotDePasse({ membre, onClose, onDone }) {
  const [mdp, setMdp] = useState(genererMdp())
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [fait, setFait] = useState(false)

  const valider = async () => {
    setEnvoi(true)
    setErreur('')
    const r = await appelerFonction({ action: 'reset_password', id: membre.id, password: mdp })
    setEnvoi(false)
    if (r.error) return setErreur(r.error)
    setFait(true)
  }

  if (fait)
    return (
      <Modal titre="Mot de passe modifié ✅" onClose={() => onDone('Mot de passe modifié.')}>
        <div className="identifiants">
          Nouveau mot de passe de {membre.nom} : <strong>{mdp}</strong>
        </div>
        <div className="boutons">
          <button onClick={() => onDone('Mot de passe modifié.')}>Terminé</button>
        </div>
      </Modal>
    )

  return (
    <Modal titre={`Nouveau mot de passe — ${membre.nom}`} onClose={onClose}>
      <div className="barre" style={{ margin: 0 }}>
        <input value={mdp} onChange={(e) => setMdp(e.target.value)} />
        <button className="secondaire" onClick={() => setMdp(genererMdp())}>Générer</button>
      </div>
      {erreur && <p className="erreur">{erreur}</p>}
      <div className="boutons">
        <button className="secondaire" onClick={onClose}>Annuler</button>
        <button disabled={envoi || mdp.length < 8} onClick={valider}>Valider</button>
      </div>
    </Modal>
  )
}

function LigneMembre({ membre, moi, estPresident, onDone, onMotDePasse }) {
  const [nom, setNom] = useState(membre.nom)
  const [erreur, setErreur] = useState('')

  const estMoi = membre.id === moi
  const gerable = membre.role === 'banquier' || (membre.role === 'respo' && estPresident)
  const peutModifier = gerable || (estMoi && estPresident)

  const maj = async (nouveauNom, actif, msg) => {
    setErreur('')
    const { error } = await supabase.rpc('update_profile', {
      p_id: membre.id,
      p_nom: nouveauNom,
      p_actif: actif,
    })
    if (error) return setErreur(error.message)
    onDone(msg)
  }

  const supprimer = async () => {
    if (!window.confirm(`Supprimer ${membre.nom} ? Cette action est définitive.`)) return
    setErreur('')
    const r = await appelerFonction({ action: 'delete', id: membre.id })
    if (r.error) return setErreur(r.error)
    onDone(
      r.data?.desactive
        ? `${membre.nom} a des opérations enregistrées : compte désactivé, historique conservé.`
        : `${membre.nom} supprimé.`
    )
  }

  return (
    <div className={`ligne-equipe ${membre.actif ? '' : 'inactive'}`}>
      <input value={nom} disabled={!peutModifier} onChange={(e) => setNom(e.target.value)} />
      <span className="badge">{ROLES[membre.role]}</span>
      {peutModifier && nom !== membre.nom && (
        <button className="petit" onClick={() => maj(nom, membre.actif, 'Nom modifié.')}>
          Enregistrer
        </button>
      )}
      {(gerable || estMoi) && (
        <button className="petit secondaire" onClick={() => onMotDePasse(membre)}>
          Mot de passe
        </button>
      )}
      {gerable && !estMoi && (
        <button
          className="petit secondaire"
          onClick={() =>
            maj(membre.nom, !membre.actif, membre.actif ? 'Compte désactivé.' : 'Compte réactivé.')
          }
        >
          {membre.actif ? 'Désactiver' : 'Réactiver'}
        </button>
      )}
      {estPresident && gerable && !estMoi && (
        <button className="petit danger" onClick={supprimer}>Supprimer</button>
      )}
      {erreur && <span className="erreur">{erreur}</span>}
    </div>
  )
}

export default function Equipe() {
  const { session, profile } = useAuth()
  const estPresident = profile?.role === 'president'
  const [membres, setMembres] = useState([])
  const [message, setMessage] = useState('')
  const [nouveau, setNouveau] = useState(false)
  const [mdpDe, setMdpDe] = useState(null)

  const charger = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*')
    if (data)
      setMembres(
        [...data].sort((a, b) => ORDRE[a.role] - ORDRE[b.role] || a.nom.localeCompare(b.nom))
      )
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const fini = (msg) => {
    setMessage(msg)
    setNouveau(false)
    setMdpDe(null)
    charger()
  }

  return (
    <Layout titre={estPresident ? 'Espace Administrateur' : 'Espace Respo'}>
      <div className="barre">
        <h2 style={{ margin: 0, flex: 1 }}>Équipe</h2>
        <button onClick={() => setNouveau(true)}>+ Nouveau membre</button>
      </div>
      {message && <p className="ok">{message}</p>}

      <div className="card" style={{ maxWidth: 'none' }}>
        <strong>Membres ({membres.length})</strong>
        {membres.map((m) => (
          <LigneMembre
            key={m.id + m.nom + m.actif}
            membre={m}
            moi={session?.user?.id}
            estPresident={estPresident}
            onDone={fini}
            onMotDePasse={setMdpDe}
          />
        ))}
      </div>

      {nouveau && (
        <FormNouveau estPresident={estPresident} onClose={() => setNouveau(false)} onDone={fini} />
      )}
      {mdpDe && <FormMotDePasse membre={mdpDe} onClose={() => setMdpDe(null)} onDone={fini} />}
    </Layout>
  )
}