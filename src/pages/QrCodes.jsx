import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

const norm = (s) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function QrCodes() {
  const [vue, setVue] = useState('global')
  const [joueurs, setJoueurs] = useState([])
  const [images, setImages] = useState({})
  const [imageGlobale, setImageGlobale] = useState('')
  const [recherche, setRecherche] = useState('')
  const [saisie, setSaisie] = useState(window.location.origin)
  const [base, setBase] = useState(window.location.origin)

  const racine = base.trim().replace(/\/+$/, '')
  const lienGlobal = `${racine}/joueur`
  const local = racine.includes('localhost') || racine.includes('127.0.0.1')

  // QR code global : un seul code pour tous les joueurs
  useEffect(() => {
    QRCode.toDataURL(lienGlobal, { margin: 2, width: 1000, errorCorrectionLevel: 'M' }).then(
      setImageGlobale
    )
  }, [lienGlobal])

  // QR codes individuels : chargés seulement si on ouvre cet onglet
  useEffect(() => {
    if (vue !== 'individuels') return
    supabase
      .from('players')
      .select('id, numero, nom, prenom, access_token')
      .eq('actif', true)
      .order('numero')
      .then(({ data }) => setJoueurs(data || []))
  }, [vue])

  useEffect(() => {
    if (vue !== 'individuels') return
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
  }, [joueurs, racine, vue])

  const affiches = useMemo(() => {
    const q = norm(recherche)
    return joueurs.filter(
      (j) => !q || norm(`${j.prenom} ${j.nom}`).includes(q) || String(j.numero) === q
    )
  }, [joueurs, recherche])

  return (
    <Layout titre="Espace Respo">
      <div className="no-print">
        <div className="barre">
          <h2 style={{ margin: 0, flex: 1 }}>QR codes</h2>
          <button onClick={() => window.print()} disabled={vue === 'individuels' && affiches.length === 0}>
            Imprimer{vue === 'individuels' ? ` (${affiches.length})` : ''}
          </button>
        </div>

        <div className="barre">
          <button className={vue === 'global' ? '' : 'secondaire'} onClick={() => setVue('global')}>
            QR code global
          </button>
          <button className={vue === 'individuels' ? '' : 'secondaire'} onClick={() => setVue('individuels')}>
            QR codes individuels
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
            Adresse locale : ces QR codes ne fonctionneront pas sur un téléphone. Saisis l'adresse
            publique du site, clique sur « Appliquer » et imprime à ce moment-là.
          </p>
        )}
      </div>

      {vue === 'global' && (
        <div className="qr-affiche">
          <span className="script">La Nuit de l'Institut</span>
          <h2>Le Grand Casino</h2>
          <p>Scanne ce code pour consulter tes jetons</p>
          {imageGlobale && <img src={imageGlobale} alt="QR code du site" />}
          <p className="qr-lien">{lienGlobal}</p>
          <p className="discret no-print">
            Ce code mène à la page « Mes jetons » : le joueur y saisit son adresse email. Affiche-le sur
            un écran ou imprime cette page pour l'afficher sur place.
          </p>
          <a className="lien-plan no-print" href={imageGlobale} download="qr-grand-casino.png">
            Télécharger l'image (PNG)
          </a>
        </div>
      )}

      {vue === 'individuels' && (
        <>
          <div className="barre no-print">
            <input
              placeholder="Filtrer (nom, prénom ou n°) pour n'imprimer qu'une partie…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
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
        </>
      )}
    </Layout>
  )
}