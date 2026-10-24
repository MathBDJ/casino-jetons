export default function Signature() {
  const annee = new Date().getFullYear()
  return (
    <footer className="signature no-print">
      <p>
        <strong>© {annee} Mathieu BERNARD DE JANDIN</strong>
        <span> — Tous droits réservés.</span>
        <span className="sig-interdit"> Reproduction interdite.</span>
      </p>
    </footer>
  )
}