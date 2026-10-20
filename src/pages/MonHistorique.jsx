import Layout from '../components/Layout'
import TableActivite from '../components/TableActivite'
import { useAuth } from '../AuthContext'

export default function MonHistorique() {
  const { profile } = useAuth()
  return (
    <Layout titre="Espace Banquier">
      <h2>Mon historique</h2>
      <p className="discret">
        Toutes tes actions, les plus récentes en premier. Si tu repères une erreur de saisie,
        préviens un responsable : il pourra corriger le solde du joueur (la correction est tracée).
      </p>
      {profile && <TableActivite banquierId={profile.id} />}
    </Layout>
  )
}