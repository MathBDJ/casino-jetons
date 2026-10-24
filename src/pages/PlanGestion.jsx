import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { urlPlan } from '../components/PlanContenu'
import { supabase } from '../lib/supabase'
import { reduireImage } from '../lib/image'

export default function PlanGestion() {
  const [plan, setPlan] = useState(undefined) // undefined = chargement, null = aucun plan
  const [fichier, setFichier] = useState(null)
  const [cle, setCle] = useState(0) // sert à vider le champ fichier
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')

  const charger = useCallback(async () => {
    const { data } = await supabase.rpc('get_plans')
    setPlan(data && data.length ? data[0] : null)
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const publier = async () => {
    if (plan && !window.confirm("Le plan actuel sera remplacé par cette nouvelle image. Continuer ?")) return
    setEnvoi(true)
    setErreur('')
    setMessage('')
    try {
      const { blob, ext, type } = await reduireImage(fichier)
      const chemin = `${crypto.randomUUID()}.${ext}`
      const { error: e1 } = await supabase.storage
        .from('plans')
        .upload(chemin, blob, { contentType: type, cacheControl: '3600', upsert: false })
      if (e1) throw new Error(e1.message)

      const { data, error: e2 } = await supabase.rpc('add_plan', {
        p_titre: "Plan de l'événement",
        p_chemin: chemin,
      })
      if (e2) {
        await supabase.storage.from('plans').remove([chemin])
        throw new Error(e2.message)
      }
      // Supprime l'ancienne image du stockage
      const anciens = data?.anciens || []
      if (anciens.length) await supabase.storage.from('plans').remove(anciens)

      setMessage(plan ? 'Plan remplacé : la nouvelle image est visible par tout le monde.' : 'Plan ajouté : il est maintenant visible par tout le monde.')
      setFichier(null)
      setCle((c) => c + 1)
      await charger()
    } catch (e) {
      setErreur(e.message)
    }
    setEnvoi(false)
  }

  const supprimer = async () => {
    if (!window.confirm('Supprimer le plan ? Il ne sera plus visible par personne.')) return
    setErreur('')
    setMessage('')
    const { data, error } = await supabase.rpc('delete_plan', { p_id: plan.id })
    if (error) return setErreur(error.message)
    if (data) await supabase.storage.from('plans').remove([data])
    setMessage('Plan supprimé.')
    charger()
  }

  return (
    <Layout titre="Espace Respo">
      <div className="barre">
        <h2 style={{ margin: 0, flex: 1 }}>🗺️ Plan de l'événement</h2>
        <Link to="/plan" className="lien-plan" style={{ flex: '0 0 auto' }}>Voir la page publique</Link>
      </div>

      {erreur && <p className="erreur">{erreur}</p>}
      {message && <p className="ok">{message}</p>}

      <div className="card" style={{ maxWidth: 'none', marginBottom: 16 }}>
        <strong>Plan actuel</strong>
        {plan === undefined && <p className="discret">Chargement…</p>}
        {plan === null && (
          <p className="discret">
            Aucun plan pour l'instant : les visiteurs voient « Plan prochainement mis à disposition par
            l'organisation. »
          </p>
        )}
        {plan && (
          <>
            <a href={urlPlan(plan.chemin)} target="_blank" rel="noreferrer">
              <img className="plan-image" src={urlPlan(plan.chemin)} alt="Plan de l'événement" />
            </a>
            <div>
              <button className="petit danger" onClick={supprimer}>Supprimer le plan</button>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ maxWidth: 'none' }}>
        <strong>{plan ? 'Remplacer le plan' : 'Ajouter le plan'}</strong>
        <p className="discret">
          Une seule image est affichée : en ajouter une nouvelle remplace l'ancienne. Elle est visible
          par tout le monde, sans connexion. Formats JPG, PNG ou WebP ; les photos trop lourdes sont
          allégées automatiquement. N'y mets rien de confidentiel.
        </p>
        <input
          key={cle}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFichier(e.target.files?.[0] || null)}
        />
        <div>
          <button disabled={envoi || !fichier} onClick={publier}>
            {envoi ? 'Envoi en cours…' : plan ? 'Remplacer le plan' : 'Ajouter le plan'}
          </button>
        </div>
      </div>
    </Layout>
  )
}