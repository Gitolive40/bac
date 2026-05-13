'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

export default function Bibliotheque() {
  const [user, setUser] = useState(null)
  const [dossiers, setDossiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [dossierOuvert, setDossierOuvert] = useState(null)
  const [fichiers, setFichiers] = useState([])
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) chargerDossiers(data.user.id)
      else setLoading(false)
    })
  }, [])

  const chargerDossiers = async (userId) => {
    setLoading(true)
    const { data, error } = await supabase.storage
      .from('analyses')
      .list(userId, { limit: 100 })

    if (!error && data) {
      setDossiers(data.filter(d => !d.metadata))
    }
    setLoading(false)
  }

  const ouvrirDossier = async (nomDossier) => {
    setDossierOuvert(nomDossier)
    const { data } = await supabase.storage
      .from('analyses')
      .list(`${user.id}/${nomDossier}`, { limit: 100 })
    setFichiers(data || [])
  }

  const telecharger = async (nomFichier) => {
    const { data } = await supabase.storage
      .from('analyses')
      .createSignedUrl(`${user.id}/${dossierOuvert}/${nomFichier}`, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const supprimer = async (nomFichier) => {
    if (!confirm(`Supprimer "${nomFichier}" ?`)) return
    await supabase.storage
      .from('analyses')
      .remove([`${user.id}/${dossierOuvert}/${nomFichier}`])
    setFichiers(f => f.filter(f => f.name !== nomFichier))
  }

  const [email, setEmail] = useState('')
  const [magicSent, setMagicSent] = useState(false)

  const seConnecter = async () => {
    if (!email) return
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    if (!error) setMagicSent(true)
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
    <div style={{ maxWidth: 400, margin: '100px auto', padding: '0 24px', textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, background: 'var(--b600)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <i className="ti ti-folder" style={{ fontSize: 24, color: '#fff' }} />
      </div>
      <h2 style={{ fontFamily: "'Spectral',Georgia,serif", fontSize: 22, fontWeight: 500, marginBottom: 8 }}>Ma bibliothèque</h2>
      <p style={{ fontSize: 13, color: 'var(--g400)', marginBottom: 24 }}>Connecte-toi pour accéder à tes analyses sauvegardées.</p>
      {magicSent ? (
        <div style={{ background: 'var(--b50)', border: '0.5px solid var(--b100)', borderRadius: 8, padding: '16px', fontSize: 13, color: 'var(--b800)' }}>
          <i className="ti ti-mail" style={{ fontSize: 20, display: 'block', marginBottom: 8 }} />
          Lien envoyé à <strong>{email}</strong><br/>
          Vérifie ta boîte mail et clique sur le lien.
        </div>
      ) : (
        <>
          <input
            type="email"
            placeholder="ton@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && seConnecter()}
            style={{ width: '100%', padding: '10px 12px', border: '0.5px solid var(--g200)', borderRadius: 6, fontSize: 13, marginBottom: 10, fontFamily: 'inherit', outline: 'none' }}
          />
          <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center', padding: '11px' }} onClick={seConnecter} disabled={!email}>
            <i className="ti ti-send" /> Recevoir un lien de connexion
          </button>
          <p style={{ fontSize: 11, color: 'var(--g400)', marginTop: 10 }}>Tu recevras un lien par email — pas de mot de passe.</p>
        </>
      )}
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
          <button className="btn" style={{ marginBottom: 20 }} onClick={() => { setDossierOuvert(null); setFichiers([]) }}>
            <i className="ti ti-arrow-left" /> Retour
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
                  <button className="btn" onClick={() => telecharger(f.name)}><i className="ti ti-download" /></button>
                  <button className="btn" style={{ color: '#e44', borderColor: '#fca5a5' }} onClick={() => supprimer(f.name)}><i className="ti ti-trash" /></button>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {dossiers.map(d => (
                <div key={d.name} onClick={() => ouvrirDossier(d.name)}
                  style={{ padding: '20px 16px', background: '#fff', border: '0.5px solid var(--g200)', borderRadius: 10, cursor: 'pointer', transition: 'border-color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--b400)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--g200)'}
                >
                  <i className="ti ti-folder" style={{ fontSize: 32, color: 'var(--b600)', display: 'block', marginBottom: 8 }} />
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
