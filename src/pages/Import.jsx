import { useCallback, useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { readSheet } from 'read-excel-file/web-worker'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import {
  lireLignes,
  resume,
  construirePlan,
  marquerDoublons,
  construireDonnees,
  statutParDefaut,
  typeParDefaut,
} from '../lib/helloasso'

async function tousLesJoueurs() {
  const out = []
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await supabase
      .from('players')
      .select('id, numero, nom, prenom')
      .order('numero')
      .range(debut, debut + 999)
    if (error) throw new Error(error.message)
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

async function lireTableau(fichier) {
  const nom = fichier.name.toLowerCase()
  if (nom.endsWith('.xlsx')) return readSheet(fichier)
  if (nom.endsWith('.csv')) {
    const buf = await fichier.arrayBuffer()
    let texte = new TextDecoder('utf-8').decode(buf)
    if (texte.includes('\uFFFD')) texte = new TextDecoder('windows-1252').decode(buf)
    return Papa.parse(texte, { skipEmptyLines: true }).data
  }
  throw new Error('Format non accepté : choisis un fichier .xlsx ou .csv exporté depuis HelloAsso.')
}

export default function Import() {
  const [nomFichier, setNomFichier] = useState('')
  const [lignes, setLignes] = useState([])
  const [statutsOk, setStatutsOk] = useState([])
  const [types, setTypes] = useState({})
  const [jetons, setJetons] = useState({})
  const [forcer, setForcer] = useState([]) // doublons à importer quand même
  const [etat, setEtat] = useState({ billets: [], entrees: [] })
  const [joueurs, setJoueurs] = useState([])
  const [cle, setCle] = useState(0) // sert à vider le champ fichier
  const [erreur, setErreur] = useState('')
  const [resultat, setResultat] = useState(null)
  const [envoi, setEnvoi] = useState(false)

  const charger = useCallback(async () => {
    try {
      const [e, j] = await Promise.all([supabase.rpc('get_import_state'), tousLesJoueurs()])
      if (e.error) throw new Error(e.error.message)
      setEtat(e.data || { billets: [], entrees: [] })
      setJoueurs(j)
    } catch (err) {
      setErreur(err.message)
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const choisir = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setErreur('')
    setResultat(null)
    setLignes([])
    setForcer([])
    try {
      const tableau = await lireTableau(f)
      const lu = lireLignes(tableau)
      if (lu.vide) throw new Error('Le fichier est vide.')
      if (lu.manquantes.length)
        throw new Error(
          `Colonnes introuvables : ${lu.manquantes.join(', ')}. Vérifie que le fichier vient bien de l'export HelloAsso.`
        )
      const r = resume(lu.lignes)
      setNomFichier(f.name)
      setLignes(lu.lignes)
      setStatutsOk(r.statuts.filter((s) => statutParDefaut(s.valeur)).map((s) => s.valeur))
      setTypes(Object.fromEntries(r.tarifs.map((t) => [t.valeur, typeParDefaut(t.valeur)])))
      setJetons({})
    } catch (err) {
      setErreur(err.message)
      setNomFichier('')
    }
  }

  const r = useMemo(() => resume(lignes), [lignes])

  const etatCalc = useMemo(
    () => ({
      billets: new Set(etat.billets || []),
      entrees: new Map((etat.entrees || []).map((x) => [x.cle, x.player_id])),
    }),
    [etat]
  )

  const plan = useMemo(
    () =>
      lignes.length
        ? construirePlan(lignes, {
            statutsOk: new Set(statutsOk),
            types,
            jetonsParLigne: jetons,
            etat: etatCalc,
          })
        : null,
    [lignes, statutsOk, types, jetons, etatCalc]
  )

  const personnes = useMemo(() => (plan ? marquerDoublons(plan.personnes, joueurs) : []), [plan, joueurs])
  const choisies = personnes.filter((p) => !p.existant || forcer.includes(p.billet_entree))
  const jetonsRecharges = plan ? plan.recharges.reduce((s, x) => s + x.jetons, 0) : 0
  const totalJetons = choisies.reduce((s, p) => s + p.jetons, 0) + jetonsRecharges
  const rien = !plan || (choisies.length === 0 && plan.recharges.length === 0)
  const bloque = rien || plan.jetonsInvalides.length > 0

  const nomJoueur = (id) => {
    const j = joueurs.find((x) => x.id === id)
    return j ? `${j.prenom || ''} ${j.nom} (n°${j.numero})`.trim() : 'Joueur existant'
  }

  const basculer = (liste, setListe, valeur) =>
    setListe(liste.includes(valeur) ? liste.filter((x) => x !== valeur) : [...liste, valeur])

  const lancer = async () => {
    const msg = `Créer ${choisies.length} joueur(s)${
      plan.recharges.length ? `, recharger ${plan.recharges.length} joueur(s) existant(s)` : ''
    } et créditer ${totalJetons} jeton(s) au total ?`
    if (!window.confirm(msg)) return
    setEnvoi(true)
    setErreur('')
    const { data, error } = await supabase.rpc('import_helloasso', {
      p_data: construireDonnees(choisies, plan.recharges),
    })
    setEnvoi(false)
    if (error) return setErreur(error.message)
    setResultat(data)
    setForcer([])
    await charger()
  }

  const vider = () => {
    setLignes([])
    setNomFichier('')
    setResultat(null)
    setErreur('')
    setForcer([])
    setCle((c) => c + 1)
  }

  return (
    <Layout titre="Espace Respo">
      <h2>Importer les inscrits HelloAsso</h2>

      <div className="card" style={{ maxWidth: 'none', marginBottom: 16 }}>
        <strong>Comment ça marche</strong>
        <p className="discret">
          Choisis le fichier exporté depuis HelloAsso (.xlsx ou .csv). Chaque billet d'entrée crée un joueur ;
          les lignes de jetons sont additionnées et créditées à la bonne personne. Tu peux réimporter un
          export plus récent à tout moment : les lignes déjà importées sont reconnues et ignorées, seules les
          nouvelles sont ajoutées. Rien n'est enregistré avant que tu cliques sur « Importer ».
        </p>
        <input key={cle} type="file" accept=".xlsx,.csv" onChange={choisir} />
        {erreur && <p className="erreur">{erreur}</p>}
        {resultat && (
          <p className="ok">
            Import terminé : {resultat.joueurs_crees} joueur(s) créé(s), {resultat.recharges} joueur(s)
            existant(s) rechargé(s), {resultat.jetons_credites} jeton(s) crédité(s).
          </p>
        )}
      </div>

      {plan && (
        <>
          <p className="discret">
            {lignes.length} ligne(s) lue(s) dans « {nomFichier} ».{' '}
            <button className="petit secondaire" onClick={vider}>Changer de fichier</button>
          </p>

          <div className="card" style={{ maxWidth: 'none', marginBottom: 16 }}>
            <strong>1. Commandes à prendre en compte</strong>
            <p className="discret">Seules les commandes validées sont importées par défaut.</p>
            {r.statuts.map((s) => (
              <label key={s.valeur} className="case">
                <input
                  type="checkbox"
                  checked={statutsOk.includes(s.valeur)}
                  onChange={() => basculer(statutsOk, setStatutsOk, s.valeur)}
                />
                {s.valeur || '(statut vide)'} — {s.n} ligne(s)
              </label>
            ))}
          </div>

          <div className="card" style={{ maxWidth: 'none', marginBottom: 16 }}>
            <strong>2. Que représente chaque tarif ?</strong>
            <p className="discret">
              Une entrée crée un joueur. Une ligne de jetons ajoute des jetons à la personne qui l'a achetée.
              Indique combien de jetons vaut chaque ligne : à confirmer avec l'organisation, car cela
              multiplie directement les soldes.
            </p>
            <div className="defile">
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Tarif</th>
                    <th>Lignes</th>
                    <th>Type</th>
                    <th>Jetons par ligne</th>
                  </tr>
                </thead>
                <tbody>
                  {r.tarifs.map((t) => (
                    <tr key={t.valeur}>
                      <td>{t.valeur || '(vide)'}</td>
                      <td>{t.n}</td>
                      <td>
                        <select
                          value={types[t.valeur] || 'entree'}
                          onChange={(e) => setTypes({ ...types, [t.valeur]: e.target.value })}
                        >
                          <option value="entree">Une entrée (crée un joueur)</option>
                          <option value="jetons">Des jetons à créditer</option>
                          <option value="ignorer">À ignorer</option>
                        </select>
                      </td>
                      <td>
                        {types[t.valeur] === 'jetons' ? (
                          <input
                            type="number"
                            min="1"
                            placeholder="Nombre de jetons"
                            value={jetons[t.valeur] ?? ''}
                            onChange={(e) => setJetons({ ...jetons, [t.valeur]: e.target.value })}
                          />
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {plan.jetonsInvalides.length > 0 && (
              <p className="erreur">
                Indique le nombre de jetons par ligne pour : {plan.jetonsInvalides.join(', ')}.
              </p>
            )}
          </div>

          <div className="card" style={{ maxWidth: 'none', marginBottom: 16 }}>
            <strong>3. Aperçu avant import</strong>
            <p className="discret">
              {choisies.length} joueur(s) à créer · {plan.recharges.length} joueur(s) existant(s) à recharger ·{' '}
              {totalJetons} jeton(s) à créditer · {plan.stats.dejaImportees} ligne(s) déjà importée(s) ·{' '}
              {plan.stats.ignoreesStatut + plan.stats.ignoreesTarif} ligne(s) ignorée(s)
            </p>

            {plan.stats.sansBillet > 0 && (
              <p className="erreur">{plan.stats.sansBillet} ligne(s) sans numéro de billet n'ont pas pu être lues.</p>
            )}
            {plan.orphelins.length > 0 && (
              <p className="erreur">
                {plan.orphelins.length} ligne(s) de jetons ne correspondent à aucune entrée (commande ou nom
                différent) et ne seront pas créditées : lignes {plan.orphelins.map((l) => l.n).join(', ')} du fichier.
              </p>
            )}
            {plan.ambigus.length > 0 && (
              <p className="erreur">
                {plan.ambigus.length} billet(s) portent le même nom dans une même commande : les jetons de cette
                commande sont attribués à la première personne, à vérifier.
              </p>
            )}

            {personnes.length > 0 && (
              <div className="defile">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Prénom</th>
                      <th>Email</th>
                      <th>Jetons</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personnes.map((p) => (
                      <tr key={p.billet_entree}>
                        <td>{p.nom}</td>
                        <td>{p.prenom}</td>
                        <td>{p.email}</td>
                        <td><strong>{p.jetons}</strong></td>
                        <td>
                          {p.existant ? (
                            <label className="case">
                              <input
                                type="checkbox"
                                checked={forcer.includes(p.billet_entree)}
                                onChange={() => basculer(forcer, setForcer, p.billet_entree)}
                              />
                              Existe déjà (n°{p.existant.numero}) : importer quand même
                            </label>
                          ) : p.memeNomDansFichier ? (
                            'Même nom qu\'une autre ligne'
                          ) : (
                            'Nouveau'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {personnes.some((p) => p.existant && !forcer.includes(p.billet_entree)) && (
              <p className="discret">
                Les personnes déjà inscrites ne sont pas recréées, et leurs jetons ne sont pas crédités : si c'est
                bien la même personne, recharge-la à la main depuis l'onglet Joueurs.
              </p>
            )}

            {plan.recharges.length > 0 && (
              <>
                <strong>Jetons supplémentaires pour des joueurs déjà importés</strong>
                <ul>
                  {plan.recharges.map((x) => (
                    <li key={x.player_id}>
                      {nomJoueur(x.player_id)} : +{x.jetons} jeton(s)
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="boutons" style={{ justifyContent: 'flex-start' }}>
              <button disabled={envoi || bloque} onClick={lancer}>
                {envoi ? 'Import en cours…' : 'Importer'}
              </button>
            </div>
            {rien && !plan.jetonsInvalides.length && (
              <p className="discret">Rien de nouveau à importer avec ces réglages.</p>
            )}
          </div>
        </>
      )}
    </Layout>
  )
}