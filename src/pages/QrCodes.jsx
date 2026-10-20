import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

const norm = (s) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function QrCodes() {
  const [joueurs, setJoueurs] = useState([])
  const [images, setImages] = useState({})
  const [recherche, setRecherche] = useState('')
  const [saisie, setSaisie] = useState(window.location.origin)
  const [base, setBase] = useState(window.location.origin)

  const racine = base.trim().replace(/\/+$/, '')

  useEffect(() => {
    supabase
      .from('players')
      .select('id, numero, nom, prenom, access_token')
      .eq('actif', true)
      .order('numero')
      .then(({ data }) => setJoueurs(data || []))
  }, [])

  useEffect(() => {
    let annule = false
    ;(async () => {
      const map = {}
      for (const j of joueurs) {
        map[j.id] = await QRCode.toDataURL(`${racine}/j/${j.access_token}`, {
          margin: 2,
          width: 300,
          errorCorrectionLevel: 'M',
        })
      }
      if (!annule) setImages(map)
    })()
    return () => {
      annule = true
    }
  }, [joueurs, racine])

  const affiches = useMemo(() => {
    const q = norm(recherche)
    return joueurs.filter(
      (j) => !q || norm(`${j.prenom} ${j.nom}`).includes(q) || String(j.numero) === q
    )
  }, [joueurs, recherche])

  const local = racine.includes('localhost') || racine.includes('127.0.0.1')

  return (
    <Layout titre="Espace Respo">
      <div className="no-print">
        <div className="barre">
          <h2 style={{ margin: 0, flex: 1 }}>QR codes joueurs</h2>
          <button onClick={() => window.print()} disabled={affiches.length === 0}>
            🖨️ Imprimer ({affiches.length})
          </button>
        </div>

        <div className="barre">
          <input
            placeholder="Adresse du site (ex : https://mon-site.vercel.app)"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
          />
          <button className="secondaire" onClick={() => setBase(saisie)}>Appliquer</button>
        </div>

        {local && (
          <p className="erreur">
            ⚠️ Adresse locale : ces QR codes ne fonctionneront pas sur un téléphone. Une fois le site
            en ligne, saisis ici son adresse publique, clique sur « Appliquer » et imprime à ce moment-là.
          </p>
        )}

        <div className="barre">
          <input
            placeholder="Filtrer (nom, prénom ou n°) pour n'imprimer qu'une partie…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>
      </div>

      <div className="qr-grille">
        {affiches.map((j) => (
          <div key={j.id} className="qr-carte">
            {images[j.id] ? <img src={images[j.id]} alt={`QR ${j.nom}`} /> : <p>…</p>}
            <p><strong>{j.prenom} {j.nom}</strong></p>
            <p>n° {j.numero}</p>
            <a
              className="no-print"
              href={`${racine}/j/${j.access_token}`}
              target="_blank"
              rel="noreferrer"
            >
              Ouvrir la page
            </a>
          </div>
        ))}
        {joueurs.length === 0 && <p className="discret">Aucun joueur inscrit.</p>}
      </div>
    </Layout>
  )
}