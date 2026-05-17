import { createAdminClient } from '@/lib/supabase-admin'

export const maxDuration = 30

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const userId = formData.get('userId')
    const oeuvre = formData.get('oeuvre')
    const theme = formData.get('theme') || 'Divers'
    const filename = formData.get('filename')
    const jsonData = formData.get('jsonData') // données JSON de l'analyse

    if (!file || !userId || !oeuvre) {
      return Response.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Normaliser le nom de l'oeuvre
    const safeName = oeuvre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 -]/g, '')
      .trim()
      .replace(/ +/g, '_')
      .slice(0, 50)

    // Chemin : userId/theme/oeuvre/filename.pdf
    const path = `${userId}/${theme}/${safeName}/${filename}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { data, error } = await supabase.storage
      .from('analyses')
      .upload(path, buffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (error) throw error

    // Sauvegarder aussi le JSON pour permettre la modification ultérieure
    if (jsonData) {
      const jsonFilename = filename.replace('.pdf', '.json')
      const jsonPath = `${userId}/${theme}/${safeName}/${jsonFilename}`
      const jsonBuffer = Buffer.from(jsonData, 'utf-8')
      await supabase.storage
        .from('analyses')
        .upload(jsonPath, jsonBuffer, {
          contentType: 'application/json',
          upsert: true
        })
    }

    return Response.json({ path: data.path })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
