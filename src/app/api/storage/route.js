import { createAdminClient } from '@/lib/supabase-admin'

export const maxDuration = 30

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const userId = formData.get('userId')
    const oeuvre = formData.get('oeuvre')
    const filename = formData.get('filename')

    if (!file || !userId || !oeuvre) {
      return Response.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Chemin : userId/oeuvre/filename.pdf
    // Supprimer les accents et caractères spéciaux pour le chemin Supabase
    const safeName = oeuvre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 50)
    const path = `${userId}/${safeName}/${filename}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { data, error } = await supabase.storage
      .from('analyses')
      .upload(path, buffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (error) throw error

    return Response.json({ path: data.path })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
