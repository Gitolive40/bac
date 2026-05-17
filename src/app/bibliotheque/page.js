'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

export default function Bibliotheque() {
  const [user, setUser] = useState(null)
  const [dossiers, setDossiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [themeOuvert, setThemeOuvert] = useState(null)
  const [dossierOuvert, setDossierOuvert] = useState(null)
  const [fichiers, setFichiers] = useState([])
  const supabase = createClient()

  useEffect(() => {
    // Gérer le code OAuth dans l'URL
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
        if (data.session) {
          setUser(data.session.user)
          chargerDossiers(data.session.user.id)
          window.history.replaceState({}, '', '/bibliotheque')
        }
      })
    }

    // Récupérer la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        chargerDossiers(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        chargerDossiers(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const chargerDossiers = async (userId) => {
    setLoading(true)
    // Lister les dossiers d'oeuvres directement sous userId/
    const { data, error } = await supabase.storage
      .from('analyses')
      .list(userId, { limit: 100, sortBy: { column: 'name', order: 'asc' } })

    if (!error && data) {
      // Filtrer uniquement les dossiers (pas de metadata = dossier)
      const dossiersList = data.filter(d => !d.metadata && !d.id)
      if (dossiersList.length > 0) {
        setDossiers(dossiersList)
      } else {
        // Essayer de lister les fichiers directement
        setDossiers(data.filter(d => !d.metadata))
      }
    }
    setLoading(false)
  }

  const ouvrirTheme = async (nomTheme) => {
    setThemeOuvert(nomTheme)
    setDossierOuvert(null)
    setFichiers([])
    const { data } = await supabase.storage
      .from('analyses')
      .list(`${user.id}/${nomTheme}`, { limit: 100 })
    setDossiers(data ? data.filter(d => !d.metadata) : [])
  }

  const ouvrirDossier = async (nomDossier) => {
    setDossierOuvert(nomDossier)
    const { data } = await supabase.storage
      .from('analyses')
      .list(`${user.id}/${themeOuvert}/${nomDossier}`, { limit: 100 })
    setFichiers(data ? data.filter(d => d.metadata) : [])
  }

  const telecharger = (nomFichier) => {
    const path = encodeURIComponent(`${user.id}/${themeOuvert}/${dossierOuvert}/${nomFichier}`)
    window.open(`/viewer?path=${path}`, '_blank')
  }

  const telechargerFichier = (nomFichier) => {
    const path = encodeURIComponent(`${user.id}/${themeOuvert}/${dossierOuvert}/${nomFichier}`)
    window.open(`/viewer?path=${path}&print=1`, '_blank')
  }

  const supprimer = async (nomFichier) => {
    if (!confirm(`Supprimer "${nomFichier}" ?`)) return
    await supabase.storage
      .from('analyses')
      .remove([`${user.id}/${themeOuvert}/${dossierOuvert}/${nomFichier}`])
    setFichiers(f => f.filter(f => f.name !== nomFichier))
  }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [authError, setAuthError] = useState('')

  const seConnecter = async () => {
    if (!email || !password) return
    setAuthError('')
    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setAuthError(error.message); return }
      // Connexion automatique après inscription
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) setAuthError(loginError.message)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthError(error.message)
    }
  }

  const seDeconnecter = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setDossiers([])
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <span className="spinner" />
    </div>
  )

  if (!user) return (
    <div style={{ minHeight: '100vh', background: 'var(--g50)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 380, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, background: 'var(--b600)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <i className="ti ti-folder-open" style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <h2 style={{ fontFamily: "'Spectral',Georgia,serif", fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Ma bibliothèque</h2>
          <p style={{ fontSize: 13, color: 'var(--g400)', lineHeight: 1.5 }}>Retrouve toutes tes analyses sauvegardées,<br/>organisées par œuvre.</p>
        </div>

        <>
          <input type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && seConnecter()}
            style={{ width:'100%', padding:'11px 14px', border:'0.5px solid var(--g200)', borderRadius:8, fontSize:14, marginBottom:10, fontFamily:'inherit', outline:'none' }}
            autoFocus
          />
          <input type="password" placeholder="Mot de passe (6 caractères min)" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && seConnecter()}
            style={{ width:'100%', padding:'11px 14px', border:'0.5px solid var(--g200)', borderRadius:8, fontSize:14, marginBottom:10, fontFamily:'inherit', outline:'none' }}
          />
          {authError && (
            <div style={{ padding:'8px 12px', background:'#FEF2F2', border:'0.5px solid #FCA5A5', borderRadius:6, fontSize:12, color:'#991B1B', marginBottom:10 }}>
              {authError === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : authError}
            </div>
          )}
          <button className="btn btn-p" style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:14 }}
            onClick={seConnecter} disabled={!email || !password}>
            <i className={`ti ti-${isSignup ? 'user-plus' : 'login'}`} />
            {isSignup ? 'Créer mon compte' : 'Se connecter'}
          </button>
          <button onClick={() => { setIsSignup(!isSignup); setAuthError('') }}
            style={{ width:'100%', marginTop:8, padding:'8px', background:'none', border:'none', cursor:'pointer', fontSize:12, color:'var(--g400)' }}>
            {isSignup ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? S’inscrire'}
          </button>
          <div style={{ borderTop:'0.5px solid var(--g100)', marginTop:14, paddingTop:14, textAlign:'center' }}>
            <a href="/" style={{ fontSize:12, color:'var(--g400)', textDecoration:'none' }}>
              <i className="ti ti-arrow-left" style={{ fontSize:11 }} /> Retour à l'application
            </a>
          </div>
        </>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Ma bibliothèque</h1>
          <div style={{ fontSize: 12, color: 'var(--g400)' }}>{user.email}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/" className="btn"><i className="ti ti-plus" /> Nouvelle analyse</a>
          <button className="btn" onClick={seDeconnecter}><i className="ti ti-logout" /> Déconnexion</button>
        </div>
      </div>

      {dossierOuvert ? (
        <>
          {/* Fil d'Ariane : Bibliothèque > Thème > Œuvre */}
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14, fontSize:12, color:'var(--g400)', flexWrap:'wrap' }}>
            <button onClick={() => { setThemeOuvert(null); setDossierOuvert(null); setFichiers([]); chargerDossiers(user.id) }}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--b600)', fontSize:12, padding:0, display:'flex', alignItems:'center', gap:3 }}>
              <i className="ti ti-home" style={{ fontSize:12 }} /> Bibliothèque
            </button>
            {themeOuvert && <>
              <i className="ti ti-chevron-right" style={{ fontSize:11 }} />
              <button onClick={() => { setDossierOuvert(null); setFichiers([]); ouvrirTheme(themeOuvert) }}
                style={{ background:'none', border:'none', cursor:'pointer', color:'var(--b600)', fontSize:12, padding:0 }}>
                {themeOuvert.replace(/_/g, ' ')}
              </button>
            </>}
            <i className="ti ti-chevron-right" style={{ fontSize:11 }} />
            <span style={{ color:'var(--g800)', fontWeight:500 }}>{dossierOuvert.replace(/_/g, ' ')}</span>
          </div>
          <button className="btn" style={{ marginBottom:16 }}
            onClick={() => themeOuvert ? ouvrirTheme(themeOuvert) : (setDossierOuvert(null), setFichiers([]))}>
            <i className="ti ti-arrow-left" /> {themeOuvert ? themeOuvert.replace(/_/g, ' ') : 'Retour'}
          </button>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: 16, fontWeight: 500, marginBottom: 16 }}>
            <i className="ti ti-folder-open" style={{ color: 'var(--b600)', marginRight: 8 }} />
            {dossierOuvert.replace(/_/g, ' ')}
          </h2>
          {fichiers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--g400)', fontSize: 13 }}>Dossier vide</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fichiers.map(f => (
                <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', border: '0.5px solid var(--g200)', borderRadius: 8 }}>
                  <i className="ti ti-file-type-pdf" style={{ fontSize: 20, color: '#e44', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--g800)' }}>{f.name.replace('.pdf', '').replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: 11, color: 'var(--g400)' }}>{new Date(f.created_at).toLocaleDateString('fr-FR')}</span>
                  <button className="btn" onClick={() => telecharger(f.name)} title="Ouvrir"><i className="ti ti-eye" /></button>
                  <button className="btn" onClick={() => telechargerFichier(f.name)} title="Télécharger"><i className="ti ti-download" /></button>
                  <button className="btn" style={{ color: '#e44', borderColor: '#fca5a5' }} onClick={() => supprimer(f.name)} title="Supprimer"><i className="ti ti-trash" /></button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {dossiers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff', border: '0.5px solid var(--g200)', borderRadius: 12 }}>
              <i className="ti ti-folder-off" style={{ fontSize: 40, color: 'var(--g200)', display: 'block', marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: 'var(--g400)', marginBottom: 8 }}>Aucune analyse sauvegardée</div>
              <div style={{ fontSize: 12, color: 'var(--g400)' }}>Génère une analyse et clique sur "Exporter PDF" pour la sauvegarder ici.</div>
            </div>
          ) : (
            <>
            {themeOuvert && (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14, fontSize:12, color:'var(--g400)' }}>
                  <button onClick={() => { setThemeOuvert(null); setDossierOuvert(null); setFichiers([]); chargerDossiers(user.id) }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--b600)', fontSize:12, padding:0, display:'flex', alignItems:'center', gap:3 }}>
                    <i className="ti ti-home" style={{ fontSize:12 }} /> Bibliothèque
                  </button>
                  <i className="ti ti-chevron-right" style={{ fontSize:11 }} />
                  <span style={{ color:'var(--g800)', fontWeight:500 }}>{themeOuvert.replace(/_/g, ' ')}</span>
                </div>
                <button className="btn" style={{ marginBottom:16 }}
                  onClick={() => { setThemeOuvert(null); setDossierOuvert(null); setFichiers([]); chargerDossiers(user.id) }}>
                  <i className="ti ti-arrow-left" /> Bibliothèque
                </button>
              </>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {dossiers.map(d => (
                <div key={d.name} onClick={() => { if (!themeOuvert) ouvrirTheme(d.name); else ouvrirDossier(d.name) }}
                  style={{ padding: '20px 16px', background: '#fff', border: '0.5px solid var(--g200)', borderRadius: 10, cursor: 'pointer', transition: 'border-color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--b400)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--g200)'}
                >
                  <i className={`ti ti-${!themeOuvert ? 'books' : 'folder'}`} style={{ fontSize: 32, color: 'var(--b600)', display: 'block', marginBottom: 8 }} />
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--g800)' }}>{d.name.replace(/_/g, ' ')}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
