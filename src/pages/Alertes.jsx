import { useCallback, useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { useAuth } from '../AuthContext'
import { supabase } from '../lib/supabase'

const ROLES = { president: 'Administrateur', respo: 'Responsable', banquier: 'Banquier' }
const STATUTS = { nouvelle: '🔴 Nouvelle', en_cours: '🟠 En cours', cloturee: '🟢 Clôturée' }
const MODES = {
  public: 'Visible par tous, même avant une alerte',
  alerte: 'Communiqué à toute personne qui envoie une alerte',
  prive: "Jamais affiché automatiquement : je l'envoie moi-même en réponse",
}
const MODES_COURTS = { public: 'public', alerte: 'après alerte', prive: 'privé' }

const dateHeure = (d) =>
  new Date(d).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

function auteur(a) {
  if (a.equipe_nom) return `Équipe : ${a.equipe_nom} (${ROLES[a.equipe_role] || a.equipe_role})`
  if (a.joueur_nom)
    return `Joueur : ${a.joueur_prenom || ''} ${a.joueur_nom} (n°${a.joueur_numero})`
  if (a.anonyme) return 'Anonyme (choix de la personne)'
  return 'Non identifié'
}

function FormCloture({ alerte, onClose, onDone }) {
  const [note, setNote] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const valider = async () => {
    setEnvoi(true)
    setErreur('')
    const { error } = await supabase.rpc('close_alert', { p_id: alerte.id, p_note: note })
    setEnvoi(false)
    if (error) return setErreur(error.message)
    onDone()
  }

  return (
    <Modal titre="Clôturer l'alerte" onClose={onClose}>
      <p className="discret">{alerte.lieu} — {alerte.message}</p>
      <textarea
        autoFocus
        placeholder="Note de clôture (ce qui a été fait, suite donnée…)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {erreur && <p className="erreur">{erreur}</p>}
      <div className="boutons">
        <button className="secondaire" onClick={onClose}>Annuler</button>
        <button disabled={envoi || !note.trim()} onClick={valider}>Clôturer</button>
      </div>
    </Modal>
  )
}

export default function Alertes() {
  const { profile } = useAuth()
  const [alertes, setAlertes] = useState([])
  const [contacts, setContacts] = useState([])
  const [reponses, setReponses] = useState([])
  const [filtre, setFiltre] = useState('actives')
  const [tel, setTel] = useState('')
  const [mode, setMode] = useState('alerte')
  const [enregistre, setEnregistre] = useState(false)
  const [msgTel, setMsgTel] = useState('')
  const [cloture, setCloture] = useState(null)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    const [a, c, r] = await Promise.all([
      supabase.rpc('get_alerts', { p_limit: 200 }),
      supabase.rpc('get_emergency_contacts'),
      supabase.from('alert_replies').select('alert_id, profile_id'),
    ])
    setAlertes(a.data || [])
    setContacts(c.data || [])
    setReponses(r.data || [])
  }, [])

  useEffect(() => {
    charger()
    const t = setInterval(charger, 10000)
    return () => clearInterval(t)
  }, [charger])

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('profiles')
      .select('telephone, telephone_mode')
      .eq('id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        setTel(data?.telephone || '')
        setMode(data?.telephone_mode || 'alerte')
        setEnregistre(!!data?.telephone)
      })
  }, [profile?.id])

  const enregistrerTel = async () => {
    const { error } = await supabase.rpc('set_my_phone', { p_tel: tel, p_mode: mode })
    setMsgTel(error ? error.message : 'Enregistré.')
    if (!error) setEnregistre(!!tel.trim())
    charger()
  }

  const retirerTel = async () => {
    const { error } = await supabase.rpc('set_my_phone', { p_tel: '', p_mode: mode })
    if (!error) {
      setTel('')
      setEnregistre(false)
    }
    setMsgTel(error ? error.message : "Numéro retiré : il n'est plus communiqué à personne.")
    charger()
  }

  const prendre = async (a) => {
    setErreur('')
    const { error } = await supabase.rpc('take_alert', { p_id: a.id })
    if (error) setErreur(error.message)
    charger()
  }

  const envoyerNumero = async (a) => {
    const msg = window.prompt(
      'Message court pour la personne (facultatif), par exemple « J’arrive à la table 3 » :',
      ''
    )
    if (msg === null) return
    setErreur('')
    const { error } = await supabase.rpc('send_alert_reply', { p_alert_id: a.id, p_message: msg })
    if (error) setErreur(error.message)
    charger()
  }

  const dejaEnvoye = (a) =>
    reponses.some((r) => r.alert_id === a.id && r.profile_id === profile?.id)

  const visibles = alertes.filter((a) =>
    filtre === 'toutes' ? true : filtre === 'actives' ? a.statut !== 'cloturee' : a.statut === 'cloturee'
  )

  return (
    <Layout titre="Espace Respo">
      <div className="barre">
        <h2 style={{ margin: 0, flex: 1 }}>🚨 Alertes sécurité</h2>
        <select value={filtre} onChange={(e) => setFiltre(e.target.value)}>
          <option value="actives">À traiter</option>
          <option value="cloturees">Clôturées</option>
          <option value="toutes">Toutes</option>
        </select>
      </div>

      {erreur && <p className="erreur">{erreur}</p>}

      <div className="card" style={{ maxWidth: 'none', marginBottom: 16 }}>
        <strong>Mon numéro de téléphone</strong>
        <p className="discret">
          Facultatif. Tu choisis qui peut le voir, et tu peux le modifier ou le retirer à tout moment.
        </p>
        <input type="tel" placeholder="06 12 34 56 78" value={tel} onChange={(e) => setTel(e.target.value)} />
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          {Object.entries(MODES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <div className="boutons" style={{ justifyContent: 'flex-start' }}>
          <button onClick={enregistrerTel}>Enregistrer</button>
          <button className="secondaire" onClick={retirerTel}>Retirer mon numéro</button>
        </div>
        {msgTel && <p className="discret">{msgTel}</p>}
        <p className="discret">
          Numéros enregistrés dans l'équipe :{' '}
          {contacts.length
            ? contacts.map((c) => `${c.nom} (${c.telephone}, ${MODES_COURTS[c.mode] || c.mode})`).join(' · ')
            : 'aucun'}
        </p>
      </div>

      {visibles.length === 0 && <p className="discret">Aucune alerte.</p>}

      <div className="alertes-liste">
        {visibles.map((a) => (
          <div key={a.id} className={`alerte-carte ${a.statut}`}>
            <div className="carte-haut">
              <strong>{STATUTS[a.statut]}</strong>
              <span className="discret">{dateHeure(a.created_at)}</span>
            </div>
            <p><strong>Lieu :</strong> {a.lieu}</p>
            <p>{a.message}</p>
            <p className="discret">{auteur(a)}{a.contact ? ` — ${a.contact}` : ''}</p>
            {a.pris_par_nom && (
              <p className="discret">Prise en charge par {a.pris_par_nom} à {dateHeure(a.pris_at)}</p>
            )}
            {a.statut === 'cloturee' && (
              <p className="discret">
                Clôturée par {a.cloture_par_nom} à {dateHeure(a.cloture_at)} — {a.note}
              </p>
            )}
            {a.statut !== 'cloturee' && (
              <div className="boutons" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                {a.statut === 'nouvelle' && (
                  <button className="petit" onClick={() => prendre(a)}>Prendre en charge</button>
                )}
                <button
                  className="petit secondaire"
                  disabled={!enregistre}
                  title={enregistre ? '' : "Enregistre d'abord ton numéro ci-dessus"}
                  onClick={() => envoyerNumero(a)}
                >
                  {dejaEnvoye(a) ? '📞 Renvoyer mon numéro' : '📞 Envoyer mon numéro à la personne'}
                </button>
                <button className="petit secondaire" onClick={() => setCloture(a)}>Clôturer</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {cloture && (
        <FormCloture
          alerte={cloture}
          onClose={() => setCloture(null)}
          onDone={() => {
            setCloture(null)
            charger()
          }}
        />
      )}
    </Layout>
  )
}