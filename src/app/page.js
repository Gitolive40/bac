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
      <div className="hero" style={{ marginBottom: 24 }}>
        <div className="hero-badge">
          <i className="ti ti-school" />
          Bac de français
        </div>
        <p className="hsub" style={{ marginTop: 8, fontSize: 15 }}>
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

function ResultScreen({ data, onRestart, user, showLoginModal, setShowLoginModal, loginEmail, setLoginEmail, loginPassword, setLoginPassword, loginError, setLoginError, loginIsSignup, setLoginIsSignup, loginWithPassword, saveConfirm, setSaveConfirm, showThemeModal, setShowThemeModal }) {
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

  const exportPDF = () => {
    if (!user) { setShowLoginModal(true); return }
    setShowThemeModal(true)
  }

  const doExportPDF = async (theme) => {
    setShowThemeModal(false)

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
          ${mouv.transition ? `<div style="background:#E6F1FB;padding:7px 14px;font-size:11px;font-style:italic;color:#0C447C;border