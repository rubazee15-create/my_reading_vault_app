import { useState, useEffect } from 'react'
import axios from 'axios'

const API = 'http://127.0.0.1:8000'

// Try title-based cover, fall back to a coloured placeholder
const COVER_URL = (title) =>
  `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-L.jpg`

const STATUS_CONFIG = {
  'completed': { label:'Completed', color:'#7de482', bg:'rgba(58,147,86,0.15)',   glow:'0 0 20px rgba(137,230,129,0.4)' },
  'reading':   { label:'Reading',   color:'#f9a8d4', bg:'rgba(249,168,212,0.15)', glow:'0 0 20px rgba(249,168,212,0.4)' },
  'not read':  { label:'Not Read',  color:'#93c5fd', bg:'rgba(147,197,253,0.15)', glow:'0 0 20px rgba(147,197,253,0.3)' },
}

// ── helpers ───────────────────────────────────────────────────
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

// Smarter cover — tries Open Library by title, then by author+title, then shows stylised placeholder
function BookCover({ title, author }) {
  const urls = [
    `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-L.jpg`,
    `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-M.jpg`,
  ]
  const [idx, setIdx]     = useState(0)
  const [loaded, setLoaded] = useState(false)

  // Reset when title changes (e.g. new book added)
  useEffect(() => { setIdx(0); setLoaded(false) }, [title])

  const handleError = () => {
    if (idx < urls.length - 1) { setIdx(i => i + 1) }
    else { setLoaded(false); setIdx(urls.length) } // show placeholder
  }

  const showPlaceholder = idx >= urls.length

  // Generate a consistent colour from the title string
  const hue = [...title].reduce((n, c) => n + c.charCodeAt(0), 0) % 360

  return (
    <div style={{ width:'80px', height:'115px', borderRadius:'6px', overflow:'hidden', flexShrink:0, boxShadow:'4px 4px 20px rgba(0,0,0,0.5)', position:'relative' }}>
      {showPlaceholder ? (
        <div style={{ width:'100%', height:'100%', background:`linear-gradient(135deg, hsl(${hue},40%,20%), hsl(${hue+40},50%,30%))`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'6px', gap:'6px' }}>
          <span style={{ fontSize:'1.4rem' }}>📖</span>
          <span style={{ fontSize:'0.55rem', color:'rgba(255,255,255,0.6)', textAlign:'center', lineHeight:1.3, wordBreak:'break-word' }}>{title}</span>
        </div>
      ) : (
        <>
          <img
            src={urls[idx]}
            alt={title}
            onLoad={() => setLoaded(true)}
            onError={handleError}
            style={{ width:'100%', height:'100%', objectFit:'cover', opacity:loaded?1:0, transition:'opacity 0.4s' }}
          />
          {!loaded && (
            <div style={{ position:'absolute', inset:0, background:`linear-gradient(135deg, hsl(${hue},40%,20%), hsl(${hue+40},50%,30%))`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem' }}>📖</div>
          )}
        </>
      )}
    </div>
  )
}

// ── Book card (clickable) ─────────────────────────────────────
function BookCard({ book, onDelete, onEdit, style }) {
  const cfg = STATUS_CONFIG[book.status] || STATUS_CONFIG['not read']
  const pct = book.total_pages>0 ? Math.round((book.pages_read/book.total_pages)*100) : 0
  return (
    <div
      style={{ background:'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'20px', padding:'20px', transition:'transform 0.3s,box-shadow 0.3s', position:'relative', overflow:'hidden', cursor:'pointer', ...style }}
      onClick={() => onEdit(book)}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow=cfg.glow; e.currentTarget.style.borderColor=cfg.color+'55' }}
      onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)' }}>
      <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'120px', height:'120px', borderRadius:'50%', background:cfg.color, opacity:0.06, filter:'blur(30px)', pointerEvents:'none' }} />
      <div style={{ display:'flex', gap:'16px', alignItems:'flex-start' }}>
        <BookCover title={book.title} author={book.author} />
        <div style={{ flex:1, minWidth:0 }}>
          <h3 style={{ margin:'0 0 2px', fontSize:'1rem', fontWeight:'700', color:'#f1f0ff', fontFamily:"'Cormorant Garamond',serif", lineHeight:1.3 }}>{book.title}</h3>
          <p style={{ margin:'0 0 10px', fontSize:'0.78rem', color:'rgba(255,255,255,0.45)', fontStyle:'italic' }}>{book.author}</p>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px', flexWrap:'wrap' }}>
            <span style={{ fontSize:'0.65rem', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 10px', borderRadius:'99px', background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}33` }}>{cfg.label}</span>
            <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.3)' }}>{book.genre}</span>
          </div>
          <Stars rating={book.rating} />
        </div>
      </div>
      <div style={{ marginTop:'16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
          <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)' }}>Progress</span>
          <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.5)' }}>{book.pages_read} / {book.total_pages} · {pct}%</span>
        </div>
        <ProgressBar pct={pct} />
      </div>
      {(book.date_started||book.date_finished) && (
        <div style={{ marginTop:'12px', display:'flex', gap:'12px', fontSize:'0.7rem', color:'rgba(255,255,255,0.25)' }}>
          {book.date_started && book.date_started!=='null' && <span>Started {book.date_started}</span>}
          {book.date_finished && book.date_finished!=='null' && <span>· Finished {book.date_finished}</span>}
        </div>
      )}
      {/* Edit hint */}
      <div style={{ position:'absolute', bottom:'12px', right:'14px', fontSize:'0.62rem', color:'rgba(255,255,255,0.18)' }}>click to edit</div>
      {/* Delete — stop propagation so clicking ✕ doesn't open edit modal */}
      <button
        onClick={e=>{ e.stopPropagation(); onDelete(book.id) }}
        style={{ position:'absolute', top:'14px', right:'14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', color:'rgba(255,255,255,0.25)', cursor:'pointer', fontSize:'0.7rem', padding:'3px 8px', transition:'all 0.2s' }}
        onMouseEnter={e=>{ e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='#f8717155' }}
        onMouseLeave={e=>{ e.currentTarget.style.color='rgba(255,255,255,0.25)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)' }}>✕</button>
    </div>
  )
}

// ── Add Book Modal ────────────────────────────────────────────
function AddBookModal({ onClose, onAdded, nextId }) {
  const [form, setForm] = useState({
    title:'', author:'', genre:'', status:'not read',
    pages_read:'0', total_pages:'', rating:'', date_started:'', date_finished:''
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const submit = async () => {
    setError('')
    if (!form.title||!form.author||!form.genre||!form.total_pages){
      setError('Please fill in Title, Author, Genre and Total Pages.'); return
    }
    setLoading(true)
    try {
      await axios.post(`${API}/create`, {
        id: nextId,
        title: form.title.trim(),
        author: form.author.trim(),
        genre: form.genre.trim(),
        status: form.status,
        pages_read: parseInt(form.pages_read)||0,
        total_pages: parseInt(form.total_pages),
        rating: form.rating ? parseInt(form.rating) : null,
        date_started: form.date_started||null,
        date_finished: form.date_finished||null,
      })
      onAdded(); onClose()
    } catch(e){ setError(e.response?.data?.detail||'Something went wrong.') }
    setLoading(false)
  }

  const inp = { width:'100%', padding:'9px 12px', borderRadius:'10px', fontSize:'0.85rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', color:'#f1f0ff', outline:'none', boxSizing:'border-box' }
  const lbl = { fontSize:'0.72rem', color:'rgba(255,255,255,0.4)', marginBottom:'4px', display:'block', letterSpacing:'0.05em', textTransform:'uppercase' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:'20px' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'linear-gradient(135deg,#1a1030,#120d25)', border:'1px solid rgba(167,139,250,0.25)', borderRadius:'24px', padding:'32px', width:'100%', maxWidth:'480px', boxShadow:'0 0 60px rgba(167,139,250,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.8rem', color:'#f1f0ff', marginBottom:'6px' }}>Add a Book ✨</h2>
        <p style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.25)', marginBottom:'20px' }}>ID will be assigned automatically</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
          {[
            ['title','Title *','text',''],
            ['author','Author *','text',''],
            ['genre','Genre *','text',''],
            ['total_pages','Total Pages *','number','1'],
            ['pages_read','Pages Read','number','0'],
            ['rating','Rating (0–5)','number','0'],
            ['date_started','Date Started (DD-MM-YYYY)','text',''],
            ['date_finished','Date Finished (DD-MM-YYYY)','text',''],
          ].map(([k,l,type,minVal])=>(
            <div key={k} style={{ gridColumn:['title','author'].includes(k)?'span 2':'span 1' }}>
              <label style={lbl}>{l}</label>
              <input
                type={type}
                min={minVal||undefined}
                value={form[k]}
                onChange={e=>set(k,e.target.value)}
                style={inp}
              />
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
        </div>
        {error && <p style={{ color:'#f87171', fontSize:'0.82rem', marginTop:'12px' }}>{error}</p>}
        <div style={{ display:'flex', gap:'10px', marginTop:'24px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:'12px', cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:'0.88rem' }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{ flex:2, padding:'11px', borderRadius:'12px', cursor:'pointer', background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', color:'white', fontSize:'0.88rem', fontWeight:'600', boxShadow:'0 0 20px rgba(124,58,237,0.4)' }}>
            {loading?'Adding...':'Add to Vault ✨'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Book Modal ───────────────────────────────────────────
function EditBookModal({ book, onClose, onSaved }) {
  const [form, setForm] = useState({
    status:        book.status       || 'not read',
    pages_read:    String(book.pages_read   ?? 0),
    total_pages:   String(book.total_pages  ?? ''),
    rating:        book.rating != null ? String(book.rating) : '',
    date_started:  book.date_started  && book.date_started!=='null'  ? book.date_started  : '',
    date_finished: book.date_finished && book.date_finished!=='null' ? book.date_finished : '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      await axios.put(`${API}/edit/${book.id}`, {
        status:        form.status,
        pages_read:    parseInt(form.pages_read)||0,
        total_pages:   parseInt(form.total_pages),
        rating:        form.rating!=='' ? parseInt(form.rating) : null,
        date_started:  form.date_started  || null,
        date_finished: form.date_finished || null,
      })
      onSaved(); onClose()
    } catch(e){ setError(e.response?.data?.detail||'Something went wrong.') }
    setLoading(false)
  }

  const inp = { width:'100%', padding:'9px 12px', borderRadius:'10px', fontSize:'0.85rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', color:'#f1f0ff', outline:'none', boxSizing:'border-box' }
  const lbl = { fontSize:'0.72rem', color:'rgba(255,255,255,0.4)', marginBottom:'4px', display:'block', letterSpacing:'0.05em', textTransform:'uppercase' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:'20px' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'linear-gradient(135deg,#1a1030,#120d25)', border:'1px solid rgba(249,168,212,0.25)', borderRadius:'24px', padding:'32px', width:'100%', maxWidth:'440px', boxShadow:'0 0 60px rgba(249,168,212,0.15)', maxHeight:'90vh', overflowY:'auto' }}>

        {/* Header with cover */}
        <div style={{ display:'flex', gap:'16px', alignItems:'flex-start', marginBottom:'24px' }}>
          <BookCover title={book.title} author={book.author} />
          <div>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', color:'#f1f0ff', lineHeight:1.2, marginBottom:'4px' }}>{book.title}</h2>
            <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.4)', fontStyle:'italic' }}>{book.author}</p>
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
          <div>
            <label style={lbl}>Pages Read</label>
            <input type="number" min="0" value={form.pages_read} onChange={e=>set('pages_read',e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Total Pages</label>
            <input type="number" min="1" value={form.total_pages} onChange={e=>set('total_pages',e.target.value)} style={inp} />
          </div>
          <div style={{ gridColumn:'span 2' }}>
            <label style={lbl}>Rating (0–5)</label>
            {/* Star picker */}
            <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
              {[0,1,2,3,4,5].map(n=>(
                <button key={n} onClick={()=>set('rating',String(n))}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:n===0?'0.72rem':'1.3rem', color: parseInt(form.rating)>=n && n>0 ? '#fbbf24' : n===0 ? (form.rating===''||form.rating==='0'?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.2)', filter: parseInt(form.rating)>=n && n>0 ? 'drop-shadow(0 0 4px #fbbf24)' : 'none', transition:'all 0.15s', padding:'2px' }}>
                  {n===0?'✕':'★'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>Date Started</label>
            <input type="text" placeholder="DD-MM-YYYY" value={form.date_started} onChange={e=>set('date_started',e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Date Finished</label>
            <input type="text" placeholder="DD-MM-YYYY" value={form.date_finished} onChange={e=>set('date_finished',e.target.value)} style={inp} />
          </div>
        </div>

        {error && <p style={{ color:'#f87171', fontSize:'0.82rem', marginTop:'12px' }}>{error}</p>}
        <div style={{ display:'flex', gap:'10px', marginTop:'24px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:'12px', cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:'0.88rem' }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{ flex:2, padding:'11px', borderRadius:'12px', cursor:'pointer', background:'linear-gradient(135deg,#be185d,#f9a8d4)', border:'none', color:'white', fontSize:'0.88rem', fontWeight:'600', boxShadow:'0 0 20px rgba(249,168,212,0.3)' }}>
            {loading?'Saving...':'Save Changes ✨'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Heatmap ───────────────────────────────────────────────────
function Heatmap() {
  const STORAGE_KEY = 'vault_heatmap'
  const today = new Date()
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  const buildGrid = () => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')
    const cols = []
    for(let i=51; i>=0; i--){
      const week = []
      for(let d=0; d<7; d++){
        const dt = new Date(today)
        dt.setDate(dt.getDate()-(i*7+d))
        const key = dt.toISOString().split('T')[0]
        week.push({ key, date:dt, value:saved[key]||0, pages:saved[key+'_pages']||0 })
      }
      cols.push(week)
    }
    return cols
  }

  const getMonthLabels = (cols) => {
    const labels = []; let lastMonth = -1
    cols.forEach((week,i)=>{ const m=week[0].date.getMonth(); if(m!==lastMonth){ labels.push({i,label:MONTHS[m]}); lastMonth=m } })
    return labels
  }

  const [cols, setCols]         = useState(buildGrid)
  const [pages, setPages]       = useState('')
  const [showInput, setShowInput] = useState(false)

  const logToday = () => {
    const key = today.toISOString().split('T')[0]
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')
    saved[key] = (saved[key]||0)+1
    if(pages) saved[key+'_pages'] = (saved[key+'_pages']||0)+parseInt(pages)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    setCols(buildGrid()); setPages(''); setShowInput(false)
  }

  const colorFor = (v) => {
    if(v===0) return 'rgba(255,255,255,0.05)'
    if(v===1) return 'rgba(167,139,250,0.35)'
    if(v===2) return 'rgba(167,139,250,0.55)'
    if(v===3) return 'rgba(167,139,250,0.75)'
    return '#a78bfa'
  }

  const monthLabels = getMonthLabels(cols)
  const flat = cols.flat()
  const totalSessions = flat.reduce((s,c)=>s+c.value,0)
  const totalPages    = flat.reduce((s,c)=>s+c.pages,0)

  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'18px', overflowX:'auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
        <h3 style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Reading Activity</h3>
        <button onClick={()=>setShowInput(s=>!s)} style={{ fontSize:'0.7rem', padding:'4px 10px', borderRadius:'8px', background:'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.3)', color:'#a78bfa', cursor:'pointer' }}>+ Log Today</button>
      </div>
      <div style={{ display:'flex', gap:'16px', marginBottom:'12px' }}>
        <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.3)' }}>{totalSessions} sessions</span>
        {totalPages>0 && <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.3)' }}>{totalPages.toLocaleString()} pages logged</span>}
      </div>
      {showInput && (
        <div style={{ display:'flex', gap:'8px', marginBottom:'12px', alignItems:'center' }}>
          <input type="number" min="0" placeholder="Pages read today (optional)" value={pages} onChange={e=>setPages(e.target.value)} onKeyDown={e=>e.key==='Enter'&&logToday()}
            style={{ flex:1, padding:'7px 10px', borderRadius:'8px', fontSize:'0.78rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#f1f0ff', outline:'none' }} />
          <button onClick={logToday} style={{ padding:'7px 12px', borderRadius:'8px', background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', color:'white', cursor:'pointer', fontSize:'0.78rem' }}>Log</button>
        </div>
      )}
      {/* Month row */}
      <div style={{ display:'grid', gridTemplateColumns:'28px repeat(52,1fr)', marginBottom:'2px', minWidth:'380px' }}>
        <div />
        {cols.map((week,i)=>{ const l=monthLabels.find(m=>m.i===i); return <div key={i} style={{ fontSize:'0.55rem', color:'rgba(255,255,255,0.3)', textAlign:'left' }}>{l?l.label:''}</div> })}
      </div>
      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'28px repeat(52,1fr)', gap:'2px', minWidth:'380px' }}>
        <div style={{ display:'grid', gridTemplateRows:'repeat(7,1fr)', gap:'2px' }}>
          {DAYS.map((d,i)=>(
            <div key={d} style={{ fontSize:'0.5rem', color:'rgba(255,255,255,0.25)', display:'flex', alignItems:'center', height:'100%' }}>{i%2===1?d:''}</div>
          ))}
        </div>
        {cols.map((week,wi)=>(
          <div key={wi} style={{ display:'grid', gridTemplateRows:'repeat(7,1fr)', gap:'2px' }}>
            {week.map((c,di)=>(
              <div key={di} title={`${c.key}${c.value>0?`: ${c.value} session${c.value>1?'s':''}`:''} ${c.pages>0?`· ${c.pages} pages`:''}`}
                style={{ aspectRatio:'1', borderRadius:'2px', background:colorFor(c.value), transition:'transform 0.15s', cursor:'default' }}
                onMouseEnter={e=>e.currentTarget.style.transform='scale(1.6)'}
                onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:'6px', alignItems:'center', marginTop:'10px', justifyContent:'flex-end' }}>
        <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.25)' }}>Less</span>
        {[0,1,2,3,4].map(v=>(<div key={v} style={{ width:'10px', height:'10px', borderRadius:'2px', background:colorFor(v) }} />))}
        <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.25)' }}>More</span>
      </div>
    </div>
  )
}

// ── Want to Read ──────────────────────────────────────────────
function WantToRead() {
  const [list, setList] = useState(()=>JSON.parse(localStorage.getItem('vault_wtr')||'[]'))
  const [input, setInput] = useState('')
  const add = () => { if(!input.trim()) return; const next=[...list,{id:Date.now(),title:input.trim()}]; setList(next); localStorage.setItem('vault_wtr',JSON.stringify(next)); setInput('') }
  const remove = (id) => { const next=list.filter(b=>b.id!==id); setList(next); localStorage.setItem('vault_wtr',JSON.stringify(next)) }
  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'18px' }}>
      <h3 style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>✦ Want to Read</h3>
      <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="Add a book title…"
          style={{ flex:1, padding:'8px 12px', borderRadius:'10px', fontSize:'0.82rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#f1f0ff', outline:'none' }} />
        <button onClick={add} style={{ padding:'8px 14px', borderRadius:'10px', background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', color:'white', cursor:'pointer', fontSize:'0.82rem' }}>+</button>
      </div>
      {list.length===0
        ? <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.2)', textAlign:'center', padding:'12px 0', fontStyle:'italic' }}>Your wish list is empty…</p>
        : <div style={{ display:'flex', flexDirection:'column', gap:'6px', maxHeight:'220px', overflowY:'auto' }}>
            {list.map(b=>(
              <div key={b.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', borderRadius:'10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.65)' }}>📖 {b.title}</span>
                <button onClick={()=>remove(b.id)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.2)', cursor:'pointer', fontSize:'0.75rem', padding:'0 4px' }}
                  onMouseEnter={e=>e.currentTarget.style.color='#f87171'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.2)'}>✕</button>
              </div>
            ))}
          </div>
      }
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [books, setBooks]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [sortBy, setSortBy]         = useState('')
  const [sortOrder, setSortOrder]   = useState('desc')
  const [filter, setFilter]         = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBook, setEditingBook]   = useState(null)
  const [particles] = useState(()=>Array.from({length:30},(_,i)=>({ id:i, x:Math.random()*100, y:Math.random()*100, size:Math.random()*2+1, duration:Math.random()*6+4, delay:Math.random()*5 })))

  const fetchBooks = async () => {
    try {
      const url = sortBy ? `${API}/sort?sort_by=${sortBy}&order=${sortOrder}` : `${API}/view_books`
      const res = await axios.get(url)
      setBooks(res.data)
    } catch(e){ console.error('Is FastAPI running?', e) }
    setLoading(false)
  }

  useEffect(()=>{ fetchBooks() }, [sortBy, sortOrder])

  const deleteBook = async (id) => {
    if(!confirm('Remove this book from your vault?')) return
    await axios.delete(`${API}/delete/${id}`)
    fetchBooks()
  }

  // Auto-generate next ID as max existing ID + 1
  const nextId = books.length > 0 ? Math.max(...books.map(b=>b.id)) + 1 : 1

  const displayed = filter==='all' ? books : books.filter(b=>b.status===filter)

  const stats = {
    total:     books.length,
    completed: books.filter(b=>b.status==='completed').length,
    reading:   books.filter(b=>b.status==='reading').length,
    pages:     books.reduce((s,b)=>s+(b.pages_read||0),0)
  }

  const STAT_CARDS = [
    { label:'Total Books', value:stats.total,                  icon:'📚', key:'all' },
    { label:'Completed',   value:stats.completed,              icon:'✅', key:'completed' },
    { label:'Reading',     value:stats.reading,                icon:'📖', key:'reading' },
    { label:'Pages Read',  value:stats.pages.toLocaleString(), icon:'✨', key:'pages' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0d0a1a;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:rgba(167,139,250,0.3);border-radius:99px;}
        @keyframes float{0%,100%{transform:translateY(0);opacity:0.4;}50%{transform:translateY(-20px);opacity:0.9;}}
        @keyframes shimmer{0%{background-position:-200% center;}100%{background-position:200% center;}}
        @keyframes fadein{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        select option{background:#1a1030;color:#f1f0ff;}
      `}</style>

      <div style={{ minHeight:'100vh', background:'#0d0a1a', fontFamily:"'DM Sans',sans-serif", position:'relative' }}>
        <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
          <div style={{ position:'absolute', top:'-10%', left:'-5%', width:'500px', height:'500px', borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,0.15),transparent 70%)', filter:'blur(40px)' }} />
          <div style={{ position:'absolute', bottom:'-10%', right:'-5%', width:'600px', height:'600px', borderRadius:'50%', background:'radial-gradient(circle,rgba(219,112,147,0.1),transparent 70%)', filter:'blur(40px)' }} />
          {particles.map(p=>(
            <div key={p.id} style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, width:`${p.size}px`, height:`${p.size}px`, borderRadius:'50%', background:'rgba(167,139,250,0.6)', animation:`float ${p.duration}s ${p.delay}s ease-in-out infinite` }} />
          ))}
        </div>

        <div style={{ position:'relative', zIndex:1, maxWidth:'1400px', margin:'0 auto', padding:'48px 24px' }}>

          <header style={{ textAlign:'center', marginBottom:'48px', animation:'fadein 0.8s ease' }}>
            <p style={{ fontSize:'0.8rem', letterSpacing:'0.25em', textTransform:'uppercase', color:'rgba(167,139,250,0.6)', marginBottom:'12px' }}>✦ Your Literary Sanctuary ✦</p>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(3rem,6vw,4.5rem)', fontWeight:'700', lineHeight:1.1, marginBottom:'16px', background:'linear-gradient(135deg,#e0d7ff 0%,#a78bfa 40%,#f9a8d4 80%,#fbbf24 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', animation:'shimmer 6s linear infinite' }}>My Reading Vault</h1>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:'400', fontStyle:'italic', color:'rgba(255,255,255,0.35)' }}>Where every page tells a story…</p>
          </header>

          {/* Stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'40px', animation:'fadein 0.8s 0.1s ease both' }}>
            {STAT_CARDS.map(s=>{
              const isFilterable = s.key==='completed'||s.key==='reading'||s.key==='all'
              const active = filter===s.key
              return (
                <div key={s.label}
                  onClick={()=>{ if(isFilterable) setFilter(active?'all':s.key) }}
                  style={{ background:active?'rgba(167,139,250,0.12)':'rgba(255,255,255,0.03)', border:active?'1px solid rgba(167,139,250,0.4)':'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'18px 16px', textAlign:'center', cursor:isFilterable?'pointer':'default', transition:'all 0.2s', boxShadow:active?'0 0 20px rgba(167,139,250,0.2)':'none' }}
                  onMouseEnter={e=>{ if(isFilterable) e.currentTarget.style.borderColor='rgba(167,139,250,0.35)' }}
                  onMouseLeave={e=>{ if(!active) e.currentTarget.style.borderColor='rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize:'1.4rem', marginBottom:'6px' }}>{s.icon}</div>
                  <div style={{ fontSize:'1.6rem', fontWeight:'700', color:active?'#a78bfa':'#e0d7ff', fontFamily:"'Cormorant Garamond',serif" }}>{s.value}</div>
                  <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:'2px' }}>{s.label}</div>
                  {isFilterable && <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.18)', marginTop:'4px' }}>{active?'click to clear':'click to filter'}</div>}
                </div>
              )
            })}
          </div>

          {/* Two-column layout */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:'24px', alignItems:'start' }}>

            {/* LEFT */}
            <div>
              <div style={{ display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap', alignItems:'center', animation:'fadein 0.8s 0.2s ease both' }}>
                <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:'9px 14px', borderRadius:'12px', fontSize:'0.82rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:sortBy?'#e0d7ff':'rgba(255,255,255,0.35)', cursor:'pointer', outline:'none' }}>
                  <option value="">Sort by…</option>
                  <option value="rating">Rating</option>
                  <option value="total_pages">Total Pages</option>
                  <option value="author">Author</option>
                  <option value="genre">Genre</option>
                </select>
                <select value={sortOrder} onChange={e=>setSortOrder(e.target.value)} style={{ padding:'9px 14px', borderRadius:'12px', fontSize:'0.82rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#e0d7ff', cursor:'pointer', outline:'none' }}>
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
                {filter!=='all' && (
                  <span style={{ fontSize:'0.78rem', padding:'5px 12px', borderRadius:'99px', background:'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.3)', color:'#a78bfa' }}>
                    Showing: {filter} · <span style={{ cursor:'pointer', textDecoration:'underline' }} onClick={()=>setFilter('all')}>clear</span>
                  </span>
                )}
                <div style={{ flex:1 }} />
                <button onClick={()=>setShowAddModal(true)} style={{ padding:'9px 22px', borderRadius:'12px', cursor:'pointer', background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', color:'white', fontSize:'0.85rem', fontWeight:'600', boxShadow:'0 0 24px rgba(124,58,237,0.35)' }}>+ Add Book</button>
              </div>

              {loading
                ? <div style={{ textAlign:'center', color:'rgba(255,255,255,0.3)', padding:'80px', fontSize:'1.1rem' }}>✨ Opening the vault…</div>
                : displayed.length===0
                  ? <div style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', padding:'80px' }}><div style={{ fontSize:'3rem', marginBottom:'12px' }}>📭</div><p>No books found.</p></div>
                  : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'16px' }}>
                      {displayed.map((book,i)=>(
                        <BookCard key={book.id} book={book} onDelete={deleteBook} onEdit={setEditingBook} style={{ animation:`fadein 0.5s ${i*0.07}s ease both` }} />
                      ))}
                    </div>
              }
            </div>

            {/* RIGHT sidebar */}
            <div style={{ display:'flex', flexDirection:'column', gap:'16px', position:'sticky', top:'24px', animation:'fadein 0.8s 0.3s ease both' }}>
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'18px' }}>
                <h3 style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>✦ Genres</h3>
                {books.length===0
                  ? <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.2)', fontStyle:'italic' }}>No books yet</p>
                  : Object.entries(books.reduce((acc,b)=>{ acc[b.genre]=(acc[b.genre]||0)+1; return acc },{}))
                      .sort((a,b)=>b[1]-a[1])
                      .map(([genre,count])=>(
                        <div key={genre} style={{ marginBottom:'10px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                            <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.55)' }}>{genre}</span>
                            <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.3)' }}>{count}</span>
                          </div>
                          <div style={{ height:'3px', background:'rgba(255,255,255,0.06)', borderRadius:'99px', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${(count/books.length)*100}%`, background:'linear-gradient(90deg,#7c3aed,#f9a8d4)', borderRadius:'99px' }} />
                          </div>
                        </div>
                      ))
                }
              </div>
              <WantToRead />
              <Heatmap />
            </div>
          </div>
        </div>
      </div>

      {showAddModal && <AddBookModal onClose={()=>setShowAddModal(false)} onAdded={fetchBooks} nextId={nextId} />}
      {editingBook  && <EditBookModal book={editingBook} onClose={()=>setEditingBook(null)} onSaved={fetchBooks} />}
    </>
  )
}


