'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MAX_BYTES = 4 * 1024 * 1024

async function compressImage(file) {
  const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (isPDF) {
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result.split(',')[1])
      r.onerror = rej
      r.readAsDataURL(file)
    })
  }
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const MAX_DIM = 1800
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      let quality = 0.82
      const tryCompress = () => {
        const b64 = canvas.toDataURL('image/jpeg', quality).split(',')[1]
        if (Math.ceil(b64.length * 0.75) <= MAX_BYTES || quality <= 0.3) { res(b64) }
        else { quality -= 0.1; tryCompress() }
      }
      tryCompress()
    }
    img.onerror = rej
    img.src = url
  })
}

function mtype(file) {
  return (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
    ? 'application/pdf' : 'image/jpeg'
}

// ─── Composants UI ───────────────────────────────────────────────────────────

function Stepper({ step }) {
  const steps = ['Import', 'Génération', 'Résultat', 'Export']
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {i > 0 && <span style={{ color: 'var(--g200)', margin: '0 2px' }}>›</span>}
          <span className={`sd${i < step ? ' done' : i === step ? ' active' : ''}`} />
          <span>{s}</span>
        </span>
      ))}
    </div>
  )
}

function UploadZone({ num, label, sublabel, icon, files, onFiles, multi = false }) {
  const ref = useRef()
  const [drag, setDrag] = useState(false)

  const addFiles = useCallback((newFiles) => {
    const arr = Array.from(newFiles)
    if (!arr.length) return
    if (multi) {
      onFiles(prev => {
        const current = Array.isArray(prev) ? prev : []
        return [...current, ...arr].slice(0, 2)
      })
    } else {
      onFiles([arr[0]])
    }
  }, [onFiles, multi])

  const removeFile = (i) => onFiles(prev => (prev || []).filter((_, idx) => idx !== i))
  const hasFiles = files && files.length > 0
  const isFull = multi ? (files && files.length >= 2) : hasFiles

  return (
    <div className={`ucard${hasFiles ? ' has' : ''}`}>
      <div className="uchead">
        <div className="unum-badge">{hasFiles ? <i className="ti ti-check" style={{fontSize:14}} /> : num}</div>
        <div>
          <div className="ulabel">{label}</div>
          <div className="usub">{sublabel}</div>
        </div>
      </div>
      {hasFiles && (
        <div style={{ marginBottom: 8 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--b50)', borderRadius: 6, marginBottom: 4 }}>
              <i className="ti ti-photo" style={{ fontSize: 12, color: 'var(--b600)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--b800)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--g400)', padding: 2, display: 'flex', alignItems: 'center' }}>
                <i className="ti ti-x" style={{ fontSize: 11 }} />
              </button>
            </div>
          ))}
        </div>
      )}
      {!isFull && (
        <div
          className={`dzone${drag ? ' drag' : ''}`}
          onClick={() => ref.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
        >
          <div className="upload-icon-wrap">
            <i className={`ti ti-${icon}`} />
          </div>
          <div className="dtxt">
            {multi && hasFiles ? 'Ajouter une 2e photo' : 'Appuie pour choisir'}<br />
            <span style={{fontSize:11, color:'var(--g400)'}}>ou glisse un fichier</span>
          </div>
          <span className="dcta" style={{marginTop:4}}>{multi && hasFiles ? '+ Ajouter' : 'Choisir un fichier'}</span>
          <div className="dfmt">JPG · PNG · WEBP{multi ? ' · 2 max' : ''}</div>
        </div>
      )}
      <input ref={ref} type="file" hidden accept=".jpg,.jpeg,.png,.webp,.pdf,image/*"
        multiple={multi}
        onChange={e => { if (e.target.files.length) addFiles(e.target.files); e.target.value = '' }} />
    </div>
  )
}

// ─── Écrans ───────────────────────────────────────────────────────────────────

function HomeScreen({ onGenerate }) {
  const [texteFiles, setTexteFiles] = useState([])
  const [notesFiles, setNotesFiles] = useState([])
  const ready = texteFiles.length > 0 && notesFiles.length > 0

  return (
    <div className="home fu">
      {/* Hero */}
      <div className="hero">
        <div className="hero-badge">
          <i className="ti ti-school" />
          Bac de français
        </div>
        <h1 className="h1">Génère ton analyse<br />linéaire en quelques<br />secondes</h1>
        <p className="hsub" style={{ marginTop: 10 }}>
          Importe ton texte et tes notes —<br />l'IA génère la fiche complète.
        </p>
      </div>

      {/* Étapes visuelles */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24, fontSize: 11, color: 'var(--g400)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--b600)', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
          <span>Importe</span>
        </div>
        <i className="ti ti-arrow-right" style={{ fontSize: 12, color: 'var(--g200)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--g100)', color: 'var(--g600)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
          <span>L'IA analyse</span>
        </div>
        <i className="ti ti-arrow-right" style={{ fontSize: 12, color: 'var(--g200)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--g100)', color: 'var(--g600)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</div>
          <span>Ta fiche</span>
        </div>
      </div>

      {/* Upload cards */}
      <div className="ugrid">
        <UploadZone num="1" icon="file-text" label="Texte littéraire"
          sublabel="Photo du poème ou de l'extrait" files={texteFiles} onFiles={setTexteFiles} multi={false} />
        <UploadZone num="2" icon="notebook" label="Notes d'analyse"
          sublabel="1 ou 2 photos de tes notes" files={notesFiles} onFiles={setNotesFiles} multi={true} />
      </div>

      {/* Bouton générer */}
      <div className="btn-generate-wrap">
        <button className="btn btn-p btn-generate"
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, marginBottom: 4, borderRadius: 8, gap: 10 }}
          disabled={!ready} onClick={() => onGenerate(texteFiles[0], notesFiles)}>
          <i className="ti ti-sparkles" style={{ fontSize: 18 }} />
          {ready ? 'Générer mon analyse' : 'Importe tes 2 documents'}
        </button>
      </div>

      {/* Aide */}
      {!ready && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--g400)', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: texteFiles.length ? '#22c55e' : 'var(--g200)', display: 'inline-block' }} />
          Texte littéraire
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: notesFiles.length ? '#22c55e' : 'var(--g200)', display: 'inline-block', marginLeft: 8 }} />
          Notes d'analyse
        </div>
      )}

      <Stepper step={0} />
    </div>
  )
}

function GenScreen({ progress, stepIdx }) {
  const steps = [
    { label: 'Lecture des documents', desc: 'Vision IA sur les deux images', icon: 'eye' },
    { label: 'Recherche web', desc: 'Auteur, mouvement, parcours bac…', icon: 'world' },
    { label: "Génération de l'analyse", desc: 'Remplissage des blocs du template…', icon: 'sparkles' },
    { label: 'Mise en page', desc: 'Application du template final', icon: 'layout-columns' },
  ]
  return (
    <div className="gen fu">
      <div className="gt">Analyse en cours…</div>
      <p className="gs">Patiente quelques secondes.</p>
      <div className="pt"><div className="pf" style={{ width: `${progress}%` }} /></div>
      <div className="slist">
        {steps.map((s, i) => {
          const st = i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending'
          return (
            <div key={i} className={`si ${st}`}>
              <div className={`sic ${st}`}>
                {st === 'done' ? <i className="ti ti-check" /> : st === 'active' ? <span className="spinner" /> : <i className={`ti ti-${s.icon}`} />}
              </div>
              <div><div className="sla">{s.label}</div><div className="sde">{s.desc}</div></div>
              {st !== 'pending' && <span className={`sba ${st}`}>{st === 'done' ? 'Fait' : 'En cours'}</span>}
            </div>
          )
        })}
      </div>
      <Stepper step={1} />
    </div>
  )
}

function ResultScreen({ data, onRestart }) {
  const [tab, setTab] = useState('fiche')
  const [fiche, setFiche] = useState(data.fiche)
  const [analyse, setAnalyse] = useState(data.analyse)

  const upF = (k, v) => setFiche(f => ({ ...f, [k]: v }))
  const upM = (i, k, v) => setFiche(f => {
    const m = [...f.mouvements]; m[i] = { ...m[i], [k]: v }; return { ...f, mouvements: m }
  })
  const upV = (mi, vi, k, v) => setAnalyse(a => a.map((m, i) =>
    i !== mi ? m : { ...m, vers: m.vers.map((vv, j) => j === vi ? { ...vv, [k]: v } : vv) }
  ))
  const upT = (mi, v) => setAnalyse(a => a.map((m, i) => i === mi ? { ...m, transition: v } : m))

  const exportPDF = async () => {
    const mvts = (fiche.mouvements || []).map(m =>
      `<div style="margin-bottom:6px">
        <div style="font-size:11px;font-weight:bold">Mvt ${m.numero} · L. ${m.lignes}</div>
        <div style="font-size:11px;font-weight:600">${m.titre || ''}</div>
        <div style="font-size:10px">${m.resume || ''}</div>
      </div>`
    ).join('')

    const analyseSections = (analyse || []).map(mouv => {
      const versRows = (mouv.vers || []).map(v =>
        `<tr>
          <td style="padding:6px 8px;border:0.5px solid #ccc;vertical-align:top;width:35%">
            <div style="font-size:10px;font-weight:600;color:#185FA5;margin-bottom:3px">${v.ref}</div>
            <div style="font-size:11px;font-style:italic;color:#555;border-left:2px solid #B5D4F4;padding-left:6px">${v.texte}</div>
          </td>
          <td style="padding:6px 8px;border:0.5px solid #ccc;vertical-align:top">
            <div style="margin-bottom:4px">${(v.procedes||[]).map(p => `<span style="font-size:9px;background:#E6F1FB;color:#0C447C;border-radius:3px;padding:1px 5px;margin-right:3px">${p}</span>`).join('')}</div>
            <div style="font-size:11px;line-height:1.6">${v.analyse}</div>
          </td>
        </tr>`
      ).join('')
      return `
        <div style="margin-bottom:16px;page-break-inside:avoid">
          <div style="background:#185FA5;padding:8px 14px;display:flex;align-items:center;gap:10px;border-radius:4px 4px 0 0">
            <span style="font-size:10px;font-weight:600;background:rgba(255,255,255,.2);color:#fff;padding:2px 7px;border-radius:3px">Mouvement ${mouv.numero}</span>
            <span style="font-size:12px;font-style:italic;color:#fff;font-family:Georgia,serif">${mouv.titre}</span>
            <span style="font-size:10px;color:rgba(255,255,255,.7);margin-left:auto">V. ${mouv.lignes}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;border:0.5px solid #ccc">${versRows}</table>
          ${mouv.transition ? `<div style="background:#E6F1FB;padding:7px 14px;font-size:11px;font-style:italic;color:#0C447C;border:0.5px solid #B5D4F4;border-top:none">→ ${mouv.transition}</div>` : ''}
        </div>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Analyse linéaire — ${fiche.titre}</title>
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'DM Sans',sans-serif; font-size:12px; color:#111; background:#fff; padding:20px; }
  .page { max-width:750px; margin:0 auto; }

  /* PAGE 1 — FICHE */
  .template-grid {
    display:grid;
    grid-template-columns:200px 1fr;
    grid-template-rows:auto auto;
    gap:0;
    border:1.5px solid #111;
  }
  .cell { border:1px solid #111; padding:10px 12px; }
  .carte { grid-row: 1; grid-column: 1; }
  .intro-section { grid-row: 1; grid-column: 2; display:flex; flex-direction:column; }
  .mouv-cell { grid-row: 2; grid-column: 1; }
  .concl-section { grid-row: 2; grid-column: 2; }

  .section-title { font-size:22px; font-weight:800; text-align:center; padding:10px 0 6px; letter-spacing:-.5px; }
  .block-title { font-size:11px; font-weight:600; margin-bottom:6px; }
  .field { margin-bottom:5px; font-size:11px; }
  .field span { font-weight:500; }
  .inner-block { border:1px solid #111; padding:8px 10px; margin-bottom:0; flex:1; }
  .concl-grid { display:grid; grid-template-columns:1fr 1fr; }
  .concl-block { border:1px solid #111; padding:8px 10px; min-height:100px; }
  .content-text { font-size:11px; line-height:1.6; margin-top:4px; }

  /* PAGE 2 — ANALYSE */
  .page-break { page-break-before:always; padding-top:10px; }
  .analyse-title { font-family:'Spectral',serif; font-size:18px; font-weight:600; margin-bottom:16px; padding-bottom:6px; border-bottom:1.5px solid #185FA5; color:#185FA5; }

  @media print {
    @page { margin:1.2cm; size:A4; }
    body { padding:0; }
    .page-break { page-break-before:always; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- PAGE 1 : FICHE DE RÉVISION -->
  <div class="template-grid">

    <!-- Colonne gauche haut : Carte d'identité -->
    <div class="cell carte">
      <div class="block-title">Carte idd de l'oeuvre :</div>
      <div class="field">Titre : <span>${fiche.titre||''}</span></div>
      <div class="field">Auteur : <span>${fiche.auteur||''}</span></div>
      <div class="field">Date : <span>${fiche.date||''}</span></div>
      <div class="field">Genre littéraire : <span>${fiche.genre||''}</span></div>
      <div class="field">Mouvement littéraire : <span>${fiche.mouvement||''}</span></div>
      <div class="field">Parcours associé : <span>${fiche.parcours||''}</span></div>
    </div>

    <!-- Colonne droite haut : Introduction -->
    <div style="border:1px solid #111">
      <div class="section-title">Introduction :</div>
      <div style="display:flex;flex-direction:column">
        <div class="inner-block" style="border-left:none;border-right:none;border-top:1px solid #111;border-bottom:1px solid #111">
          <div class="block-title">Introduction :</div>
          <div class="content-text">${fiche.introduction||''}</div>
        </div>
        <div class="inner-block" style="border-left:none;border-right:none;border-top:none;border-bottom:1px solid #111">
          <div class="block-title">Restitution de l'extrait :</div>
          <div class="content-text">${fiche.restitution||''}</div>
        </div>
        <div class="inner-block" style="border-left:none;border-right:none;border-top:none;border-bottom:none">
          <div class="block-title">Problématique :</div>
          <div class="content-text">${fiche.problematique||''}</div>
        </div>
      </div>
    </div>

    <!-- Colonne gauche bas : Mouvements -->
    <div class="cell mouv-cell">
      <div class="block-title">Mouvement :</div>
      ${mvts}
    </div>

    <!-- Colonne droite bas : Conclusion -->
    <div style="border:1px solid #111">
      <div class="section-title">Conclusion :</div>
      <div class="concl-grid">
        <div class="concl-block">
          <div class="block-title">Réponse a la problématique :</div>
          <div class="content-text">${fiche.reponse||''}</div>
        </div>
        <div class="concl-block" style="border-left:1px solid #111">
          <div class="block-title">Ouverture :</div>
          <div class="content-text">${fiche.ouverture||''}</div>
        </div>
      </div>
    </div>

  </div>

  <!-- PAGE 2 : ANALYSE DÉVELOPPÉE -->
  <div class="page-break">
    <div class="analyse-title">Analyse linéaire développée — ${fiche.titre} · ${fiche.auteur}</div>
    ${analyseSections}
  </div>

</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10000)

    // Upload vers Supabase si connecté, sinon proposer connexion
    if (!user) {
      setShowLoginModal(true)
      return
    }
    if (user) {
      try {
        const pdfBlob = new Blob([html], { type: 'application/pdf' })
        const date = new Date().toISOString().slice(0, 10)
        const filename = `${fiche.titre}_${date}.pdf`.replace(/[^a-zA-Z0-9\u00C0-\u024F._-]/g, '_')
        const formData = new FormData()
        formData.append('file', pdfBlob, filename)
        formData.append('userId', user.id)
        formData.append('oeuvre', fiche.titre || 'Sans_titre')
        formData.append('filename', filename)
        await fetch('/api/storage', { method: 'POST', body: formData })
      } catch(e) {
        console.error('Erreur sauvegarde:', e)
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Modal connexion */}
      {showLoginModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, background: 'var(--b600)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-folder" style={{ fontSize: 18, color: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Sauvegarder l'analyse</div>
                  <div style={{ fontSize: 11, color: 'var(--g400)' }}>Connecte-toi pour accéder à ta bibliothèque</div>
                </div>
              </div>
              <button onClick={() => { setShowLoginModal(false); setLoginSent(false); setLoginEmail('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--g400)', fontSize: 20 }}>
                <i className="ti ti-x" />
              </button>
            </div>

            {loginSent ? (
              <div style={{ background: 'var(--b50)', border: '0.5px solid var(--b100)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <i className="ti ti-mail-check" style={{ fontSize: 32, color: 'var(--b600)', display: 'block', marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Lien envoyé !</div>
                <div style={{ fontSize: 12, color: 'var(--g400)' }}>Vérifie ta boîte mail <strong>{loginEmail}</strong> et clique sur le lien pour te connecter.</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: 'var(--g600)', marginBottom: 12 }}>
                  Entre ton email pour recevoir un lien de connexion — pas de mot de passe.
                </div>
                <input
                  type="email"
                  placeholder="ton@email.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMagicLink()}
                  style={{ width: '100%', padding: '10px 12px', border: '0.5px solid var(--g200)', borderRadius: 8, fontSize: 13, marginBottom: 10, fontFamily: 'inherit', outline: 'none' }}
                  autoFocus
                />
                <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 13 }}
                  onClick={sendMagicLink} disabled={!loginEmail}>
                  <i className="ti ti-send" /> Recevoir le lien
                </button>
                <button onClick={() => setShowLoginModal(false)}
                  style={{ width: '100%', marginTop: 8, padding: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--g400)' }}>
                  Continuer sans sauvegarder
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <nav className="nav">
        <div className="nav-logo">
          <div className="nav-mark"><i className="ti ti-feather" /></div>
          Linéaire
        </div>
        <div className="nav-actions">
          <button className="btn" onClick={onRestart}><i className="ti ti-refresh" />Recommencer</button>
          <a href="/bibliotheque" className="btn"><i className="ti ti-folder" />Ma bibliothèque</a>
          <button className="btn btn-p" onClick={exportPDF}><i className="ti ti-download" />Exporter PDF</button>
        </div>
      </nav>

      <div className="rhint"><i className="ti ti-edit" style={{ fontSize: 12 }} /> Clique sur n'importe quel bloc pour modifier.</div>

      <div className="rtabs">
        <div className={`rtab${tab === 'fiche' ? ' active' : ''}`} onClick={() => setTab('fiche')}>Fiche de révision</div>
        <div className={`rtab${tab === 'analyse' ? ' active' : ''}`} onClick={() => setTab('analyse')}>Analyse développée</div>
      </div>

      <div className="rbody">
        <div id="print-fiche" style={{display: tab === 'fiche' ? 'block' : 'none'}}>
          <div className="tcard fu">
            <div className="thead">
              <div className="tht">{fiche.titre} — {fiche.auteur}</div>
              <div className="ths">Fiche de révision · Terminale</div>
            </div>
            <div className="tcols">
              <div className="tleft">
                <div className="tblock">
                  <div className="tbt">Carte d'identité</div>
                  {[['titre', 'Titre'], ['auteur', 'Auteur'], ['date', 'Date'], ['genre', 'Genre'], ['mouvement', 'Mouvement'], ['parcours', 'Parcours']].map(([k, l]) => (
                    <div className="tf" key={k}>
                      <div className="tfl">{l}</div>
                      <div className="tfv" contentEditable suppressContentEditableWarning
                        onBlur={e => upF(k, e.target.innerText)}>{fiche[k]}</div>
                    </div>
                  ))}
                </div>
                <div className="tblock">
                  <div className="tbt">Mouvements</div>
                  {(fiche.mouvements || []).map((m, i) => (
                    <div className="mc" key={i}>
                      <div className="mn">Mvt {m.numero} · L. {m.lignes}</div>
                      <div className="mt" contentEditable suppressContentEditableWarning
                        onBlur={e => upM(i, 'titre', e.target.innerText)}>{m.titre}</div>
                      <div className="mx" contentEditable suppressContentEditableWarning
                        onBlur={e => upM(i, 'resume', e.target.innerText)}>{m.resume}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="tsh">Introduction</div>
                {[['introduction', 'Introduction'], ['restitution', "Restitution de l'extrait"], ['problematique', 'Problématique']].map(([k, l]) => (
                  <div className="trb" key={k}>
                    <div className="trt">{l}</div>
                    <div className="trtx" contentEditable suppressContentEditableWarning
                      onBlur={e => upF(k, e.target.innerText)}>{fiche[k]}</div>
                  </div>
                ))}
                <div className="tsh">Conclusion</div>
                {[['reponse', 'Réponse à la problématique'], ['ouverture', 'Ouverture']].map(([k, l]) => (
                  <div className="trb" key={k}>
                    <div className="trt">{l}</div>
                    <div className="trtx" contentEditable suppressContentEditableWarning
                      onBlur={e => upF(k, e.target.innerText)}>{fiche[k]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div id="print-analyse" className="print-break" style={{display: tab === 'analyse' ? 'block' : 'none'}}>
          <div className="fu">
            {(analyse || []).map((mouv, mi) => (
              <div className="msec" key={mi}>
                <div className="msh">
                  <span className="msn">Mouvement {mouv.numero}</span>
                  <span className="msti">{mouv.titre}</span>
                  <span className="msl">V. {mouv.lignes}</span>
                </div>
                {(mouv.vers || []).map((v, vi) => (
                  <div className="vrow" key={vi}>
                    <div>
                      <div className="vref">{v.ref}</div>
                      <div className="vq">{v.texte}</div>
                    </div>
                    <div>
                      <div className="ptags">{(v.procedes || []).map((p, pi) => <span className="ptag" key={pi}>{p}</span>)}</div>
                      <div className="atxt" contentEditable suppressContentEditableWarning
                        onBlur={e => upV(mi, vi, 'analyse', e.target.innerText)}>{v.analyse}</div>
                    </div>
                  </div>
                ))}
                {mouv.transition && (
                  <div className="tbar">
                    <i className="ti ti-arrow-right" />
                    <span className="ttxt" contentEditable suppressContentEditableWarning
                      onBlur={e => upT(mi, e.target.innerText)}>{mouv.transition}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <Stepper step={2} />
      </div>
    </div>
  )
}

// ─── App principale ───────────────────────────────────────────────────────────

export default function Page() {
  const [screen, setScreen] = useState('home')
  const [progress, setProgress] = useState(0)
  const [stepIdx, setStepIdx] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginSent, setLoginSent] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const seDeconnecter = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const sendMagicLink = async () => {
    if (!loginEmail) return
    const { error } = await supabase.auth.signInWithOtp({
      email: loginEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    if (!error) setLoginSent(true)
  }

  const handleGenerate = async (texteFile, notesFiles) => {
    setScreen('gen'); setProgress(0); setStepIdx(0); setError(null)
    try {
      setStepIdx(0); setProgress(5)
      const texteB64 = await compressImage(texteFile)
      const notesData = await Promise.all(notesFiles.map(async f => ({
        b64: await compressImage(f), type: mtype(f)
      })))

      setStepIdx(1); setProgress(20)
      await new Promise(r => setTimeout(r, 300))

      setStepIdx(2); setProgress(40)

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texteB64, texteType: mtype(texteFile), notesData })
      })

      setProgress(85)

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`)

      setStepIdx(3); setProgress(100)
      await new Promise(r => setTimeout(r, 400))

      setResult(data)
      setScreen('result')
    } catch (e) {
      setError(e.message)
      setScreen('error')
    }
  }

  if (screen === 'result' && result) {
    return <ResultScreen data={result} onRestart={() => { setScreen('home'); setResult(null) }} />
  }

  return (
    <div>
      <nav className="nav">
        <div className="nav-logo">
          <div className="nav-mark"><i className="ti ti-feather" /></div>
          Linéaire
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {user ? (
            <>
              <a href="/bibliotheque" className="btn"><i className="ti ti-folder" />Ma bibliothèque</a>
              <button className="btn" onClick={seDeconnecter}><i className="ti ti-logout" /></button>
            </>
          ) : (
            <a href="/bibliotheque" className="btn"><i className="ti ti-folder" />Ma bibliothèque</a>
          )}
        </div>
      </nav>

      {screen === 'home' && <HomeScreen onGenerate={handleGenerate} />}
      {screen === 'gen' && <GenScreen progress={progress} stepIdx={stepIdx} />}
      {screen === 'error' && (
        <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px' }} className="fu">
          <div className="errbanner">
            <i className="ti ti-alert-circle" />
            <div>
              <div style={{ fontWeight: 500, marginBottom: 3 }}>Une erreur est survenue</div>
              <div>{error}</div>
            </div>
          </div>
          <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setScreen('home')}>
            <i className="ti ti-arrow-left" /> Réessayer
          </button>
        </div>
      )}
    </div>
  )
}
