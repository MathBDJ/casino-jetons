import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const urlPlan = (chemin) => supabase.storage.from('plans').getPublicUrl(chemin).data.publicUrl

export default function PlanContenu() {
  const [plan, setPlan] = useState(undefined) // undefined = chargement, null = aucun plan

  useEffect(() => {
    let actif = true
    const charger = async () => {
      const { data } = await supabase.rpc('get_plans')
      if (actif) setPlan(data && data.length ? data[0] : null)
    }
    charger()
    const t = setInterval(charger, 60000)
    return () => {
      actif = false
      clearInterval(t)
    }
  }, [])

  if (plan === undefined) return <p className="discret centre">Chargement…</p>

  if (plan === null)
    return <p className="plan-vide discret">Plan prochainement mis à disposition par l'organisation.</p>

  const url = urlPlan(plan.chemin)
  return (
    <div className="plan-bloc">
      <a href={url} target="_blank" rel="noreferrer">
        <img className="plan-image" src={url} alt="Plan de l'événement" />
      </a>
      <a className="discret centre" href={url} target="_blank" rel="noreferrer">
        Ouvrir en grand (pour zoomer)
      </a>
    </div>
  )
}