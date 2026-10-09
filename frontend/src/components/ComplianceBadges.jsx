import { useEffect, useRef, useState } from 'react'
import { COMPLIANCE_BADGES } from '../compliance.js'

function BadgeIcon({ id }) {
  switch (id) {
    case 'owasp':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l7 3v5.5c0 4.2-2.9 7-7 8.5-4.1-1.5-7-4.3-7-8.5V6z" />
          <path d="M9 12l2 2 4-4.5" />
        </svg>
      )
    case 'dpdp':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v4h4" />
          <path d="M10 12h5M10 15.5h5M10 8.5h2" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="4.8" r="1.9" />
          <path d="M5 9.2c2.2.9 4.5 1.3 7 1.3s4.8-.4 7-1.3" />
          <path d="M12 10.5v3.7" />
          <path d="M12 14.2l-2.3 5.3M12 14.2l2.3 5.3" />
        </svg>
      )
  }
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export default function ComplianceBadges({ defaultOpenId = null }) {
  const [openId, setOpenId] = useState(defaultOpenId)
  const [shift, setShift] = useState(0)
  const wrapRefs = useRef({})
  const buttonRefs = useRef({})

  useEffect(() => {
    if (!openId) return undefined
    function onPointerDown(event) {
      const wrap = wrapRefs.current[openId]
      if (wrap && !wrap.contains(event.target)) setOpenId(null)
    }
    function onResize() {
      setOpenId(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', onResize)
    }
  }, [openId])

  function toggle(badge) {
    if (openId === badge.id) {
      setOpenId(null)
      return
    }
    const wrap = wrapRefs.current[badge.id]
    if (wrap && typeof window !== 'undefined') {
      const rect = wrap.getBoundingClientRect()
      const panelWidth = Math.min(440, window.innerWidth - 32)
      let nextShift = 0
      const overflowRight = rect.left + panelWidth - (window.innerWidth - 16)
      if (overflowRight > 0) nextShift -= overflowRight
      if (rect.left + nextShift < 16) nextShift += 16 - (rect.left + nextShift)
      setShift(nextShift)
    } else {
      setShift(0)
    }
    setOpenId(badge.id)
  }

  function onKeyDown(event) {
    if (event.key === 'Escape' && openId) {
      event.stopPropagation()
      setOpenId(null)
      buttonRefs.current[openId]?.focus()
    }
  }

  return (
    <div className="compliance" onKeyDown={onKeyDown}>
      <ul className="compliance__list">
        {COMPLIANCE_BADGES.map((badge) => {
          const open = openId === badge.id
          const panelId = `compliance-panel-${badge.id}`
          return (
            <li
              key={badge.id}
              className="compliance__item"
              ref={(el) => {
                wrapRefs.current[badge.id] = el
              }}
            >
              <button
                type="button"
                className={open ? 'compliance-badge compliance-badge--open' : 'compliance-badge'}
                aria-expanded={open}
                aria-controls={panelId}
                ref={(el) => {
                  buttonRefs.current[badge.id] = el
                }}
                onClick={() => toggle(badge)}
              >
                <span className={`compliance-badge__dot compliance-badge__dot--${badge.tone}`} aria-hidden="true" />
                <span className="compliance-badge__icon">
                  <BadgeIcon id={badge.id} />
                </span>
                <span className="compliance-badge__label">{badge.label}</span>
                <span
                  className={open ? 'compliance-badge__chev compliance-badge__chev--open' : 'compliance-badge__chev'}
                >
                  <Chevron />
                </span>
              </button>

              {open && (
                <div
                  className="compliance-panel"
                  id={panelId}
                  role="region"
                  aria-label={`${badge.label} assessment details`}
                  style={{ left: `${shift}px` }}
                >
                  <div className="compliance-panel__head">
                    <p className="compliance-panel__title">{badge.label}</p>
                    <span className={`status status--${badge.tone}`}>
                      <span className="status__dot" aria-hidden="true" />
                      {badge.status}
                    </span>
                  </div>

                  <p className="compliance-panel__scope">{badge.scope}</p>

                  <div className="compliance-panel__section">
                    <p className="compliance-panel__label">Checks performed</p>
                    <ul className="check-list">
                      {badge.checks.map((check) => (
                        <li key={check.name} className="check">
                          <span className="check__name">{check.name}</span>
                          <span className="check__result">{check.result}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {badge.gaps.length > 0 && (
                    <div className="compliance-panel__section">
                      <p className="compliance-panel__label">Identified gaps</p>
                      <ul className="compliance-panel__list">
                        {badge.gaps.map((gap) => (
                          <li key={gap}>{gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {badge.fixes.length > 0 && (
                    <div className="compliance-panel__section">
                      <p className="compliance-panel__label">Recommended fixes</p>
                      <ul className="compliance-panel__list">
                        {badge.fixes.map((fix) => (
                          <li key={fix}>{fix}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="compliance-panel__note">{badge.note}</p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
