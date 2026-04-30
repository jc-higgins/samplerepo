export function CollapsiblePanel({
  id,
  title,
  titleId,
  open,
  onToggle,
  children,
  className = '',
  bodyClassName = '',
}) {
  const bodyId = `${id}-body`
  return (
    <section
      id={id}
      className={`dash-panel dash-scroll-target ${className}`.trim()}
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className="dash-panel__h dash-panel__h--collapsible">
        <button
          type="button"
          className="dash-panel__toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
        >
          <span
            className={
              'dash-panel__chev ' + (open ? 'dash-panel__chev--open' : '')
            }
            aria-hidden
          />
          {title}
        </button>
      </h2>
      <div
        id={bodyId}
        role="region"
        aria-labelledby={titleId}
        hidden={!open}
        className={`dash-panel__body ${bodyClassName}`.trim()}
      >
        {children}
      </div>
    </section>
  )
}
