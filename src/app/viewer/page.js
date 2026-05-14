'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'

export default function Viewer({ params, searchParams }) {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const path = searchParams?.path
    if (!path) { setError('Fichier non trouvé'); setLoading(false); return }

    const load = async () => {
      const { data, error } = await supabase.storage
        .from('analyses')
        .download(path)

      if (error || !data) {
        setError('Impossible de charger le fichier. Vérifie que tu es connecté.')
        setLoading(false)
        return
      }

      const text = await data.text()
      // Extraire le contenu du body
      const bodyMatch = text.match(/<body[^>]*>([\s\S]*)<\/body>/i)
      const bodyContent = bodyMatch ? bodyMatch[1] : text

      // Extraire les styles
      const styleMatch = text.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)
      const styles = styleMatch ? styleMatch.join('\n') : ''

      setHtml(styles + bodyContent)
      setLoading(false)
    }

    load()
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'DM Sans,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:32, height:32, border:'3px solid #E6F1FB', borderTopColor:'#185FA5', borderRadius:'50%', animation:'spin .8s linear infinite', margin:'0 auto 12px' }} />
        <div style={{ fontSize:13, color:'#888' }}>Chargement...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'DM Sans,sans-serif', padding:24, textAlign:'center' }}>
      <div>
        <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:14, color:'#991B1B' }}>{error}</div>
        <a href="/bibliotheque" style={{ display:'inline-block', marginTop:16, fontSize:13, color:'#185FA5' }}>← Retour à la bibliothèque</a>
      </div>
    </div>
  )

  return (
    <>
      {/* Barre d'actions */}
      <div style={{ position:'fixed', top:0, left:0, right:0, background:'#185FA5', padding:'10px 16px', display:'flex', gap:10, alignItems:'center', zIndex:1000, fontFamily:'DM Sans,sans-serif' }}>
        <a href="/bibliotheque" style={{ color:'rgba(255,255,255,.8)', fontSize:12, textDecoration:'none', marginRight:'auto', display:'flex', alignItems:'center', gap:4 }}>
          ← Ma bibliothèque
        </a>
        <button onClick={() => window.print()}
          style={{ padding:'7px 14px', background:'#fff', color:'#185FA5', border:'none', borderRadius:6, fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
          🖨 Imprimer
        </button>
      </div>

      {/* Contenu */}
      <div style={{ marginTop:50 }} dangerouslySetInnerHTML={{ __html: html }} />

      <style>{`
        @media print {
          div[style*="position:fixed"] { display:none !important; }
          body { margin:0; }
        }
      `}</style>
    </>
  )
}
