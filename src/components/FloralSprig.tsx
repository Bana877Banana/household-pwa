/** B1: soft watercolor-style blossoms in the upper-left corner. */
export function FloralSprig() {
  return <svg className="floral-home__sprig" viewBox="0 0 168 168" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="b1Petal" cx=".37" cy=".26" r=".79">
        <stop stopColor="#fffaf7"/><stop offset=".42" stopColor="#ffe0e3"/><stop offset=".78" stopColor="#f5aebc"/><stop offset="1" stopColor="#dc829d"/>
      </radialGradient>
      <radialGradient id="b1PetalLight"><stop stopColor="#fffaf3"/><stop offset=".72" stopColor="#ffdddb"/><stop offset="1" stopColor="#f2b3ba"/></radialGradient>
      <linearGradient id="b1Leaf" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b8c6a1"/><stop offset=".5" stopColor="#8da888"/><stop offset="1" stopColor="#6b8878"/></linearGradient>
    </defs>
    <g stroke="#859b7e" strokeLinecap="round" opacity=".84">
      <path d="M2 155Q31 117 47 93Q72 55 112 18" strokeWidth="2.5"/>
      <path d="M36 107Q23 88 13 84M63 70Q43 58 42 39M85 45Q107 52 132 39M48 94Q65 107 82 108" strokeWidth="1.5"/>
    </g>
    <g fill="url(#b1Leaf)" opacity=".87">
      <path d="M28 118Q3 112 7 87Q28 90 28 118Z"/>
      <path d="M45 94Q31 73 47 58Q58 75 45 94Z"/>
      <path d="M63 68Q44 57 49 36Q68 45 63 68Z"/>
      <path d="M88 45Q104 24 129 31Q120 51 88 45Z"/>
      <path d="M54 101Q74 92 88 113Q66 121 54 101Z"/>
      <path d="M101 29Q104 11 125 8Q122 26 101 29Z"/>
    </g>
    <g transform="translate(52 64) rotate(-14)">
      <g fill="url(#b1Petal)" stroke="#eaa2b0" strokeWidth=".45" opacity=".97">
        {Array.from({length:5},(_,i)=><path key={i} d="M0 -3 C-18 -14 -17 -42 0 -47 C17 -42 18 -14 0 -3Z" transform={`rotate(${i*72})`}/>)}
      </g>
      <circle r="10" fill="#f5c779"/><circle r="6.5" fill="#f9df9b"/>
      {Array.from({length:8},(_,i)=><circle key={i} cx={Math.cos(i*Math.PI/4)*7} cy={Math.sin(i*Math.PI/4)*7} r="1.3" fill="#bd8359"/>)}
    </g>
    <g transform="translate(117 26) rotate(20) scale(.65)">
      <g fill="url(#b1PetalLight)" stroke="#efb4ba" strokeWidth=".5" opacity=".93">
        {Array.from({length:5},(_,i)=><path key={i} d="M0 -3 C-18 -14 -17 -42 0 -47 C17 -42 18 -14 0 -3Z" transform={`rotate(${i*72})`}/>)}
      </g><circle r="10" fill="#f4ce88"/><circle r="4" fill="#f8e9af"/>
    </g>
    <g transform="translate(20 124) rotate(27) scale(.49)">
      <g fill="url(#b1PetalLight)" opacity=".88">
        {Array.from({length:5},(_,i)=><path key={i} d="M0 -3 C-18 -14 -17 -42 0 -47 C17 -42 18 -14 0 -3Z" transform={`rotate(${i*72})`}/>)}
      </g><circle r="10" fill="#eec97c"/>
    </g>
  </svg>;
}
