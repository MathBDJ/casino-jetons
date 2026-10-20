import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { activerSon, bip, sonActif } from '../lib/son'

export default function AlerteBanniere() {
  const [nouvelles, setNouvelles] = useState([])
  const [son, setSon] = useState(sonActif())
  const vues = useRef(null) // null tant que le premier chargement n'est pas fait

  const charger = useCallback(async () => {
    const { data } = await supabase.rpc('get_alerts', { p_limit: 50 })
    if (!data) return
    const nv = data.filter((a) => a.statut === 'nouvelle')
    if (vues.current === null) {
      vues.current = new Set(nv.map((a) => a.id))
    } else {
      const inedites = nv.filter((a) => !vues.current.has(a.id))
      if (inedites.length) {
        inedites.forEach((a) => vues.current.add(a.id))
        bip()
      }
    }
    setNouvelles(nv)
  }, [])

  useEffect(() => {
    charger()
    const t = setInterval(charger, 10000) // filet de sécurité si le temps réel saute
    const canal = supabase
      .channel('alertes-staff')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, charger)
      .subscribe()
    return () => {
      clearInterval(t)
      supabase.removeChannel(canal)
    }
  }, [charger])

  const derniere = nouvelles[0]

  return (
    <>
      {derniere && (
        <div className="bandeau-alerte no-print">
          <span>
            🚨 {nouvelles.length} alerte(s) sécurité en attente — {derniere.lieu} :{' '}
            {derniere.message.slice(0, 90)}
          </span>
          <Link to="/respo/alertes">Traiter</Link>
        </div>
      )}
      {!son && (
        <button className="son-btn secondaire no-print" onClick={() => setSon(activerSon())}>
          🔔 Activer le son des alertes
        </button>
      )}
    </>
  )
}