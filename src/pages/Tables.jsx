import { useCallback, useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

function FormTable({ table, banquiers, onClose, onDone }) {
  const edition = !!table
  const [nom, setNom] = useState(table?.nom || '')
  const [type, setType] = useState(table?.type_jeu || '')
  const [capacite, setCapacite] = useState(table?.capacite ?? '')
  const [banquier, setBanquier] = useState(table?.banquier_id || '')
  const [actif, setActif] = useState(table?.actif ?? true)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const valider = async () => {
    setEnvoi(true)
    setErreur('')
    const params = {
      p_nom: nom,
      p_type: type || null,
      p_capacite: capacite === '' ? null : parseInt(capacite, 10),
      p_banquier: banquier || null,
    }
    const { error } = edition
      ? await supabase.rpc('update_table', { ...params, p_id: table.id, p_actif: actif })
      : await supabase.rpc('create_table', params)
    setEnvoi(false)
    if (error) return setErreur(error.message)
    onDone(edition ? `Table « ${nom} » modifiée.` : `Table « ${nom} » créée.`)
  }

  return (
    <Modal titre={edition ? 'Modifier la table' : 'Nouvelle table'} onClose={onClose}>
      <input placeholder="Nom (ex : Blackjack 1)" value={nom} onChange={(e) => setNom(e.target.value)} />
      <input placeholder="Type de jeu (facultatif)" value={type} onChange={(e) => setType(e.target.value)} />
      <input
        type="number"
        min="1"
        placeholder="Capacité (facultatif)"
        value={capacite}
        onChange={(e) => setCapacite(e.target.value)}
      />
      <select value={banquier} onChange={(e) => setBanquier(e.target.value)}>
        <option value="">— Aucun banquier —</option>
        {banquiers.map((b) => (
          <option key={b.id} value={b.id}>{b.nom}</option>
        ))}
      </select>
      {edition && (
        <label className="case">
          <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} />
          Table active
        </label>
      )}
      {erreur && <p className="erreur">{erreur}</p>}
      <div className="boutons">
        <button className="secondaire" onClick={onClose}>Annuler</button>
        <button disabled={envoi || !nom.trim()} onClick={valider}>Enregistrer</button>
      </div>
    </Modal>
  )
}

export default function Tables() {
  const [tables, setTables] = useState([])
  const [banquiers, setBanquiers] = useState([])
  const [presents, setPresents] = useState({})
  const [form, setForm] = useState(null) // null | 'nouvelle' | table
  const [message, setMessage] = useState('')

  const charger = useCallback(async () => {
    const [t, b, s] = await Promise.all([
      supabase.from('game_tables').select('*, profiles(nom)').order('nom'),
      supabase.from('profiles').select('id, nom').eq('role', 'banquier').eq('actif', true).order('nom'),
      supabase.from('sessions').select('table_id, players(prenom, nom)').eq('statut', 'active'),
    ])
    if (t.data) setTables(t.data)
    if (b.data) setBanquiers(b.data)
    const map = {}
    ;(s.data || []).forEach((x) => {
      ;(map[x.table_id] ||= []).push(`${x.players?.prenom || ''} ${x.players?.nom || ''}`.trim())
    })
    setPresents(map)
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const fini = (msg) => {
    setMessage(msg)
    setForm(null)
    charger()
  }

  return (
    <Layout titre="Espace Respo">
      <div className="barre">
        <h2 style={{ margin: 0, flex: 1 }}>Tables</h2>
        <button onClick={() => setForm('nouvelle')}>+ Nouvelle table</button>
      </div>
      {message && <p className="ok">{message}</p>}

      <div className="grille">
        {tables.map((t) => {
          const liste = presents[t.id] || []
          return (
            <div key={t.id} className={`carte-table ${t.actif ? '' : 'inactive'}`}>
              <div className="carte-haut">
                <strong>{t.nom}</strong>
                <span className="badge">{t.actif ? 'Active' : 'Inactive'}</span>
              </div>
              <p className="discret">
                {t.type_jeu || 'Jeu non précisé'}
                {t.capacite ? ` · ${liste.length}/${t.capacite} places` : ''}
              </p>
              <p>Banquier : <strong>{t.profiles?.nom || '— non affecté —'}</strong></p>
              <p>Joueurs présents : <strong>{liste.length}</strong></p>
              {liste.length > 0 && <p className="discret">{liste.join(', ')}</p>}
              <button className="petit secondaire" onClick={() => setForm(t)}>Modifier</button>
            </div>
          )
        })}
        {tables.length === 0 && <p>Aucune table pour l'instant.</p>}
      </div>

      {form && (
        <FormTable
          table={form === 'nouvelle' ? null : form}
          banquiers={banquiers}
          onClose={() => setForm(null)}
          onDone={fini}
        />
      )}
    </Layout>
  )
}