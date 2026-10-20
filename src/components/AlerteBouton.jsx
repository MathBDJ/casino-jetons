import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../lib/supabase'

const CLE = 'alerte_en_cours'
const TROIS_HEURES = 3 * 3600 * 1000

function lireEmail() {
  try {
    return localStorage.getItem('email_joueur') || ''
  } catch {
    return ''
  }
}

function lireAlerte() {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) || 'null')
    if (v && Date.now() - v.t < TROIS_HEURES) return v.id
  } catch {
    /* rien */
  }
  return null
}

function ecrireAlerte(id) {
  try {
    if (id) localStorage.setItem(CLE, JSON.stringify({ id, t: Date.now() }))
    else localStorage.removeItem(CLE)
  } catch {
    /* rien */
  }
}

const lien = (tel) => `tel:${tel.replace(/[^0-9+]/g, '')}`

function Formulaire({ onClose }) {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  const equipe = !!profile && profile.actif
  const token = pathname.startsWith('/j/') ? pathname.split('/')[2] || null : null
  const identifie = !!token || !!lireEmail()

  const [lieu, setLieu] = useState('')
  const [message, setMessage] = useState('')
  const [anonyme, setAnonyme] = useState(false)
  const [contact, setContact] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [alerteId, setAlerteId] = useState(lireAlerte())
  const [publics, setPublics] = useState([])
  const [contacts, setContacts] = useState([])
  const [reponses, setReponses] = useState([])

  useEffect(() => {
    supabase.rpc('get_public_contacts').then(({ data }) => setPublics(data || []))
  }, [])

  useEffect(() => {
    if (!alerteId) return
    let actif = true
    const charger = async () => {
      const [c, r] = await Promise.all([
        supabase.rpc('get_alert_contacts', { p_alert_id: alerteId }),
        supabase.rpc('get_alert_replies', { p_alert_id: alerteId }),
      ])
      if (!actif) return
      setContacts(c.data || [])
      setReponses(r.data || [])
    }
    charger()
    const t = setInterval(charger, 5000)
    return () => {
      actif = false
      clearInterval(t)
    }
  }, [alerteId])

  const envoyer = async () => {
    setEnvoi(true)
    setErreur('')
    const { data, error } = await supabase.rpc('create_alert', {
      p_lieu: lieu,
      p_message: message,
      p_anonyme: !equipe && anonyme,
      p_token: token,
      p_email: lireEmail() || null,
      p_contact: contact || null,
    })
    setEnvoi(false)
    if (error) return setErreur(error.message)
    const id = typeof data === 'string' ? data : data?.id
    ecrireAlerte(id)
    setAlerteId(id)
  }

  const nouvelle = () => {
    ecrireAlerte(null)
    setAlerteId(null)
    setContacts([])
    setReponses([])
    setLieu('')
    setMessage('')
  }

  if (alerteId) {
    const telsRepondus = new Set(reponses.map((r) => r.telephone))
    const autres = contacts.filter((c) => !telsRepondus.has(c.telephone))
    return (
      <div className="modal-fond">
        <div className="modal">
          <h2>🚨 Alerte envoyée</h2>
          <p className="ok">
            ✅ Les responsables ont été prévenus. Quelqu'un va intervenir. Reste dans un endroit sûr,
            avec d'autres personnes.
          </p>

          {reponses.map((r) => (
            <div key={r.nom + r.telephone} className="reponse">
              <strong>📩 {r.nom} t'a répondu</strong>
              {r.message && <span>{r.message}</span>}
              <a className="appel" href={lien(r.telephone)}>📞 {r.telephone}</a>
            </div>
          ))}

          <div className="urgence">
            {autres.length > 0 && <strong>Tu peux aussi appeler :</strong>}
            {autres.map((c) => (
              <a key={c.nom + c.telephone} className="appel" href={lien(c.telephone)}>
                📞 {c.nom} — {c.telephone}
              </a>
            ))}
            {reponses.length === 0 && autres.length === 0 && (
              <p className="discret" style={{ margin: 0 }}>
                Un responsable peut t'envoyer son numéro ici : garde cette fenêtre ouverte, elle se met
                à jour toute seule.
              </p>
            )}
            <a className="appel urgence-112" href="tel:112">🚑 Urgence vitale : 112</a>
          </div>

          <div className="boutons">
            <button className="secondaire" onClick={nouvelle}>Nouvelle alerte</button>
            <button onClick={onClose}>Fermer</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-fond">
      <div className="modal">
        <h2>🚨 Signaler un problème</h2>

        <div className="urgence">
          {publics.length > 0 && <strong>Responsables à appeler :</strong>}
          {publics.map((c) => (
            <a key={c.nom + c.telephone} className="appel" href={lien(c.telephone)}>
              📞 {c.nom} — {c.telephone}
            </a>
          ))}
          <a className="appel urgence-112" href="tel:112">🚑 Urgence vitale : 112</a>
          <p className="discret" style={{ margin: 0 }}>
            Après l'envoi de ton alerte, des responsables pourront te communiquer leur numéro ici.
          </p>
        </div>

        <p className="discret">
          Agression, harcèlement, comportement inapproprié… Décris la situation en quelques mots.
        </p>
        <input placeholder="Où es-tu ? (table, bar, entrée…)" value={lieu} onChange={(e) => setLieu(e.target.value)} />
        <textarea placeholder="Que se passe-t-il ?" value={message} onChange={(e) => setMessage(e.target.value)} />

        {equipe ? (
          <p className="discret">Ton nom sera visible des responsables.</p>
        ) : (
          <>
            <label className="case">
              <input type="checkbox" checked={anonyme} onChange={(e) => setAnonyme(e.target.checked)} />
              Signaler sans donner mon identité
            </label>
            {!anonyme && identifie && (
              <p className="discret">Ton profil joueur sera joint à l'alerte pour que l'équipe te retrouve.</p>
            )}
            {!anonyme && !identifie && (
              <input
                placeholder="Ton prénom ou n° de joueur (facultatif)"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            )}
          </>
        )}

        {erreur && <p className="erreur">{erreur}</p>}
        <div className="boutons">
          <button className="secondaire" onClick={onClose}>Fermer</button>
          <button className="danger" disabled={envoi || !lieu.trim() || !message.trim()} onClick={envoyer}>
            Envoyer l'alerte
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AlerteBouton() {
  const [ouvert, setOuvert] = useState(false)
  return (
    <>
      <button className="sos no-print" onClick={() => setOuvert(true)}>🚨 Signaler un problème</button>
      {ouvert && <Formulaire onClose={() => setOuvert(false)} />}
    </>
  )
}