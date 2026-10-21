export default function Signature() {
  const annee = new Date().getFullYear()
  return (
    <footer className="signature no-print">
      <p>
        <strong>© {annee} Mathieu BERNARD DE JANDIN</strong> — Tous droits réservés.
      </p>
      <p>
        Application conçue et développée par Mathieu BERNARD DE JANDIN. Toute reproduction, copie,
        modification ou réutilisation, totale ou partielle, sans son autorisation écrite est interdite.
      </p>
    </footer>
  )
}