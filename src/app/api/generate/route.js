export const runtime = 'edge';

const SYS = `Reponds UNIQUEMENT avec du JSON brut valide. Pas de texte. Pas de commentaires. Pas de markdown. Commence par { et termine par }.`;

const PROMPT = `Analyse ces documents et reponds UNIQUEMENT avec ce JSON sans rien d autre autour:
{"fiche":{"titre":"","auteur":"","date":"","genre":"","mouvement":"","parcours":"","mouvements":[{"numero":1,"lignes":"1-4","titre":"","resume":""}],"introduction":"","restitution":"","problematique":"","reponse":"","ouverture":""},"analyse":[{"numero":1,"lignes":"1-4","titre":"","vers":[{"ref":"V.1","texte":"","procedes":[""],"analyse":""}],"transition":""}]}
Regles: 2-5 mouvements, contenu tire des notes, JSON pur.`;

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Clé API non configurée' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const { texteB64, texteType, notesData } = body;
  if (!texteB64 || !notesData?.length) {
    return Response.json({ error: 'Documents manquants' }, { status: 400 });
  }

  // Construire le contenu du message
  const msgContent = [
    { type: 'text', text: 'Document 1 - Texte litteraire :' },
    { type: 'image', source: { type: 'base64', media_type: texteType, data: texteB64 } },
    { type: 'text', text: `Document 2 - Notes d analyse (${notesData.length} page(s)) :` },
  ];
  notesData.forEach((n, i) => {
    if (notesData.length > 1) msgContent.push({ type: 'text', text: `Page ${i + 1} :` });
    msgContent.push({ type: 'image', source: { type: 'base64', media_type: n.type, data: n.b64 } });
  });
  msgContent.push({ type: 'text', text: PROMPT });

  // Appel API Anthropic
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: SYS,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: msgContent }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = JSON.stringify(err);
    if (res.status === 429 || msg.includes('exceeded_limit') || msg.includes('overage')) {
      return Response.json({ error: 'Limite de tokens atteinte. Attends quelques heures et reessaie.' }, { status: 429 });
    }
    return Response.json({ error: `Erreur API ${res.status}: ${err?.error?.message || 'inconnue'}` }, { status: res.status });
  }

  const data = await res.json();
  const rawText = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');

  if (!rawText.trim()) {
    return Response.json({ error: "L'IA n'a pas retourné de contenu. Vérifie que tes images sont lisibles." }, { status: 500 });
  }

  // Extraction robuste du JSON
  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    return Response.json({ error: 'Pas de JSON dans la réponse. Réessaie.' }, { status: 500 });
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
  } catch (e) {
    return Response.json({ error: `Erreur JSON: ${e.message}. Réessaie.` }, { status: 500 });
  }

  if (!parsed.fiche || !parsed.analyse) {
    return Response.json({ error: 'Structure incomplète. Réessaie.' }, { status: 500 });
  }

  return Response.json(parsed);
}
