'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

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
        <div className="unum">{hasFiles ? <i className="ti ti-check" /> : num}</div>
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
          <i className={`ti ti-${icon}`} />
          <div className="dtxt">
            {multi && hasFiles ? 'Ajouter une 2e photo' : 'Glisse ton fichier ici'}<br />
            ou clique pour parcourir
          </div>
          <span className="dcta">{multi && hasFiles ? 'Ajouter' : 'Choisir un fichier'}</span>
          <div className="dfmt">JPG · PNG · WEBP · PDF{multi ? ' · 2 max' : ''}</div>
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
      <div className="hero">
        <div className="eyebrow">Bac de français</div>
        <h1 className="h1">Génère ton analyse linéaire<br />en quelques secondes</h1>
        <p className="hsub">Importe ton texte et tes notes — l'IA fait le reste.</p>
      </div>
      <div className="ugrid">
        <UploadZone num="1" icon="file-text" label="Texte littéraire"
          sublabel="Le poème ou l'extrait" files={texteFiles} onFiles={setTexteFiles} multi={false} />
        <UploadZone num="2" icon="notes" label="Notes d'analyse"
          sublabel="1 ou 2 photos de tes notes" files={notesFiles} onFiles={setNotesFiles} multi={true} />
      </div>
      <button className="btn btn-p"
        style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 13, marginBottom: 4 }}
        disabled={!ready} onClick={() => onGenerate(texteFiles[0], notesFiles)}>
        <i className="ti ti-sparkles" /> Générer l'analyse
      </button>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <nav className="nav">
        <div className="nav-logo">
          <div className="nav-mark"><i className="ti ti-feather" /></div>
          Linéaire
        </div>
        <div className="nav-actions">
          <button className="btn" onClick={onRestart}><i className="ti ti-refresh" />Recommencer</button>
          <button className="btn btn-p"><i className="ti ti-download" />Exporter</button>
        </div>
      </nav>

      <div className="rhint"><i className="ti ti-edit" style={{ fontSize: 12 }} /> Clique sur n'importe quel bloc pour modifier.</div>

      <div className="rtabs">
        <div className={`rtab${tab === 'fiche' ? ' active' : ''}`} onClick={() => setTab('fiche')}>Fiche de révision</div>
        <div className={`rtab${tab === 'analyse' ? ' active' : ''}`} onClick={() => setTab('analyse')}>Analyse développée</div>
      </div>

      <div className="rbody">
        {tab === 'fiche' ? (
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
        ) : (
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
        )}
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
        <span className="nav-meta">Analyse linéaire assistée par IA</span>
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
