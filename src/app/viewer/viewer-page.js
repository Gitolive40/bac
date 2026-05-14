'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'

export default function Viewer() {
  const [pdfUrl, setPdfUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const path = urlParams.get('path')
    const autoPrint = urlParams.get('print') === '1'
    if (!path) { setError('Fichier non trouvé'); setLoading(false); return }

    const load = async () => {
      const { data, error } = await supabase.storage
        .from('analyses')
        .createSignedUrl(path, 3600)

      if (error || !data?.signedUrl) {
        setError('Impossible de charger le fichier.')
        setLoading(false)
        return
      }

      // Vérifier si c'est un PDF ou HTML
      if (path.endsWith('.pdf')) {
        setPdfUrl(data.signedUrl)
        setLoading(false)
        if (autoPrint) setTimeout(() => window.print(), 1000)
      } else {
        // Ancien format HTML — fetch et afficher
        const res = await fetch(data.signedUrl)
        const text = await res.text()
        const blob = new Blob([text], { type: 'text/html' })
        const blobUrl = URL.createObjectURL(blob)
        setPdfUrl(blobUrl)
        setLoading(false)
        if (autoPrint) setTimeout(() => window.print(), 800)
      }
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
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', fontFamily:'DM Sans,sans-serif' }}>
      {/* Barre d'actions */}
      <div style={{ background:'#185FA5', padding:'10px 16px', display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
        <a href="/bibliotheque" style={{ color:'rgba(255,255,255,.8)', fontSize:12, textDecoration:'none', marginRight:'auto' }}>
          ← Ma bibliothèque
        </a>
        <button onClick={() => window.print()}
          style={{ padding:'7px 14px', background:'#fff', color:'#185FA5', border:'none', borderRadius:6, fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
          🖨 Imprimer / Enregistrer PDF
        </button>
      </div>

      {/* Affichage PDF natif */}
      <iframe
        src={pdfUrl}
        style={{ flex:1, border:'none', width:'100%' }}
        title="Analyse linéaire"
      />
    </div>
  )
}
