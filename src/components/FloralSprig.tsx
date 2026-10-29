/** Decorative botanical watercolor-inspired illustration; no external image requests. */
export function FloralSprig() {
  return <svg className="floral-home__sprig" viewBox="0 0 94 100" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="petalPink"><stop stopColor="#fff4f1"/><stop offset=".65" stopColor="#f6b7c6"/><stop offset="1" stopColor="#df8da9"/></radialGradient>
      <radialGradient id="petalPeach"><stop stopColor="#fff9e8"/><stop offset=".7" stopColor="#f8d0b9"/><stop offset="1" stopColor="#e5a7a2"/></radialGradient>
      <linearGradient id="leafGreen" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a2b998"/><stop offset="1" stopColor="#647f72"/></linearGradient>
    </defs>
    <path d="M6 99Q28 69 46 47T76 4" stroke="#819c80" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M24 74Q4 74 10 52Q28 51 24 74ZM42 54Q23 44 30 28Q50 35 42 54ZM58 31Q59 13 77 13Q76 30 58 31ZM32 65Q47 65 55 78Q36 84 32 65Z" fill="url(#leafGreen)" opacity=".8"/>
    <g transform="translate(44 38)"><g fill="url(#petalPink)" opacity=".94">
      <ellipse cx="0" cy="-15" rx="10" ry="17"/><ellipse cx="0" cy="-15" rx="10" ry="17" transform="rotate(72)"/><ellipse cx="0" cy="-15" rx="10" ry="17" transform="rotate(144)"/><ellipse cx="0" cy="-15" rx="10" ry="17" transform="rotate(216)"/><ellipse cx="0" cy="-15" rx="10" ry="17" transform="rotate(288)"/>
    </g><circle r="8" fill="#edc477"/><circle cx="-2" cy="-2" r="2.5" fill="#fff3d2"/></g>
    <g transform="translate(75 14) scale(.46)"><g fill="url(#petalPeach)" opacity=".9">
      <ellipse cx="0" cy="-15" rx="10" ry="17"/><ellipse cx="0" cy="-15" rx="10" ry="17" transform="rotate(72)"/><ellipse cx="0" cy="-15" rx="10" ry="17" transform="rotate(144)"/><ellipse cx="0" cy="-15" rx="10" ry="17" transform="rotate(216)"/><ellipse cx="0" cy="-15" rx="10" ry="17" transform="rotate(288)"/>
    </g><circle r="8" fill="#e9bf6c"/></g>
    <g transform="translate(13 82) scale(.38)"><g fill="url(#petalPeach)" opacity=".8">
      <ellipse cx="0" cy="-15" rx="10" ry="17"/><ellipse cx="0" cy="-15" rx="10" ry="17" transform="rotate(72)"/><ellipse cx="0" cy="-15" rx="10" ry="17" transform="rotate(144)"/><ellipse cx="0" cy="-15" rx="10" ry="17" transform="rotate(216)"/><ellipse cx="0" cy="-15" rx="10" ry="17" transform="rotate(288)"/>
    </g><circle r="8" fill="#edc477"/></g>
  </svg>;
}
