import { useState, useEffect, useMemo, useCallback } from 'react'
import axios from 'axios'

const API = 'http://127.0.0.1:8000'

// ── Token helpers ──────────────────────────────────────────────
const getToken    = () => localStorage.getItem('vault_token')
const setToken    = (t) => localStorage.setItem('vault_token', t)
const removeToken = () => localStorage.removeItem('vault_token')

function getUserEmail() {
  const token = getToken()
  if (!token) return 'guest'
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub || payload.email || 'guest'
  } catch { return 'guest' }
}

const getStorageKey = (key) => `${key}_${getUserEmail()}`

// Attach token to every axios request automatically
axios.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const STATUS_CONFIG = {
  'completed': { label:'Completed', color:'#7de482', bg:'rgba(58,147,86,0.15)',   glow:'0 0 20px rgba(137,230,129,0.4)' },
  'reading':   { label:'Reading',   color:'#f9a8d4', bg:'rgba(249,168,212,0.15)', glow:'0 0 20px rgba(249,168,212,0.4)' },
  'not read':  { label:'Not Read',  color:'#93c5fd', bg:'rgba(147,197,253,0.15)', glow:'0 0 20px rgba(147,197,253,0.3)' },
}

const SPINE_PALETTES = [
  { bg:'#c0392b', mid:'#e74c3c', light:'#ff6b6b' },
  { bg:'#d35400', mid:'#e67e22', light:'#f39c12' },
  { bg:'#b7950b', mid:'#d4ac0d', light:'#f1c40f' },
  { bg:'#1a5276', mid:'#2980b9', light:'#5dade2' },
  { bg:'#1e8449', mid:'#27ae60', light:'#58d68d' },
  { bg:'#117a65', mid:'#1abc9c', light:'#48c9b0' },
  { bg:'#6c3483', mid:'#8e44ad', light:'#bb8fce' },
  { bg:'#922b21', mid:'#e91e63', light:'#f48fb1' },
  { bg:'#0e6655', mid:'#00897b', light:'#4db6ac' },
  { bg:'#1a237e', mid:'#3949ab', light:'#7986cb' },
  { bg:'#4a235a', mid:'#7b1fa2', light:'#ba68c8' },
  { bg:'#1b5e20', mid:'#388e3c', light:'#81c784' },
]

const MOOD_OPTIONS = [
  { value: 'mystical',   label: '🔮 Mystical'   },
  { value: 'dark',       label: '🌑 Dark'        },
  { value: 'cozy',       label: '☕ Cozy'        },
  { value: 'epic',       label: '⚔️ Epic'        },
  { value: 'romantic',   label: '🌹 Romantic'    },
  { value: 'whimsical',  label: '🦄 Whimsical'   },
  { value: 'shattering', label: '💔 Shattering'  },
  { value: 'relatable',  label: '🤗 Relatable'   },
]

// ── Heatmap helpers ────────────────────────────────────────────
function localDateKey(dt) {
  const yyyy = dt.getFullYear()
  const mm   = String(dt.getMonth() + 1).padStart(2, '0')
  const dd   = String(dt.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function buildGrid() {
  const HEATMAP_KEY = getStorageKey('vault_heatmap')
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem(HEATMAP_KEY) || '{}') } catch {}
  const now  = new Date()
  const jan1 = new Date(now.getFullYear(), 0, 1)
  const start = new Date(jan1)
  start.setDate(jan1.getDate() - jan1.getDay())
  const cols = []
  for (let w = 0; w < 53; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start)
      dt.setDate(start.getDate() + w * 7 + d)
      const key     = localDateKey(dt)
      const future  = dt > now
      const preYear = dt.getFullYear() < now.getFullYear()
      week.push({
        key, date: new Date(dt),
        value:    (future || preYear) ? -1 : (saved[key] || 0),
        pages:    (!future && !preYear) ? (saved[key + '_pages'] || 0) : 0,
        inactive: future || preYear,
      })
    }
    cols.push(week)
  }
  return cols
}

function colorFor(v) {
  if (v === -1) return 'rgba(255,255,255,0.045)'
  if (v === 0)  return 'rgba(255,255,255,0.045)'
  if (v === 1)  return 'rgba(124,223,132,0.35)'
  if (v === 2)  return 'rgba(81,175,83,0.55)'
  if (v === 3)  return 'rgba(27,207,7,0.75)'
  return '#2d9b38'
}

// ── Auth Page ──────────────────────────────────────────────────
function AuthPage({ onLogin }) {
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const submit = async () => {
    setError(''); setLoading(true)
    try {
      if (mode === 'register') {
        await axios.post(`${API}/auth/register`, { username, email, password })
        setMode('login')
        setError('Registered! Please log in.')
        setLoading(false)
        return
      }
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      const res = await axios.post(`${API}/auth/login`, form)
      setToken(res.data.access_token)
      onLogin()
    } catch(e) {
      setError(e.response?.data?.detail || 'Something went wrong.')
    }
    setLoading(false)
  }

  const inp = { width:'100%', padding:'11px 14px', borderRadius:'12px', fontSize:'0.88rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', color:'#f1f0ff', outline:'none', boxSizing:'border-box' }

  return (
    <div style={{ position:'fixed', inset:0, background:'#0d0a1a', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif", overflow:'hidden', zIndex:9999 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap');`}</style>
      <div style={{ position:'absolute', top:'-10%', left:'-5%', width:'500px', height:'500px', borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,0.15),transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-10%', right:'-5%', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle,rgba(249,168,212,0.1),transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }} />

      <div style={{ background:'linear-gradient(135deg,#1a1030,#120d25)', border:'1px solid rgba(167,139,250,0.25)', borderRadius:'24px', padding:'40px', width:'100%', maxWidth:'400px', boxShadow:'0 0 60px rgba(167,139,250,0.15)', position:'relative', zIndex:1 }}>
        <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.2rem', color:'#f1f0ff', textAlign:'center', marginBottom:'6px' }}>My Reading Vault</h1>
        <p style={{ textAlign:'center', color:'rgba(167,139,250,0.6)', fontSize:'0.8rem', marginBottom:'28px' }}>✦ Your Literary Sanctuary ✦</p>

        <div style={{ display:'flex', gap:'8px', marginBottom:'24px' }}>
          {['login','register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              style={{ flex:1, padding:'9px', borderRadius:'10px', cursor:'pointer', background:mode===m?'rgba(167,139,250,0.2)':'transparent', border:`1px solid ${mode===m?'#a78bfa':'rgba(255,255,255,0.1)'}`, color:mode===m?'#a78bfa':'rgba(255,255,255,0.4)', fontSize:'0.82rem', fontWeight:mode===m?'600':'400', textTransform:'capitalize' }}>
              {m}
            </button>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {mode === 'register' && (
            <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} style={inp} />
          )}
          <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inp} />
          <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} style={inp} />
        </div>

        {error && (
          <p style={{ color: error.includes('Registered') ? '#7de482' : '#f87171', fontSize:'0.82rem', marginTop:'12px' }}>{error}</p>
        )}

        <button onClick={submit} disabled={loading}
          style={{ marginTop:'20px', width:'100%', padding:'12px', borderRadius:'12px', cursor:'pointer', background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', color:'white', fontSize:'0.9rem', fontWeight:'600', boxShadow:'0 0 20px rgba(124,58,237,0.4)', opacity:loading?0.7:1 }}>
          {loading ? '...' : mode === 'login' ? 'Enter the Vault 🔮' : 'Create Account ✨'}
        </button>
      </div>
    </div>
  )
}

// ── Shared UI Components ───────────────────────────────────────
function Stars({ rating }) {
  return (
    <div style={{ display:'flex', gap:'2px' }}>
      {[1,2,3,4,5].map(i=>(
        <span key={i} style={{ fontSize:'0.85rem', color:i<=(rating||0)?'#fbbf24':'rgba(255,255,255,0.15)', filter:i<=(rating||0)?'drop-shadow(0 0 4px #fbbf24)':'none' }}>★</span>
      ))}
    </div>
  )
}

function ProgressBar({ pct }) {
  return (
    <div style={{ width:'100%', height:'4px', background:'rgba(255,255,255,0.08)', borderRadius:'99px', overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#a78bfa,#f9a8d4)', borderRadius:'99px', boxShadow:'0 0 8px rgba(167,139,250,0.8)', transition:'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
    </div>
  )
}

function BookCover({ title, author }) {
  const urls = [
    `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-L.jpg`,
    `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-M.jpg`,
  ]
  const [idx, setIdx]       = useState(0)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { setIdx(0); setLoaded(false) }, [title])
  const handleError = () => { if (idx < urls.length - 1) setIdx(i=>i+1); else setIdx(urls.length) }
  const showPlaceholder = idx >= urls.length
  const hue = [...title].reduce((n,c)=>n+c.charCodeAt(0),0) % 360
  return (
    <div style={{ width:'80px', height:'115px', borderRadius:'6px', overflow:'hidden', flexShrink:0, boxShadow:'4px 4px 20px rgba(0,0,0,0.5)', position:'relative' }}>
      {showPlaceholder ? (
        <div style={{ width:'100%', height:'100%', background:`linear-gradient(135deg,hsl(${hue},40%,20%),hsl(${hue+40},50%,30%))`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'6px', gap:'6px' }}>
          <span style={{ fontSize:'1.4rem' }}>📖</span>
          <span style={{ fontSize:'0.55rem', color:'rgba(255,255,255,0.6)', textAlign:'center', lineHeight:1.3, wordBreak:'break-word' }}>{title}</span>
        </div>
      ) : (
        <>
          <img src={urls[idx]} alt={title} onLoad={()=>setLoaded(true)} onError={handleError}
            style={{ width:'100%', height:'100%', objectFit:'cover', opacity:loaded?1:0, transition:'opacity 0.4s' }} />
          {!loaded && (
            <div style={{ position:'absolute', inset:0, background:`linear-gradient(135deg,hsl(${hue},40%,20%),hsl(${hue+40},50%,30%))`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem' }}>📖</div>
          )}
        </>
      )}
    </div>
  )
}

function BookSpine({ book, index, isSelected, onClick }) {
  const [hovered, setHovered] = useState(false)
  const palette   = SPINE_PALETTES[index % SPINE_PALETTES.length]
  const height    = 110 + Math.min((book.total_pages || 300) / 600, 1) * 30
  const thickness = 28
  const statusDot = book.status === 'reading' ? '#decb60' : book.status === 'completed' ? '#95d250' : '#dc1111'
  return (
    <div onClick={() => onClick(book)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      title={`${book.title} — ${book.author}`}
      style={{ width:`${thickness}px`, height:`${height}px`, position:'relative', cursor:'pointer', transform:hovered||isSelected?'translateY(-14px) scale(1.05)':'translateY(0) scale(1)', transition:'transform 0.25s cubic-bezier(.34,1.56,.64,1)', transformOrigin:'bottom center', zIndex:hovered||isSelected?10:1, filter:isSelected?`drop-shadow(0 8px 24px ${palette.mid}88)`:hovered?`drop-shadow(0 6px 16px ${palette.mid}66)`:'drop-shadow(2px 3px 8px rgba(0,0,0,0.6))', flexShrink:0 }}>
      <div style={{ width:'100%', height:'100%', background:`linear-gradient(90deg, ${palette.bg} 0%, ${palette.mid} 15%, ${palette.mid} 85%, ${palette.bg} 100%)`, borderRadius:'2px 3px 3px 2px', position:'relative', overflow:'hidden', border:`1px solid ${palette.bg}` }}>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'4px', background:`linear-gradient(90deg, ${palette.bg}, transparent)` }} />
        <div style={{ position:'absolute', left:'3px', top:0, bottom:0, width:'5px', background:'linear-gradient(90deg, rgba(255,255,255,0.18), transparent)', borderRadius:'1px' }} />
        <div style={{ position:'absolute', right:0, top:0, bottom:0, width:'4px', background:`linear-gradient(270deg, ${palette.bg}, transparent)` }} />
        <div style={{ position:'absolute', top:'8px', left:'4px', right:'4px', height:'2px', background:`${palette.light}60`, borderRadius:'1px' }} />
        <div style={{ position:'absolute', top:'12px', left:'4px', right:'4px', height:'1px', background:`${palette.light}30`, borderRadius:'1px' }} />
        <div style={{ position:'absolute', bottom:'8px', left:'4px', right:'4px', height:'2px', background:`${palette.light}60`, borderRadius:'1px' }} />
        <div style={{ position:'absolute', top:'20px', bottom:'20px', left:0, right:0, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
          <span style={{ writingMode:'vertical-rl', textOrientation:'mixed', transform:'rotate(180deg)', fontSize:'9px', fontFamily:"'Cormorant Garamond', Georgia, serif", fontWeight:'600', letterSpacing:'1.2px', color:'rgba(255,255,255,0.92)', textShadow:'0 1px 3px rgba(0,0,0,0.6)', maxHeight:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', padding:'0 2px', userSelect:'none' }}>{book.title}</span>
        </div>
        <div style={{ position:'absolute', top:'4px', right:'4px', width:'5px', height:'5px', borderRadius:'50%', background:statusDot, boxShadow:`0 0 5px ${statusDot}` }} />
      </div>
    </div>
  )
}

function Bookshelf({ books, selectedBook, onSelect }) {
  const mid    = Math.ceil(books.length / 2)
  const shelf1 = books.slice(0, mid)
  const shelf2 = books.slice(mid)
  const ShelfRow = ({ shelfBooks, startIndex }) => (
    <div style={{ position:'relative', marginBottom:'2px' }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap:'3px', padding:'16px 16px 0', minHeight:'160px', position:'relative', zIndex:1 }}>
        {shelfBooks.map((book, i) => (
          <BookSpine key={book.id} book={book} index={startIndex + i} isSelected={selectedBook?.id === book.id} onClick={onSelect} />
        ))}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'flex-end', gap:'8px', paddingBottom:'2px' }}>
          <div style={{ fontSize:'50px', lineHeight:1 }}>🕯️</div>
          <div style={{ width:'18px', height:'18px', borderRadius:'50%', background:'radial-gradient(circle at 35% 35%, #d51acc, #951d65)', boxShadow:'0 0 10px rgba(234,58,237,0.5)', marginBottom:'2px' }} />
        </div>
      </div>
      <div style={{ height:'14px', background:'linear-gradient(180deg, #7c4a1e 0%, #5c3010 50%, #3d1f08 100%)', borderRadius:'1px', boxShadow:'0 5px 15px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)', margin:'0 6px' }} />
      <div style={{ height:'8px', background:'linear-gradient(180deg,rgba(0,0,0,0.35),transparent)', margin:'0 6px' }} />
    </div>
  )
  return (
    <div style={{ background:'linear-gradient(180deg, #150d2a 0%, #0e0820 100%)', borderRadius:'16px', padding:'12px 6px 6px', border:'1px solid rgba(255,255,255,0.06)', boxShadow:'inset 0 0 50px rgba(0,0,0,0.4)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'10px', background:'linear-gradient(90deg, #3d1f08, #1a0e04)', zIndex:5, borderRadius:'16px 0 0 16px' }} />
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:'10px', background:'linear-gradient(270deg, #3d1f08, #1a0e04)', zIndex:5, borderRadius:'0 16px 16px 0' }} />
      <ShelfRow shelfBooks={shelf1} startIndex={0} />
      <ShelfRow shelfBooks={shelf2} startIndex={shelf1.length} />
      <div style={{ display:'flex', gap:'16px', justifyContent:'center', marginTop:'10px', paddingBottom:'4px' }}>
        {[['#fbbf24','Reading'],['#56b93a','Completed'],['#cc1f1f','Not Read']].map(([color, label]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'10px', color:'rgba(255,255,255,0.88)' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:color, boxShadow:`0 0 4px ${color}` }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

function BookDetailPanel({ book, onClose, onEdit }) {
  if (!book) return null
  const cfg = STATUS_CONFIG[book.status] || STATUS_CONFIG['not read']
  const pct = book.total_pages > 0 ? Math.round((book.pages_read / book.total_pages) * 100) : 0
  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${cfg.color}33`, borderRadius:'16px', padding:'18px', boxShadow:cfg.glow, animation:'fadein 0.3s ease', position:'relative' }}>
      <button onClick={onClose} style={{ position:'absolute', top:'12px', right:'12px', background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer', fontSize:'16px' }}>×</button>
      <div style={{ display:'flex', gap:'14px', alignItems:'flex-start' }}>
        <BookCover title={book.title} author={book.author} />
        <div style={{ flex:1, minWidth:0 }}>
          <h3 style={{ margin:'0 0 3px', fontSize:'1rem', fontFamily:"'Cormorant Garamond',serif", color:'#f1f0ff', lineHeight:1.3 }}>{book.title}</h3>
          <p style={{ margin:'0 0 8px', fontSize:'0.78rem', color:'rgba(245,244,240,0.91)', fontStyle:'italic' }}>{book.author}</p>
          <div style={{ display:'flex', gap:'8px', marginBottom:'8px', flexWrap:'wrap' }}>
            <span style={{ fontSize:'0.65rem', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 10px', borderRadius:'99px', background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}33` }}>{cfg.label}</span>
            <span style={{ fontSize:'0.72rem', color:'rgba(245,244,240,0.91)' }}>{book.genre}</span>
          </div>
          <Stars rating={book.rating} />
        </div>
      </div>
      <div style={{ marginTop:'14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
          <span style={{ fontSize:'0.72rem', color:'rgba(245,244,240,0.91)' }}>Progress</span>
          <span style={{ fontSize:'0.72rem', color:'rgba(245,244,240,0.91)' }}>{book.pages_read} / {book.total_pages} · {pct}%</span>
        </div>
        <ProgressBar pct={pct} />
      </div>
      {(book.date_started || book.date_finished) && (
        <div style={{ marginTop:'10px', fontSize:'0.7rem', color:'rgba(245,244,240,0.91)', display:'flex', gap:'12px' }}>
          {book.date_started && book.date_started !== 'null' && <span>Started {book.date_started}</span>}
          {book.date_finished && book.date_finished !== 'null' && <span>· Finished {book.date_finished}</span>}
        </div>
      )}
      <button onClick={() => onEdit(book)} style={{ marginTop:'14px', width:'100%', padding:'9px', borderRadius:'10px', background:'linear-gradient(135deg,#be185d,#f9a8d4)', border:'none', color:'white', fontSize:'0.82rem', fontWeight:'600', cursor:'pointer', boxShadow:'0 0 16px rgba(249,168,212,0.25)' }}>Edit this book ✏️</button>
    </div>
  )
}

function BookCard({ book, onDelete, onEdit, style }) {
  const cfg     = STATUS_CONFIG[book.status] || STATUS_CONFIG['not read']
  const pct     = book.total_pages > 0 ? Math.round((book.pages_read / book.total_pages) * 100) : 0
  const moodObj = MOOD_OPTIONS.find(m => m.value === book.mood)
  return (
    <div style={{ background:'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'20px', padding:'20px', transition:'transform 0.3s,box-shadow 0.3s', position:'relative', overflow:'hidden', cursor:'pointer', ...style }}
      onClick={() => onEdit(book)}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow=cfg.glow; e.currentTarget.style.borderColor=cfg.color+'55' }}
      onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)' }}>
      <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'120px', height:'120px', borderRadius:'50%', background:cfg.color, opacity:0.06, filter:'blur(30px)', pointerEvents:'none' }} />
      <div style={{ display:'flex', gap:'16px', alignItems:'flex-start' }}>
        <BookCover title={book.title} author={book.author} />
        <div style={{ flex:1, minWidth:0 }}>
          <h3 style={{ margin:'0 0 2px', fontSize:'1rem', fontWeight:'700', color:'#f1f0ff', fontFamily:"'Cormorant Garamond',serif", lineHeight:1.3 }}>{book.title}</h3>
          <p style={{ margin:'0 0 10px', fontSize:'0.78rem', color:'rgba(245,244,240,0.91)', fontStyle:'italic' }}>{book.author}</p>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px', flexWrap:'wrap' }}>
            <span style={{ fontSize:'0.65rem', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 10px', borderRadius:'99px', background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}33` }}>{cfg.label}</span>
            <span style={{ fontSize:'0.72rem', color:'rgba(245,244,240,0.91)' }}>{book.genre}</span>
            {moodObj && <span style={{ fontSize:'0.68rem', color:'rgba(167,139,250,0.8)', background:'rgba(167,139,250,0.08)', padding:'2px 8px', borderRadius:'99px', border:'1px solid rgba(167,139,250,0.2)' }}>{moodObj.label}</span>}
          </div>
          <Stars rating={book.rating} />
        </div>
      </div>
      <div style={{ marginTop:'16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
          <span style={{ fontSize:'0.72rem', color:'rgba(245,244,240,0.91)' }}>Progress</span>
          <span style={{ fontSize:'0.72rem', color:'rgba(245,244,240,0.91)' }}>{book.pages_read} / {book.total_pages} · {pct}%</span>
        </div>
        <ProgressBar pct={pct} />
      </div>
      {(book.date_started || book.date_finished) && (
        <div style={{ marginTop:'12px', display:'flex', gap:'12px', fontSize:'0.7rem', color:'rgba(245,244,240,0.91)' }}>
          {book.date_started && book.date_started !== 'null' && <span>Started {book.date_started}</span>}
          {book.date_finished && book.date_finished !== 'null' && <span>· Finished {book.date_finished}</span>}
        </div>
      )}
      <button onClick={e=>{ e.stopPropagation(); onDelete(book.id) }}
        style={{ position:'absolute', top:'14px', right:'14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', color:'rgba(255,255,255,0.25)', cursor:'pointer', fontSize:'0.7rem', padding:'3px 8px', transition:'all 0.2s' }}
        onMouseEnter={e=>{ e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='#f8717155' }}
        onMouseLeave={e=>{ e.currentTarget.style.color='rgba(255,255,255,0.25)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)' }}>✕</button>
    </div>
  )
}

function AddBookModal({ onClose, onAdded, existingBooks }) {
  const [form, setForm] = useState({ title:'', author:'', genre:'', status:'not read', mood:'', pages_read:'0', total_pages:'', rating:'', date_started:'', date_finished:'' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const submit = async () => {
    setError('')
    if (!form.title||!form.author||!form.genre||!form.total_pages){ setError('Please fill in Title, Author, Genre and Total Pages.'); return }
    setLoading(true)
    try {
      let freshBooks = existingBooks
      try { const res = await axios.get(`${API}/view_books`); freshBooks = res.data } catch {}
      const norm = s => (s||'').trim().toLowerCase()
      const duplicate = freshBooks.find(b => norm(b.title) === norm(form.title) && norm(b.author) === norm(form.author))
      if (duplicate) { setError(`"${duplicate.title}" by ${duplicate.author} is already in your vault!`); setLoading(false); return }
      await axios.post(`${API}/create`, { title:form.title.trim(), author:form.author.trim(), genre:form.genre.trim(), status:form.status, mood:form.mood||null, pages_read:parseInt(form.pages_read)||0, total_pages:parseInt(form.total_pages), rating:form.rating?parseInt(form.rating):null, date_started:form.date_started||null, date_finished:form.date_finished||null })
      onAdded(); onClose()
    } catch(e){ setError(e.response?.data?.detail||'Something went wrong.') }
    setLoading(false)
  }
  const inp = { width:'100%', padding:'9px 12px', borderRadius:'10px', fontSize:'0.85rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', color:'#f1f0ff', outline:'none', boxSizing:'border-box' }
  const lbl = { fontSize:'0.72rem', color:'#f1f0ff', marginBottom:'4px', display:'block', letterSpacing:'0.05em', textTransform:'uppercase' }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:'20px' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'linear-gradient(135deg,#1a1030,#120d25)', border:'1px solid rgba(167,139,250,0.25)', borderRadius:'24px', padding:'32px', width:'100%', maxWidth:'480px', boxShadow:'0 0 60px rgba(167,139,250,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.8rem', color:'#f1f0ff', marginBottom:'6px' }}>Add a Book ✨</h2>
        <p style={{ fontSize:'0.75rem', color:'#f1f0ff', marginBottom:'20px' }}>ID will be assigned automatically</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
          {[['title','Title *','text'],['author','Author *','text'],['genre','Genre *','text'],['total_pages','Total Pages *','number'],['pages_read','Pages Read','number'],['rating','Rating (0–5)','number'],['date_started','Date Started (DD-MM-YYYY)','text'],['date_finished','Date Finished (DD-MM-YYYY)','text']].map(([k,l,type])=>(
            <div key={k} style={{ gridColumn:['title','author'].includes(k)?'span 2':'span 1' }}>
              <label style={lbl}>{l}</label>
              <input type={type} value={form[k]} onChange={e=>set(k,e.target.value)} style={inp} />
            </div>
          ))}
          <div style={{ gridColumn:'span 2' }}>
            <label style={lbl}>Status *</label>
            <select value={form.status} onChange={e=>set('status',e.target.value)} style={inp}>
              <option value="not read">Not Read</option>
              <option value="reading">Reading</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div style={{ gridColumn:'span 2' }}>
            <label style={lbl}>Mood (optional)</label>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'4px' }}>
              {MOOD_OPTIONS.map(m=>(
                <button key={m.value} type="button" onClick={()=>set('mood', form.mood===m.value ? '' : m.value)}
                  style={{ padding:'6px 12px', borderRadius:'20px', fontSize:'0.75rem', cursor:'pointer', background:form.mood===m.value?'rgba(167,139,250,0.2)':'transparent', border:`1px solid ${form.mood===m.value?'#a78bfa':'rgba(255,255,255,0.15)'}`, color:form.mood===m.value?'#a78bfa':'rgba(255,255,255,0.5)', transition:'all 0.2s' }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {error && <p style={{ color:'#f87171', fontSize:'0.82rem', marginTop:'12px' }}>{error}</p>}
        <div style={{ display:'flex', gap:'10px', marginTop:'24px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:'12px', cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:'0.88rem' }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{ flex:2, padding:'11px', borderRadius:'12px', cursor:'pointer', background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', color:'white', fontSize:'0.88rem', fontWeight:'600', boxShadow:'0 0 20px rgba(124,58,237,0.4)' }}>{loading?'Adding...':'Add to Vault ✨'}</button>
        </div>
      </div>
    </div>
  )
}

function EditBookModal({ book, onClose, onSaved }) {
  const [form, setForm] = useState({ status:book.status||'not read', mood:book.mood||'', pages_read:String(book.pages_read??0), total_pages:String(book.total_pages??''), rating:book.rating!=null?String(book.rating):'', date_started:book.date_started&&book.date_started!=='null'?book.date_started:'', date_finished:book.date_finished&&book.date_finished!=='null'?book.date_finished:'' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const submit = async () => {
    setError(''); setLoading(true)
    try {
      await axios.put(`${API}/edit/${book.id}`, { status:form.status, mood:form.mood||null, pages_read:parseInt(form.pages_read)||0, total_pages:parseInt(form.total_pages), rating:form.rating!==''?parseInt(form.rating):null, date_started:form.date_started||null, date_finished:form.date_finished||null })
      onSaved(); onClose()
    } catch(e){ setError(e.response?.data?.detail||'Something went wrong.') }
    setLoading(false)
  }
  const inp = { width:'100%', padding:'9px 12px', borderRadius:'10px', fontSize:'0.85rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', color:'#f1f0ff', outline:'none', boxSizing:'border-box' }
  const lbl = { fontSize:'0.72rem', color:'#f1f0ff', marginBottom:'4px', display:'block', letterSpacing:'0.05em', textTransform:'uppercase' }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:'20px' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'linear-gradient(135deg,#1a1030,#120d25)', border:'1px solid rgba(249,168,212,0.25)', borderRadius:'24px', padding:'32px', width:'100%', maxWidth:'440px', boxShadow:'0 0 60px rgba(249,168,212,0.15)', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', gap:'16px', alignItems:'flex-start', marginBottom:'24px' }}>
          <BookCover title={book.title} author={book.author} />
          <div>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', color:'#f1f0ff', lineHeight:1.2, marginBottom:'4px' }}>{book.title}</h2>
            <p style={{ fontSize:'0.82rem', color:'#f1f0ff', fontStyle:'italic' }}>{book.author}</p>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
          <div style={{ gridColumn:'span 2' }}>
            <label style={lbl}>Status</label>
            <select value={form.status} onChange={e=>set('status',e.target.value)} style={inp}>
              <option value="not read">Not Read</option>
              <option value="reading">Reading</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div style={{ gridColumn:'span 2' }}>
            <label style={lbl}>Mood</label>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'4px' }}>
              {MOOD_OPTIONS.map(m=>(
                <button key={m.value} type="button" onClick={()=>set('mood', form.mood===m.value ? '' : m.value)}
                  style={{ padding:'6px 12px', borderRadius:'20px', fontSize:'0.75rem', cursor:'pointer', background:form.mood===m.value?'rgba(167,139,250,0.2)':'transparent', border:`1px solid ${form.mood===m.value?'#a78bfa':'rgba(255,255,255,0.15)'}`, color:form.mood===m.value?'#a78bfa':'rgba(255,255,255,0.5)', transition:'all 0.2s' }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div><label style={lbl}>Pages Read</label><input type="number" min="0" value={form.pages_read} onChange={e=>set('pages_read',e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Total Pages</label><input type="number" min="1" value={form.total_pages} onChange={e=>set('total_pages',e.target.value)} style={inp} /></div>
          <div style={{ gridColumn:'span 2' }}>
            <label style={lbl}>Rating (0–5)</label>
            <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
              {[0,1,2,3,4,5].map(n=>(
                <button key={n} onClick={()=>set('rating',String(n))} style={{ background:'none', border:'none', cursor:'pointer', fontSize:n===0?'0.72rem':'1.3rem', color:parseInt(form.rating)>=n&&n>0?'#fbbf24':n===0?(form.rating===''||form.rating==='0'?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.2)'):'rgba(255,255,255,0.2)', filter:parseInt(form.rating)>=n&&n>0?'drop-shadow(0 0 4px #fbbf24)':'none', transition:'all 0.15s', padding:'2px' }}>{n===0?'✕':'★'}</button>
              ))}
            </div>
          </div>
          <div><label style={lbl}>Date Started</label><input type="text" placeholder="DD-MM-YYYY" value={form.date_started} onChange={e=>set('date_started',e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Date Finished</label><input type="text" placeholder="DD-MM-YYYY" value={form.date_finished} onChange={e=>set('date_finished',e.target.value)} style={inp} /></div>
        </div>
        {error && <p style={{ color:'#f87171', fontSize:'0.82rem', marginTop:'12px' }}>{error}</p>}
        <div style={{ display:'flex', gap:'10px', marginTop:'24px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:'12px', cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:'0.88rem' }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{ flex:2, padding:'11px', borderRadius:'12px', cursor:'pointer', background:'linear-gradient(135deg,#be185d,#f9a8d4)', border:'none', color:'white', fontSize:'0.88rem', fontWeight:'600', boxShadow:'0 0 20px rgba(249,168,212,0.3)' }}>{loading?'Saving...':'Save Changes ✨'}</button>
        </div>
      </div>
    </div>
  )
}

function Heatmap() {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const getMonthLabels = cols => {
    const labels = []; let last = -1
    cols.forEach((week, i) => {
      const m = (week.find(c => !c.inactive) || week[0]).date.getMonth()
      if (m !== last) { labels.push({ i, label: MONTHS[m] }); last = m }
    })
    return labels
  }
  const [cols, setCols]           = useState(() => buildGrid())
  const [pages, setPages]         = useState('')
  const [showInput, setShowInput] = useState(false)
  const flat          = useMemo(() => cols.flat(), [cols])
  const totalSessions = useMemo(() => flat.filter(c => !c.inactive && c.value > 0).reduce((s,c) => s + c.value, 0), [flat])
  const totalPages    = useMemo(() => flat.filter(c => !c.inactive).reduce((s,c) => s + c.pages, 0), [flat])
  const logToday = useCallback(() => {
    const HEATMAP_KEY = getStorageKey('vault_heatmap')
    const key  = localDateKey(new Date())
    let saved = {}
    try { saved = JSON.parse(localStorage.getItem(HEATMAP_KEY) || '{}') } catch {}
    saved[key] = (saved[key] || 0) + 1
    const parsedPages = parseInt(pages) || 0
    if (parsedPages > 0) saved[key + '_pages'] = (saved[key + '_pages'] || 0) + parsedPages
    localStorage.setItem(HEATMAP_KEY, JSON.stringify(saved))
    setCols(buildGrid())
    setPages('')
    setShowInput(false)
  }, [pages])
  const N           = cols.length
  const monthLabels = useMemo(() => getMonthLabels(cols), [cols])
  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'12px 18px 10px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <h3 style={{ fontSize:'0.8rem', color:'rgba(245,244,240,0.75)', textTransform:'uppercase', letterSpacing:'0.1em' }}>📅 Reading Activity — {new Date().getFullYear()}</h3>
          <span style={{ fontSize:'0.7rem', color:'rgba(245,244,240,0.5)' }}>{totalSessions} session{totalSessions !== 1 ? 's' : ''}{totalPages > 0 ? ` · ${totalPages.toLocaleString()} pages` : ''}</span>
        </div>
        <button onClick={() => setShowInput(s => !s)} style={{ fontSize:'0.68rem', padding:'4px 10px', borderRadius:'7px', background:'rgba(167,139,250,0.12)', border:'1px solid rgba(167,139,250,0.25)', color:'#a78bfa', cursor:'pointer' }}>+ Log</button>
      </div>
      {showInput && (
        <div style={{ display:'flex', gap:'8px', marginBottom:'8px', alignItems:'center' }}>
          <input type="number" min="0" placeholder="Pages read today" value={pages} onChange={e => setPages(e.target.value)} onKeyDown={e => e.key === 'Enter' && logToday()}
            style={{ flex:1, padding:'6px 10px', borderRadius:'7px', fontSize:'0.75rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#f1f0ff', outline:'none' }} />
          <button onClick={logToday} style={{ padding:'6px 12px', borderRadius:'7px', background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', color:'white', cursor:'pointer', fontSize:'0.75rem' }}>Log</button>
        </div>
      )}
      <div style={{ width:'100%' }}>
        <div style={{ display:'grid', gridTemplateColumns:`22px repeat(${N}, 1fr)`, gap:'2px', marginBottom:'2px' }}>
          <div />
          {cols.map((_, i) => { const l = monthLabels.find(m => m.i === i); return <div key={i} style={{ fontSize:'0.65rem', color:'rgb(251,250,249)', overflow:'hidden', whiteSpace:'nowrap' }}>{l ? l.label : ''}</div> })}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:`22px repeat(${N}, 1fr)`, gap:'2px' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
            {DAYS.map((d,i) => <div key={d} style={{ height:'10px', display:'flex', alignItems:'center', fontSize:'0.55rem', color:'rgb(251,250,249)' }}>{i % 2 === 1 ? d : ''}</div>)}
          </div>
          {cols.map((week, wi) => (
            <div key={wi} style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
              {week.map((c, di) => (
                <div key={di}
                  title={(() => { if (c.inactive) return ''; const [y,m,d] = c.key.split('-'); return `${d}/${m}/${y}${c.value > 0 ? `: ${c.value} session${c.value > 1 ? 's' : ''}` : ''}${c.pages > 0 ? ` · ${c.pages} pages` : ''}` })()}
                  style={{ height:'9px', borderRadius:'1.5px', background:colorFor(c.value), transition:'transform 0.1s', minWidth:0 }}
                  onMouseEnter={e => { if (!c.inactive) e.currentTarget.style.transform = 'scale(1.6)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', gap:'5px', alignItems:'center', marginTop:'6px', justifyContent:'flex-end' }}>
        <span style={{ fontSize:'0.55rem', color:'rgba(245,244,240,0.45)' }}>Less</span>
        {[0,1,2,3,4].map(v => <div key={v} style={{ width:'8px', height:'8px', borderRadius:'1.5px', background:colorFor(v) }} />)}
        <span style={{ fontSize:'0.55rem', color:'rgba(245,244,240,0.45)' }}>More</span>
      </div>
    </div>
  )
}

function TBRJar() {
  const WTR_KEY = getStorageKey('vault_wtr')
  const [list, setList]       = useState(() => { try { return JSON.parse(localStorage.getItem(WTR_KEY) || '[]') } catch { return [] } })
  const [input, setInput]     = useState('')
  const [picked, setPicked]   = useState(null)
  const [shaking, setShaking] = useState(false)
  const [focused, setFocused] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const save = next => { setList(next); localStorage.setItem(WTR_KEY, JSON.stringify(next)) }
  const add = () => { if (!input.trim()) return; save([...list, { id: Date.now(), title: input.trim() }]); setInput('') }
  const remove = id => { save(list.filter(b => b.id !== id)); if (picked?.id === id) setPicked(null) }
  const pickRandom = () => {
    if (!list.length) return
    setShaking(true)
    setTimeout(() => { setPicked(list[Math.floor(Math.random() * list.length)]); setShaking(false) }, 700)
  }
  const slips = useMemo(() => Array.from({ length: Math.min(list.length, 12) }, (_, i) => ({ w: 22 + (i * 9) % 28, hue: (i * 51) % 360, left: 6 + (i * 19) % 46, bot: 3 + (i * 7) % 50, rot: -18 + (i * 11) % 36 })), [list.length])
  const ROMAN = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20']
  const PREVIEW_COUNT = 5
  const visibleList = expanded ? list : list.slice(0, PREVIEW_COUNT)
  return (
    <div style={{ background:'linear-gradient(155deg, rgba(16,6,34,0.98), rgba(8,4,20,0.99))', border:'1px solid rgba(167,139,250,0.18)', borderRadius:'24px', padding:'28px', boxShadow:'0 16px 56px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'22px' }}>
        <div>
          <h3 style={{ fontSize:'0.8rem', color:'rgb(247,246,250)', textTransform:'uppercase', letterSpacing:'0.2em', marginBottom:'5px' }}>🫙 TBR Jar</h3>
          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', color:'#c4b5fd', lineHeight:1.4 }}>{list.length === 0 ? 'The jar awaits its stories…' : `${list.length} tale${list.length === 1 ? '' : 's'} waiting to be told...`}</p>
        </div>
        {list.length > 0 && (
          <button onClick={pickRandom} style={{ padding:'8px 16px', borderRadius:'12px', cursor:'pointer', background:'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(236,72,153,0.15))', border:'1px solid rgba(167,139,250,0.3)', color:'#c4b5fd', fontSize:'0.76rem', fontWeight:'600', letterSpacing:'0.05em' }}>🎲 Fate decides</button>
        )}
      </div>
      <div style={{ display:'flex', justifyContent:'center', marginBottom:'24px' }}>
        <div style={{ position:'relative', width:'150px', height:'140px', flexShrink:0, animation: shaking ? 'jarShake 0.7s ease' : 'none' }}>
          <div style={{ position:'absolute', bottom:0, left:'18px', right:'18px', height:'108px', background:'linear-gradient(155deg,rgba(167,139,250,0.07),rgba(124,58,237,0.03))', border:'1.5px solid rgba(167,139,250,0.22)', borderRadius:'10px 10px 20px 20px', overflow:'hidden', backdropFilter:'blur(10px)', boxShadow:'inset 0 0 40px rgba(124,58,237,0.05), 0 12px 40px rgba(0,0,0,0.45)' }}>
            {slips.map((s,i) => <div key={i} style={{ position:'absolute', width:`${s.w}px`, height:'9px', background:`linear-gradient(90deg,hsl(${s.hue},65%,65%),hsl(${s.hue+28},55%,75%))`, borderRadius:'2px', opacity:0.72, left:`${s.left}%`, bottom:`${s.bot}%`, transform:`rotate(${s.rot}deg)` }} />)}
            {list.length === 0 && <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'6px' }}><span style={{ fontSize:'1.8rem', opacity:0.18 }}>🪄</span><span style={{ fontSize:'0.6rem', color:'rgba(167,139,250,0.3)', fontStyle:'italic' }}>empty</span></div>}
          </div>
          <div style={{ position:'absolute', top:'6px', left:'12px', right:'12px', height:'32px', background:'linear-gradient(180deg,rgba(167,139,250,0.22),rgba(124,58,237,0.1))', border:'1.5px solid rgba(167,139,250,0.32)', borderRadius:'12px 12px 6px 6px' }} />
          {list.length > 0 && <div style={{ position:'absolute', top:'-10px', right:'-8px', minWidth:'27px', height:'27px', borderRadius:'99px', padding:'0 7px', background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', color:'white', fontWeight:'700', boxShadow:'0 0 16px rgba(124,58,237,0.7)' }}>{list.length}</div>}
        </div>
      </div>
      {picked && (
        <div style={{ marginBottom:'20px', padding:'16px 20px', background:'linear-gradient(135deg,rgba(249,168,212,0.07),rgba(124,58,237,0.07))', border:'1px solid rgba(249,168,212,0.2)', borderRadius:'16px', animation:'fadein 0.4s ease' }}>
          <div style={{ fontSize:'0.58rem', color:'#f9a8d4', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:'6px', opacity:0.8 }}>✨ Read this next</div>
          <div style={{ fontSize:'1.15rem', fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', fontWeight:'600', color:'#f9a8d4' }}>{picked.title}</div>
        </div>
      )}
      <div style={{ height:'1px', background:'linear-gradient(90deg,transparent,rgba(167,139,250,0.18),transparent)', marginBottom:'20px' }} />
      <div style={{ display:'flex', gap:'10px', marginBottom:'20px' }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="Add a title to the jar…"
          style={{ flex:1, padding:'11px 16px', borderRadius:'14px', fontSize:'0.9rem', background:'rgba(255,255,255,0.04)', border:`1px solid ${focused ? 'rgba(167,139,250,0.45)' : 'rgba(255,255,255,0.07)'}`, color:'#f1f0ff', outline:'none', boxSizing:'border-box' }} />
        <button onClick={add} style={{ padding:'11px 20px', borderRadius:'14px', background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', color:'white', cursor:'pointer', fontSize:'1.05rem', fontWeight:'700' }}>+</button>
      </div>
      {list.length === 0 ? (
        <p style={{ fontSize:'0.95rem', color:'rgba(244,244,243,0.94)', textAlign:'center', padding:'14px 0' }}>Drop some books in the jar…</p>
      ) : (
        <>
          <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
            {visibleList.map((b, idx) => {
              const isPicked = picked?.id === b.id
              return (
                <div key={b.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'11px 14px', borderRadius:'13px', background:isPicked?'rgba(249,168,212,0.06)':'rgba(255,255,255,0.025)', border:`1px solid ${isPicked?'rgba(249,168,212,0.2)':'rgba(255,255,255,0.05)'}` }}>
                  <span style={{ fontSize:'0.65rem', color:'rgba(167,139,250,0.4)', flexShrink:0, minWidth:'18px', textAlign:'right' }}>{ROMAN[idx] || idx+1}.</span>
                  <span style={{ fontSize:'0.9rem', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:isPicked?'#f9a8d4':'rgba(245,244,240,0.85)' }}>{b.title}</span>
                  <button onClick={() => remove(b.id)} style={{ background:'none', border:'none', color:'rgba(245,244,240,0.18)', cursor:'pointer', fontSize:'0.7rem' }} onMouseEnter={e=>e.currentTarget.style.color='#f87171'} onMouseLeave={e=>e.currentTarget.style.color='rgba(245,244,240,0.18)'}>✕</button>
                </div>
              )
            })}
          </div>
          {list.length > PREVIEW_COUNT && (
            <button onClick={() => setExpanded(o => !o)} style={{ marginTop:'10px', width:'100%', padding:'9px', borderRadius:'12px', cursor:'pointer', background:'rgba(167,139,250,0.07)', border:'1px solid rgba(167,139,250,0.18)', color:'rgba(196,181,253,0.7)', fontSize:'0.78rem' }}>
              {expanded ? `↑ Show less` : `↓ Show all ${list.length} titles`}
            </button>
          )}
        </>
      )}
      <style>{`@keyframes jarShake { 0%,100%{transform:rotate(0deg)} 15%{transform:rotate(-9deg) translateY(-4px)} 30%{transform:rotate(9deg) translateY(-6px)} 50%{transform:rotate(-6deg) translateY(-3px)} 70%{transform:rotate(6deg) translateY(-4px)} }`}</style>
    </div>
  )
}

function ReadingGoals({ completedCount = 0 }) {
  const YEAR_KEY  = getStorageKey('vault_yearGoal')
  const MONTH_KEY = getStorageKey('vault_monthGoal')
  const [yearGoal, setYearGoal]   = useState(() => parseInt(localStorage.getItem(YEAR_KEY) || '0'))
  const [monthGoal, setMonthGoal] = useState(() => parseInt(localStorage.getItem(MONTH_KEY) || '0'))
  const [editingYear, setEditingYear]   = useState(false)
  const [editingMonth, setEditingMonth] = useState(false)
  const r = 52, circ = 2 * Math.PI * r
  const yearPct = Math.min((completedCount / (yearGoal || 1)) * 100, 100)
  const stroke  = (yearPct / 100) * circ
  const months  = ["January","February","March","April","May","June","July","August","September","October","November","December"]
  const currentMonth = months[new Date().getMonth()]
  const numStyle = { fontFamily:"'Cormorant Garamond', Georgia, serif", fontSize:'1.4rem', color:'#a78bfa', fontWeight:600, lineHeight:1 }
  const handleInputChange = (setter, key, val) => { if (val === "") { setter("") } else { const n = parseInt(val, 10); setter(n); localStorage.setItem(key, String(n)) } }
  const handleBlur = (setter, key, currentVal, flagSetter) => { const val = (!currentVal || currentVal < 1) ? 1 : currentVal; setter(val); localStorage.setItem(key, String(val)); flagSetter(false) }
  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'24px', padding:'24px', color:'#fff' }}>
      <h3 style={{ fontSize:'0.8rem', color:'rgba(245,244,240,0.91)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>🎯 {new Date().getFullYear()} Reading Goal</h3>
      <div style={{ background:'radial-gradient(circle at top left, rgba(124,58,237,0.15), transparent)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:'20px', padding:'30px 20px', marginBottom:'20px', display:'flex', flexDirection:'column', alignItems:'center', gap:'20px' }}>
        <div style={{ position:'relative' }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <defs><linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#ec4899"/></linearGradient></defs>
            <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="12"/>
            <circle cx="70" cy="70" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="12" strokeDasharray={`${stroke} ${circ}`} strokeLinecap="round" transform="rotate(-90 70 70)" style={{ transition:'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.8rem', color:'#fff', fontWeight:600 }}>{Math.round(yearPct)}%</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'baseline', gap:'8px' }}>
          <span style={{ ...numStyle, fontSize:'2.2rem', color:'#fff' }}>{completedCount}</span>
          <span style={{ fontSize:'1.5rem', color:'rgba(255,255,255,0.1)' }}>/</span>
          {editingYear ? (
            <input autoFocus type="number" value={yearGoal} onChange={e=>handleInputChange(setYearGoal, YEAR_KEY, e.target.value)} onBlur={()=>handleBlur(setYearGoal, YEAR_KEY, yearGoal, setEditingYear)} style={{ width:'60px', background:'rgba(255,255,255,0.05)', border:'1px solid #7c3aed', borderRadius:'8px', color:'#a78bfa', fontSize:'2rem', textAlign:'center', outline:'none' }} />
          ) : (
            <span onClick={()=>setEditingYear(true)} style={{ ...numStyle, fontSize:'2.2rem', cursor:'pointer' }}>{yearGoal}</span>
          )}
          <span style={{ fontSize:'0.8rem', color:'rgba(245,244,240,0.91)', marginLeft:'4px' }}>books</span>
        </div>
      </div>
      <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'20px', padding:'20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' }}>
          <div style={{ fontSize:'0.7rem', color:'rgba(245,244,240,0.91)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{currentMonth} Tracker</div>
          <div style={{ display:'flex', alignItems:'baseline', gap:'4px' }}>
            <span style={{ ...numStyle, color:'#f87171', fontSize:'1.2rem' }}>{completedCount}</span>
            <span style={{ color:'rgba(255,255,255,0.1)' }}>/</span>
            {editingMonth ? (
              <input autoFocus type="number" value={monthGoal} onChange={e=>handleInputChange(setMonthGoal, MONTH_KEY, e.target.value)} onBlur={()=>handleBlur(setMonthGoal, MONTH_KEY, monthGoal, setEditingMonth)} style={{ width:'40px', background:'transparent', border:'1px solid #ef4444', borderRadius:'4px', color:'#f87171', fontSize:'1.2rem', textAlign:'center' }} />
            ) : (
              <span onClick={()=>setEditingMonth(true)} style={{ ...numStyle, color:'#f87171', fontSize:'1.2rem', cursor:'pointer' }}>{monthGoal}</span>
            )}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(32px, 1fr))', gap:'8px', maxHeight:'200px', overflowY:'auto' }}>
          {Array.from({ length:Math.max(monthGoal||0,0) },(_,i)=>{
            const done = i < completedCount
            return (
              <div key={i} style={{ height:'32px', width:'32px', borderRadius:'8px', background:done?'rgba(239,68,68,0.1)':'rgba(255,255,255,0.03)', border:done?'1px solid rgba(239,68,68,0.2)':'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {done ? <svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 4.144 3.572 2 6.5 2c1.742 0 3.093.87 4.5 2.312C12.41 2.87 13.757 2 15.5 2 18.429 2 21 4.144 21 7.191c0 4.105-5.37 8.863-9 13.18-.74.87-1.255 1.222-1.255 1.222z" fill="#ef4444"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity:0.2 }}><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 4.144 3.572 2 6.5 2c1.742 0 3.093.87 4.5 2.312C12.41 2.87 13.757 2 15.5 2 18.429 2 21 4.144 21 7.191c0 4.105-5.37 8.863-9 13.18-.74.87-1.255 1.222-1.255 1.222z" fill="white"/></svg>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Challenges() {
  const CHALLENGES_KEY = getStorageKey('vault_challenges')
  const DEFAULT_ITEMS = [
    { id:1, title:'Read 5 different genres', icon:'🎭', total:5, color:'#f59e0b' },
    { id:2, title:'Finish a book in one day', icon:'⚡', total:1, color:'#10b981' },
    { id:3, title:'Read 3 books by same author', icon:'✍️', total:3, color:'#8b5cf6' },
    { id:4, title:'Read a book over 500 pages', icon:'📖', total:1, color:'#ec4899' },
    { id:5, title:'Read before bed 7 days in a row', icon:'🌙', total:7, color:'#06b6d4' },
  ]
  const [progress, setProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHALLENGES_KEY) || '{}') } catch { return {} }
  })
  const save = (next) => { setProgress(next); localStorage.setItem(CHALLENGES_KEY, JSON.stringify(next)) }
  const increment = (id, total) => {
    const current = progress[id] || 0
    if (current >= total) return
    save({ ...progress, [id]: current + 1 })
  }
  const decrement = (id) => {
    const current = progress[id] || 0
    if (current <= 0) return
    save({ ...progress, [id]: current - 1 })
  }

  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'18px' }}>
      <h3 style={{ fontSize:'0.8rem', color:'rgba(245,244,240,0.91)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>⚡ Challenges</h3>
      {DEFAULT_ITEMS.map(ch => {
        const done = progress[ch.id] || 0
        const completed = done >= ch.total
        return (
          <div key={ch.id} style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px', padding:'10px', background:completed?`${ch.color}10`:'rgba(255,255,255,0.02)', borderRadius:'10px', border:`1px solid ${completed?ch.color+'40':'rgba(255,255,255,0.05)'}` }}>
            <span style={{ fontSize:'18px', flexShrink:0 }}>{ch.icon}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'0.78rem', color:completed?'#f1f0ff':'#d1d5db', marginBottom:'4px' }}>
                {ch.title}{completed && <span style={{ marginLeft:'6px', fontSize:'0.65rem', color:ch.color }}>✓ Done!</span>}
              </div>
              <div style={{ height:'3px', background:'rgba(255,255,255,0.06)', borderRadius:'2px' }}>
                <div style={{ height:'100%', borderRadius:'2px', width:`${Math.min((done/ch.total)*100,100)}%`, background:completed?`linear-gradient(90deg,${ch.color},rgba(255,255,255,0.3))`:ch.color, transition:'width 0.4s ease' }} />
              </div>
            </div>
            <span style={{ fontSize:'0.68rem', color:'rgba(245,244,240,0.7)', flexShrink:0 }}>{done}/{ch.total}</span>
            <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
              <button onClick={() => increment(ch.id, ch.total)} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:'4px', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:'0.6rem', padding:'2px 5px', lineHeight:1 }}>▲</button>
              <button onClick={() => decrement(ch.id)} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:'4px', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:'0.6rem', padding:'2px 5px', lineHeight:1 }}>▼</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MoodFilterPanel({ selectedMood, onChange, books }) {
  const moods = [{ value:'all', label:'✨ All Moods' }, ...MOOD_OPTIONS]
  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'18px' }}>
      <h3 style={{ fontSize:'0.8rem', color:'rgba(245,244,240,0.91)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>🎭 Filter by Mood</h3>
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
        {moods.map(m => {
          const count = m.value === 'all' ? books.length : books.filter(b => b.mood === m.value).length
          return (
            <button key={m.value} onClick={() => onChange(m.value)}
              style={{ padding:'8px 16px', borderRadius:'20px', fontSize:'0.78rem', cursor:'pointer', background:selectedMood===m.value?'rgba(167,139,250,0.2)':'transparent', border:`1px solid ${selectedMood===m.value?'#a78bfa':'rgba(255,255,255,0.1)'}`, color:selectedMood===m.value?'#a78bfa':'rgba(245,244,240,0.91)', transition:'all 0.2s' }}>
              {m.label}{count > 0 && m.value !== 'all' && <span style={{ marginLeft:'5px', fontSize:'0.62rem', opacity:0.6 }}>({count})</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(() => !!getToken())

  const [books, setBooks]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [sortBy, setSortBy]             = useState(() => localStorage.getItem(getStorageKey('vault_sortBy')) || '')
  const [sortOrder, setSortOrder]       = useState(() => localStorage.getItem(getStorageKey('vault_sortOrder')) || 'desc')
  const [filter, setFilter]             = useState(() => localStorage.getItem(getStorageKey('vault_filter')) || 'all')
  const [selectedMood, setSelectedMood] = useState(() => localStorage.getItem(getStorageKey('vault_mood')) || 'all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBook, setEditingBook]   = useState(null)
  const [shelfSelected, setShelfSelected] = useState(null)
  const [libOpen, setLibOpen]           = useState(false)
  const [particles] = useState(()=>Array.from({length:30},(_,i)=>({ id:i, x:Math.random()*100, y:Math.random()*100, size:Math.random()*2+1, duration:Math.random()*6+4, delay:Math.random()*5 })))

  const setSortByP    = v => { setSortBy(v);       localStorage.setItem(getStorageKey('vault_sortBy'), v) }
  const setSortOrderP = v => { setSortOrder(v);    localStorage.setItem(getStorageKey('vault_sortOrder'), v) }
  const setFilterP    = v => { setFilter(v);       localStorage.setItem(getStorageKey('vault_filter'), v) }
  const setMoodP      = v => { setSelectedMood(v); localStorage.setItem(getStorageKey('vault_mood'), v) }

  const handleLogout = () => { removeToken(); setAuthed(false); setBooks([]) }

  const fetchBooks = async () => {
    try { const res = await axios.get(`${API}/view_books`); setBooks(res.data) }
    catch(e) {
      if (e.response?.status === 401) { handleLogout() }
      else { console.error('Is FastAPI running?', e) }
    }
    setLoading(false)
  }

  useEffect(() => { if (authed) fetchBooks() }, [authed])

  const deleteBook = async id => {
    if(!confirm('Remove this book from your vault?')) return
    await axios.delete(`${API}/delete/${id}`)
    if(shelfSelected?.id===id) setShelfSelected(null)
    fetchBooks()
  }

  const displayed = useMemo(() => {
    const normalize = s => (s || '').toString().trim().toLowerCase()
    const seen = new Set()
    return books
      .filter(b => {
        const key = `${normalize(b.title)}|||${normalize(b.author)}`
        if (seen.has(key)) return false
        seen.add(key)
        const moodActive = selectedMood !== 'all'
        const statusOk   = moodActive ? true : (filter === 'all' || b.status === filter)
        const moodOk     = selectedMood === 'all' || normalize(b.mood) === normalize(selectedMood)
        return statusOk && moodOk
      })
      .sort((a,b) => {
        if(!sortBy) return 0
        if(sortOrder==='asc') return a[sortBy]>b[sortBy]?1:-1
        return a[sortBy]<b[sortBy]?1:-1
      })
  }, [books, filter, selectedMood, sortBy, sortOrder])

  const stats = { total:books.length, completed:books.filter(b=>b.status==='completed').length, reading:books.filter(b=>b.status==='reading').length }
  const STAT_CARDS = [
    { label:'Total Books', value:stats.total,     icon:'📚', key:'all'       },
    { label:'Completed',   value:stats.completed, icon:'✅', key:'completed' },
    { label:'Reading',     value:stats.reading,   icon:'📖', key:'reading'   },
  ]

  useEffect(() => { setLibOpen(false) }, [filter, selectedMood])

  if (!authed) return <AuthPage onLogin={() => setAuthed(true)} />

  const userEmail = getUserEmail()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0d0a1a;overflow-x:hidden;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:rgba(167,139,250,0.3);border-radius:99px;}
        @keyframes float{0%,100%{transform:translateY(0);opacity:0.4;}50%{transform:translateY(-20px);opacity:0.9;}}
        @keyframes shimmer{0%{background-position:-200% center;}100%{background-position:200% center;}}
        @keyframes fadein{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        select option{background:#1a1030;color:#f1f0ff;}
        .animate-fade-in{animation:fadein 0.5s ease-out forwards;opacity:0;}
      `}</style>
      <div style={{ minHeight:'100vh', background:'#0d0a1a', fontFamily:"'DM Sans',sans-serif", position:'relative' }}>
        <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
          <div style={{ position:'absolute', top:'-10%', left:'-5%', width:'500px', height:'500px', borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,0.15),transparent 70%)', filter:'blur(40px)' }} />
          {particles.map(p=>(
            <div key={p.id} style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, width:`${p.size}px`, height:`${p.size}px`, borderRadius:'50%', background:'rgba(167,139,250,0.6)', animation:`float ${p.duration}s ${p.delay}s ease-in-out infinite` }} />
          ))}
        </div>

        <div style={{ position:'relative', zIndex:1, maxWidth:'1500px', margin:'0 auto', padding:'48px 24px' }}>
          <header style={{ textAlign:'center', marginBottom:'40px', animation:'fadein 0.8s ease' }}>
            <p style={{ fontSize:'0.8rem', letterSpacing:'0.25em', textTransform:'uppercase', color:'rgba(167,139,250,0.6)', marginBottom:'12px' }}>✦ Your Literary Sanctuary ✦</p>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(3rem,6vw,4.5rem)', fontWeight:'700', lineHeight:1.2, marginBottom:'16px', background:'linear-gradient(135deg,#e0d7ff 0%,#a78bfa 40%,#f9a8d4 80%,#fbbf24 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', animation:'shimmer 6s linear infinite' }}>My Reading Vault</h1>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontStyle:'italic', color:'#f1f0ff', marginBottom:'12px' }}>Where every page tells a story…</p>
            <button onClick={handleLogout}
              style={{ padding:'6px 16px', borderRadius:'9px', cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', fontSize:'0.75rem', transition:'all 0.2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='#f8717155' }}
              onMouseLeave={e=>{ e.currentTarget.style.color='rgb(255, 253, 253)'; e.currentTarget.style.borderColor='rgba(255, 254, 254, 0.1)' }}>
              Logout ➜
            </button>
          </header>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', maxWidth:'700px', margin:'0 auto 28px' }}>
            {STAT_CARDS.map(s=>{
              const active = filter===s.key
              return (
                <div key={s.label} onClick={()=>setFilterP(active?'all':s.key)}
                  style={{ background:active?'rgba(167,139,250,0.12)':'rgba(255,255,255,0.03)', border:active?'1px solid rgba(167,139,250,0.4)':'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'18px 16px', textAlign:'center', cursor:'pointer', transition:'all 0.2s' }}>
                  <div style={{ fontSize:'1.4rem', marginBottom:'6px' }}>{s.icon}</div>
                  <div style={{ fontSize:'1.6rem', fontWeight:'700', color:active?'#a78bfa':'#e0d7ff', fontFamily:"'Cormorant Garamond',serif" }}>{s.value}</div>
                  <div style={{ fontSize:'0.7rem', color:'rgba(245,244,240,0.7)', textTransform:'uppercase' }}>{s.label}</div>
                </div>
              )
            })}
          </div>

          {/* Heatmap — key forces remount on user change so buildGrid re-runs fresh */}
          <div style={{ marginBottom:'36px' }}><Heatmap key={userEmail} /></div>

          {/* Two-column layout */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:'28px', alignItems:'stretch' }}>

            {/* LEFT COLUMN */}
            <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                    <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:'700', letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(167,139,250,0.8)' }}>✦ My Library ✦</h2>
                    <span style={{ fontSize:'0.68rem', background:'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.25)', color:'#a78bfa', borderRadius:'99px', padding:'2px 10px' }}>{displayed.length} books</span>
                  </div>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <select value={sortBy} onChange={e=>setSortByP(e.target.value)} style={{ padding:'6px 10px', borderRadius:'9px', fontSize:'0.75rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'#e0d7ff', outline:'none' }}>
                      <option value="">Sort…</option>
                      <option value="rating">Rating</option>
                      <option value="author">Author</option>
                      <option value="genre">Genre</option>
                    </select>
                    <select value={sortOrder} onChange={e=>setSortOrderP(e.target.value)} style={{ padding:'6px 10px', borderRadius:'9px', fontSize:'0.75rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'#e0d7ff', outline:'none' }}>
                      <option value="desc">↓</option>
                      <option value="asc">↑</option>
                    </select>
                    <button onClick={()=>setShowAddModal(true)} style={{ padding:'6px 16px', borderRadius:'9px', cursor:'pointer', background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', color:'white', fontWeight:'600', fontSize:'0.78rem', whiteSpace:'nowrap' }}>+ Add</button>
                  </div>
                </div>
                <div style={{ padding:'0 16px 16px' }}>
                  {loading ? (
                    <div style={{ textAlign:'center', color:'#e0d7ff', padding:'32px' }}>✨ Opening the vault…</div>
                  ) : displayed.length === 0 ? (
                    <div style={{ textAlign:'center', color:'rgba(245,244,240,0.4)', padding:'28px', fontStyle:'italic' }}>No books match your filters.</div>
                  ) : (
                    <>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px' }}>
                        {(libOpen ? displayed : displayed.slice(0,9)).map((book,i) => (
                          <BookCard key={book.id} book={book} onDelete={deleteBook} onEdit={setEditingBook} style={{ animationDelay:`${i*0.05}s` }} />
                        ))}
                      </div>
                      {displayed.length > 9 && (
                        <button onClick={()=>setLibOpen(o=>!o)}
                          style={{ marginTop:'14px', width:'100%', padding:'10px', borderRadius:'12px', cursor:'pointer', background:'rgba(167,139,250,0.07)', border:'1px solid rgba(167,139,250,0.18)', color:'rgba(196,181,253,0.7)', fontSize:'0.78rem', letterSpacing:'0.05em' }}>
                          {libOpen ? `↑ Show less` : `↓ Show all ${displayed.length} books`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <MoodFilterPanel selectedMood={selectedMood} onChange={setMoodP} books={books} />
              {/* key forces remount on user change so TBRJar reads the correct user's storage */}
              <TBRJar key={userEmail} />
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'18px' }}>
                <h3 style={{ fontSize:'0.8rem', color:'rgba(245,244,240,0.8)', textTransform:'uppercase', marginBottom:'14px' }}>📚 Bookshelf</h3>
                <Bookshelf books={displayed} selectedBook={shelfSelected} onSelect={b=>setShelfSelected(prev=>prev?.id===b.id?null:b)} />
                {shelfSelected && (
                  <div style={{ marginTop:'14px' }}>
                    <BookDetailPanel book={shelfSelected} onClose={()=>setShelfSelected(null)} onEdit={b=>{ setEditingBook(b); setShelfSelected(null) }} />
                  </div>
                )}
              </div>
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'18px' }}>
                <h3 style={{ fontSize:'0.8rem', color:'rgba(245,244,240,0.8)', textTransform:'uppercase', marginBottom:'14px' }}>✦ Genres</h3>
                {Object.entries(books.reduce((acc,b)=>{ acc[b.genre]=(acc[b.genre]||0)+1; return acc },{})).sort((a,b)=>b[1]-a[1]).map(([genre,count])=>(
                  <div key={genre} style={{ marginBottom:'10px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', color:'#f5f4f0' }}><span>{genre}</span><span>{count}</span></div>
                    <div style={{ height:'3px', background:'rgba(255,255,255,0.06)', borderRadius:'99px', marginTop:'4px' }}>
                      <div style={{ height:'100%', width:`${(count/books.length)*100}%`, background:'linear-gradient(90deg,#7c3aed,#f9a8d4)', borderRadius:'99px' }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* key forces remount on user change so ReadingGoals reads the correct user's storage */}
              <ReadingGoals key={userEmail} completedCount={stats.completed} />
              <Challenges key={userEmail} />
            </div>
          </div>
        </div>
      </div>

      {showAddModal && <AddBookModal onClose={()=>setShowAddModal(false)} onAdded={fetchBooks} existingBooks={books} />}
      {editingBook  && <EditBookModal book={editingBook} onClose={()=>setEditingBook(null)} onSaved={fetchBooks} />}
    </>
  )
}

