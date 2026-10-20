export default function Modal({ titre, onClose, children }) {
  return (
    <div className="modal-fond" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{titre}</h2>
        {children}
      </div>
    </div>
  )
}