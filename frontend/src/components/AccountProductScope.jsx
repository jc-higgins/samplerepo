export function AccountProductScope({
  accountsCatalog,
  tagOptions,
  accountIds,
  tag,
  onAccountIdsChange,
  onTagChange,
}) {
  const pickMode = accountIds !== null

  function setAllAccounts() {
    onAccountIdsChange(null)
  }

  function setPickMode() {
    onAccountIdsChange(accountsCatalog.map((a) => a.id))
  }

  function toggleAccount(id) {
    const base = accountIds ?? accountsCatalog.map((a) => a.id)
    const next = base.includes(id)
      ? base.filter((x) => x !== id)
      : [...base, id]
    onAccountIdsChange(next.length === 0 ? base : next)
  }

  return (
    <div className="dash-scope">
      <div className="dash-scope__block">
        <span className="dash-scope__label" id="dash-scope-acct-label">
          Accounts
        </span>
        <div
          className="dash-scope__radios"
          role="group"
          aria-labelledby="dash-scope-acct-label"
        >
          <label className="dash-scope__radio">
            <input
              type="radio"
              name="acct-scope"
              checked={!pickMode}
              onChange={setAllAccounts}
            />
            All
          </label>
          <label className="dash-scope__radio">
            <input
              type="radio"
              name="acct-scope"
              checked={pickMode}
              onChange={setPickMode}
            />
            Choose…
          </label>
        </div>
        {pickMode && (
          <div className="dash-scope__checks">
            {accountsCatalog.map((a) => {
              const sel = (accountIds ?? []).includes(a.id)
              return (
                <label key={a.id} className="dash-scope__check">
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => toggleAccount(a.id)}
                  />
                  <span>{a.label}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>
      <div className="dash-scope__block dash-scope__block--tag">
        <label className="dash-scope__tag-label" htmlFor="dash-scope-tag">
          Product / tag
        </label>
        <select
          id="dash-scope-tag"
          className="dash-scope__select"
          value={tag}
          onChange={(e) => onTagChange(e.target.value)}
        >
          <option value="">All tags</option>
          {tagOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
