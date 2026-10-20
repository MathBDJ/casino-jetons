export function activerTableauxMobiles() {
  const etiqueter = () => {
    document.querySelectorAll('table.tableau').forEach((table) => {
      const entetes = Array.from(table.querySelectorAll('thead th')).map((th) =>
        th.textContent.trim()
      )
      table.querySelectorAll('tbody tr').forEach((tr) => {
        Array.from(tr.children).forEach((td, i) => {
          if (td.colSpan > 1) return
          const label = entetes[i] || ''
          if (td.getAttribute('data-label') !== label) td.setAttribute('data-label', label)
        })
      })
    })
  }

  let attente = false
  const planifier = () => {
    if (attente) return
    attente = true
    requestAnimationFrame(() => {
      attente = false
      etiqueter()
    })
  }

  new MutationObserver(planifier).observe(document.body, { childList: true, subtree: true })
  planifier()
}