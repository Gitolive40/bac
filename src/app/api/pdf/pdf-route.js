export const maxDuration = 30

export async function POST(request) {
  const apiKey = process.env.PDFSHIFT_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Clé PDFShift non configurée' }, { status: 500 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const { html } = body
  if (!html) {
    return Response.json({ error: 'HTML manquant' }, { status: 400 })
  }

  try {
    const res = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64')
      },
      body: JSON.stringify({
        source: html,
        landscape: false,
        use_print: true,
        format: 'A4',
        margin: '0'
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return Response.json({ error: `PDFShift erreur: ${err?.error || res.status}` }, { status: 500 })
    }

    const pdfBuffer = await res.arrayBuffer()

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="analyse.pdf"'
      }
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
