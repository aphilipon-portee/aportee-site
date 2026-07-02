// Générateur du site public à portée — V5 « vibration »
// Hero manifeste (typo géante, écho RGB-split, ondes, formes géantes, ticker),
// énergie prolongée sur l'agenda (titres qui vibrent au survol) mais cartes lisibles.
//
// Avec brouillons curés : node --env-file=../moteur/.env generate.mjs

import {writeFileSync} from 'node:fs'

const PROJECT_ID = 'gaax9b2n'
const DATASET = 'production'

const GROQ = `*[_type=="evenement" && statut in ["valide","coup-de-coeur"]] | order(dateHeure asc){
  _id, titre, accroche, ages, type, compositeursOeuvres,
  dateHeure, datesTexte, lieu, arrondissement, duree, tarif, lienBilletterie, statut,
  latitude, longitude, source, lignes
}`

async function charger() {
  const url = `https://${PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/${DATASET}?query=${encodeURIComponent(GROQ)}`
  const headers = {}
  // Nettoie la clé de tout caractère invisible (BOM, espaces) qui casserait l'en-tête HTTP.
  const tok = (process.env.SANITY_TOKEN || '').replace(/[^\x21-\x7E]/g, '')
  if (tok) headers.Authorization = `Bearer ${tok}`
  const rep = await fetch(url, {headers})
  if (!rep.ok) throw new Error(`Sanity a répondu ${rep.status}`)
  const {result} = await rep.json()
  const parBase = new Map()
  for (const e of result || []) {
    const base = (e._id || '').replace(/^drafts\./, '')
    if (!parBase.has(base)) parBase.set(base, e)
  }
  return [...parBase.values()]
}

const echap = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function dateFr(iso) {
  if (!iso) return 'date à confirmer'
  const d = new Date(iso)
  if (isNaN(d)) return 'date à confirmer'
  const p = {}
  for (const part of new Intl.DateTimeFormat('fr-FR', {timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit'}).formatToParts(d)) p[part.type] = part.value
  const heure = p.hour && !(p.hour === '0' && p.minute === '00') ? ` · ${p.hour}h${p.minute === '00' ? '' : p.minute}` : ''
  return `${p.day} ${p.month} ${p.year}${heure}`
}
const LABEL_TYPE = {concert: 'Concert', 'cine-concert': 'Ciné-concert', opera: 'Opéra jeune public', eveil: 'Éveil musical', atelier: 'Atelier', autre: 'Spectacle musical'}
const AGES = {
  '0-3': {label: '0-3 ans', color: '#F4C744', tint: '#FBEFC6', ink: '#412402', shape: 'cercle'},
  '3-6': {label: '3-6 ans', color: '#7CC366', tint: '#E4F3D9', ink: '#173404', shape: 'triangle'},
  '6-12': {label: '6-12 ans', color: '#2F6BEF', tint: '#DCE6FE', ink: '#16233F', shape: 'losange'},
}
const FORMES = {
  cercle: '<circle cx="12" cy="12" r="10"/>',
  triangle: '<polygon points="12,2 22,21 2,21"/>',
  losange: '<polygon points="12,1 23,12 12,23 1,12"/>',
  etoile: '<polygon points="12,2 15,9 22,9.5 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9.5 9,9"/>',
}
const forme = (shape, fill, size = 16) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" style="flex:none"><g fill="${fill}">${FORMES[shape]}</g></svg>`
const lienUtm = (url) => { if (!url) return '#'; const sep = url.includes('?') ? '&' : '?'; return `${url}${sep}utm_source=aportee&utm_medium=site` }

// Heure de début (heure de Paris) pour "compatible sieste"
function heureParis(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const h = new Intl.DateTimeFormat('fr-FR', {timeZone: 'Europe/Paris', hour: 'numeric', hour12: false}).format(d)
  return parseInt(h, 10)
}
// Durée en minutes (la plus longue trouvée) pour "court < 45 min"
function dureeMinutes(d) {
  if (!d) return ''
  const s = String(d).toLowerCase()
  const vals = []
  let m
  const reH = /(\d+)\s*h(?:\s*(\d+))?/g
  while ((m = reH.exec(s))) vals.push(parseInt(m[1], 10) * 60 + (m[2] ? parseInt(m[2], 10) : 0))
  const reM = /(\d+)\s*min/g
  while ((m = reM.exec(s))) vals.push(parseInt(m[1], 10))
  return vals.length ? Math.max(...vals) : ''
}
const ROT = [-2.2, 1.6, -1.2, 2.1, -1.8, 1.1, -1.5, 2.4]

function carte(e, i) {
  const ages = (e.ages || []).filter((a) => AGES[a])
  const prim = ages[0] ? AGES[ages[0]] : {tint: '#fffdf9', ink: '#16233F'}
  const pastilles = ages.map((a) => { const A = AGES[a]; return `<span class="pastille" style="background:${A.color};color:${A.ink}">${forme(A.shape, A.ink, 13)}${A.label}</span>` }).join('')
  const estCdc = e.statut === 'coup-de-coeur'
  const cdc = estCdc ? `<span class="cdc">${forme('etoile', '#fff', 12)} Coup de cœur</span>` : ''
  const ocp = /orchestre de chambre/i.test(e.source || '') ? `<span class="ocp">programmé par l'OCP</span>` : ''
  const compos = (e.compositeursOeuvres || []).length ? `<p class="compos">${echap((e.compositeursOeuvres || []).slice(0, 3).join(' · '))}</p>` : ''
  const lieu = [e.lieu, e.arrondissement].filter(Boolean).map(echap).join(' · ')
  const meta = [LABEL_TYPE[e.type] || 'Spectacle musical', e.duree ? echap(e.duree) : ''].filter(Boolean).join(' · ')
  const tarifCourt = e.tarif && e.tarif.length <= 18 ? ` · ${echap(e.tarif)}` : ''
  const geo = typeof e.latitude === 'number' && typeof e.longitude === 'number' ? ` data-lat="${e.latitude}" data-lon="${e.longitude}"` : ''
  const ongoing = /^En cours/.test(e.datesTexte || '') ? '1' : '0'
  const id = (e._id || '').replace(/^drafts\./, '')
  const h = heureParis(e.dateHeure), dmin = dureeMinutes(e.duree)
  return `
    <article class="carte" data-id="${echap(id)}" data-ages="${(e.ages || []).join(' ')}" data-date="${(e.dateHeure || '').slice(0, 10)}" data-ongoing="${ongoing}" data-lignes="${echap((e.lignes || []).join('|'))}" data-start="${echap(e.dateHeure || '')}" data-titre="${echap(e.titre)}" data-lieu="${echap(lieu)}" data-heure="${h}" data-dureemin="${dmin}"${geo}
      style="background:${prim.tint};transform:rotate(${ROT[i % ROT.length]}deg)">
      <button class="fav" type="button" aria-label="Ajouter aux favoris">♡</button>
      <div class="c-haut"><span class="type">${echap(meta)}</span>${cdc}</div>
      <h2 style="color:${prim.ink}">${echap(e.titre)}</h2>
      ${e.accroche ? `<p class="accroche">${echap(e.accroche)}</p>` : ''}
      ${compos}
      <div class="pastilles">${pastilles}</div>
      <p class="infos">${echap(dateFr(e.dateHeure))}${e.datesTexte ? `<br><span class="autres">${echap(e.datesTexte)}</span>` : ''}<br>${lieu}<span class="dist"></span></p>
      <div class="c-bas">
        <div class="c-boutons">
          <a class="billet" href="${echap(lienUtm(e.lienBilletterie))}" target="_blank" rel="noopener">Réserver${tarifCourt}</a>
          <button class="ics" type="button">📅 Mon agenda</button>
        </div>
        ${ocp}
      </div>
    </article>`
}

// Formes géantes + ondes + note à ondes pour le hero
const HERO_DECOR = `
  <div class="shape cercle" aria-hidden="true"></div>
  <div class="shape losange" aria-hidden="true"></div>
  <div class="shape triangle" aria-hidden="true"></div>
  <div class="waves" aria-hidden="true">
    <svg viewBox="0 0 480 60" preserveAspectRatio="none"><path d="M0 30 Q40 0 80 30 T160 30 T240 30 T320 30 T400 30 T480 30" fill="none" stroke="var(--ink)" stroke-width="3"/></svg>
    <svg viewBox="0 0 480 60" preserveAspectRatio="none" style="margin-top:22px"><path d="M0 30 Q40 60 80 30 T160 30 T240 30 T320 30 T400 30 T480 30" fill="none" stroke="var(--orange)" stroke-width="3"/></svg>
  </div>
  <div class="note-zone" aria-hidden="true"><span class="ripple"></span><span class="ripple"></span><span class="ripple"></span><span class="note-dot"></span></div>`

const TICKER = `<div class="ticker" aria-hidden="true"><div class="run">${
  Array(2).fill('<span>belle musique</span><span class="d">◆</span><span>à hauteur d\'enfant</span><span class="d">●</span><span>à Paris</span><span class="d">▲</span><span>0-12 ans</span><span class="d">★</span>').join('')
}</div></div>`

const IG_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>'

const PLAYLISTS = `
  <section class="band" id="playlists">
    <p class="eyebrow">à écouter à la maison</p>
    <h2 class="sec">Nos <span class="e">playlists</span></h2>
    <p class="intro">Faire entrer la belle musique dans le quotidien, ou préparer une sortie. Choisies une par une, comme le reste.</p>
    <div class="plgrid">
      <a class="pl pl1" href="#"><span class="play">▶</span><h3>Premiers sons, 0-3 ans</h3><p>Des berceuses et des cordes tout en douceur, pour les toutes petites oreilles.</p></a>
      <a class="pl pl2" href="#"><span class="play">▶</span><h3>Reconnaître les instruments</h3><p>Un par un, façon « Pierre et le Loup » : la flûte, le basson, le violoncelle.</p></a>
      <a class="pl pl3" href="#"><span class="play">▶</span><h3>Les tubes qu'ils fredonnent déjà</h3><p>Ces mélodies classiques qu'ils connaissent sans le savoir.</p></a>
      <a class="pl pl4" href="#"><span class="play">▶</span><h3>Avant le concert</h3><p>Le programme de la sortie du week-end, à découvrir en amont.</p></a>
    </div>
  </section>`

const MEDIATION = `
  <section class="band" id="mediation">
    <p class="eyebrow">pour aller plus loin</p>
    <h2 class="sec">Comprendre <span class="e">en s'amusant</span></h2>
    <p class="intro">De petits contenus pour donner des clés aux familles, sans jamais faire la leçon.</p>
    <div class="medgrid">
      <div class="med"><span class="tag">bientôt</span><h3>L'instrument du mois</h3><p>Une fiche courte et rigolote : à quoi il ressemble, comment il sonne, où l'entendre.</p></div>
      <div class="med"><span class="tag">bientôt</span><h3>3 choses à écouter avant d'y aller</h3><p>Préparer la sortie en famille, en trois extraits.</p></div>
      <div class="med"><span class="tag">bientôt</span><h3>Le mot de la musique</h3><p>Symphonie, quatuor, ouverture... le vocabulaire, expliqué simplement.</p></div>
    </div>
  </section>`

const BOUTIQUE = `
  <section class="boutique" id="boutique">
    <div class="bout-in">
      <div>
        <p class="eyebrow">bientôt</p>
        <h2 class="sec">La <span class="e2">boutique</span> à portée</h2>
        <p class="intro2">Des goodies pensés pour les petites oreilles. À découvrir très vite.</p>
      </div>
      <div class="bout-shapes" aria-hidden="true"><span>●</span><span>▲</span><span>◆</span><span>★</span></div>
    </div>
  </section>`

const evenements = await charger()
const cartes = evenements.map((e, i) => carte(e, i)).join('\n')
const vide = `<p class="vide">Les premières sélections arrivent très bientôt. Revenez vite !</p>`

// Toutes les lignes présentes dans l'agenda (pour la recherche "Ma ligne")
const ordreMode = (l) => { const o = ['Métro', 'RER', 'Tram', 'Train', 'Bus']; const i = o.findIndex((m) => l.startsWith(m)); return i < 0 ? 9 : i }
const toutesLignes = [...new Set(evenements.flatMap((e) => e.lignes || []))].sort((a, b) => (ordreMode(a) - ordreMode(b)) || a.localeCompare(b, 'fr', {numeric: true}))
const ligneOptions = toutesLignes.map((l) => `<option value="${echap(l)}"></option>`).join('')

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>à portée — la belle musique à hauteur d'enfant</title>
<meta name="description" content="L'agenda de la belle musique pour les familles à Paris. Concerts et spectacles pour les 0-12 ans, choisis un par un, jamais au hasard. Une initiative de l'Orchestre de chambre de Paris.">
<meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,900&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root{--cream:#F5ECDD;--ink:#16233F;--orange:#EF4A28;--a03:#F4C744;--a36:#7CC366;--a612:#2F6BEF;--famille:#D4537E;
    --serif:"Fraunces",Georgia,serif;--sans:"DM Sans",Arial,sans-serif}
  *{box-sizing:border-box}
  body{margin:0;background:var(--cream);color:var(--ink);font-family:var(--sans);line-height:1.5;overflow-x:hidden}
  a{color:inherit}

  /* Header */
  header.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 30px;position:relative;z-index:6;flex-wrap:wrap}
  .wm{font-family:var(--serif);font-weight:900;font-size:26px;letter-spacing:-.5px}
  nav.pills{display:flex;gap:8px;flex-wrap:wrap}
  nav.pills a{background:#fff;border:2px solid var(--ink);border-radius:22px;padding:7px 15px;font-weight:700;font-size:14px;text-decoration:none;display:inline-block;transition:transform .12s ease,background .12s ease,color .12s ease}
  nav.pills a:hover{background:var(--ink);color:var(--cream);transform:translateY(-2px)}

  /* Hero vibration */
  .hero{position:relative;min-height:76vh;padding:14px 30px 0;overflow:hidden;display:flex;flex-direction:column;justify-content:center}
  .shape{position:absolute;z-index:0}
  .shape.cercle{top:-120px;right:-90px;width:420px;height:420px;border:26px solid var(--a03);border-radius:50%}
  .shape.losange{bottom:30px;left:-80px;width:210px;height:210px;background:var(--a612);transform:rotate(45deg);opacity:.9}
  .shape.triangle{top:36%;right:7%;width:0;height:0;border-left:70px solid transparent;border-right:70px solid transparent;border-bottom:120px solid var(--a36);opacity:.9;transform:rotate(12deg)}
  .waves{position:absolute;left:-10%;right:-10%;top:32%;z-index:0;opacity:.5}
  .waves svg{width:120%;display:block}
  .waves svg path{animation:onde 6s linear infinite}
  .waves svg:nth-child(2) path{animation-duration:8s;animation-direction:reverse}
  @keyframes onde{from{transform:translateX(0)}to{transform:translateX(-160px)}}
  .note-zone{position:absolute;left:8%;top:32%;z-index:1;width:20px;height:20px}
  .note-dot{position:absolute;left:0;top:0;width:20px;height:20px;background:var(--orange);border-radius:50%;z-index:2}
  .ripple{position:absolute;left:10px;top:10px;width:20px;height:20px;margin:-10px;border:3px solid var(--orange);border-radius:50%;transform:scale(.2);opacity:.7;animation:ripple 3.2s ease-out infinite}
  .ripple:nth-child(2){animation-delay:1s}.ripple:nth-child(3){animation-delay:2s}
  @keyframes ripple{to{transform:scale(6);opacity:0}}

  .eyebrow{position:relative;z-index:3;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--orange);font-size:14px;margin:0 0 10px}
  .title{position:relative;z-index:3;font-family:var(--serif);font-weight:900;line-height:.82;letter-spacing:-2px;margin:0}
  .title .line{display:block;font-size:clamp(46px,12vw,142px)}
  .title .l2{margin-left:.18em}.title .l3{margin-left:.06em}
  .title .word{display:inline-block;color:var(--ink);text-shadow:6px 0 var(--orange),-6px 0 var(--a612)}
  .title .outline{color:transparent;-webkit-text-stroke:2.5px var(--ink);text-shadow:none;animation:none !important}
  .title .word:hover{animation:shake .28s linear infinite}
  @keyframes buzz{0%,100%{text-shadow:6px 0 var(--orange),-6px 0 var(--a612)}50%{text-shadow:5px 2px var(--orange),-5px -2px var(--a612)}}
  @keyframes shake{0%,100%{transform:translate(0,0)}25%{transform:translate(-2px,1px)}50%{transform:translate(2px,-1px)}75%{transform:translate(-1px,-2px)}}
  .sub{position:relative;z-index:3;font-size:clamp(16px,2vw,20px);max-width:540px;margin:26px 0 0;font-weight:500}
  .cta{position:relative;z-index:3;display:inline-block;align-self:flex-start;margin:22px 0 30px;background:var(--orange);color:#fff;border:2.5px solid var(--ink);border-radius:12px;padding:14px 24px;font-weight:700;text-decoration:none;font-size:17px;transition:transform .15s ease,background .15s ease}
  .cta:hover{background:var(--ink);transform:scale(1.05) rotate(-1deg)}

  /* Ticker */
  .ticker{background:var(--ink);color:var(--cream);overflow:hidden;white-space:nowrap;padding:13px 0;font-family:var(--serif);font-weight:900;font-size:24px}
  .ticker .run{display:inline-block;animation:defile 24s linear infinite}
  .ticker .run span{margin:0 8px}.ticker .d{color:var(--orange)}
  @keyframes defile{from{transform:translateX(0)}to{transform:translateX(-50%)}}

  /* Filtres */
  .filtres{display:flex;gap:8px;flex-wrap:wrap;max-width:1180px;margin:0 auto;padding:8px 30px;align-items:center}
  .filtres:first-of-type{padding-top:22px}
  .lab{font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;opacity:.6;margin-right:2px}
  .filtre{background:#fff;border:2px solid var(--ink);border-radius:22px;padding:7px 14px;cursor:pointer;font-family:var(--sans);font-size:14px;font-weight:500;transition:transform .12s ease,border-color .12s ease,background .12s ease}
  .filtre:hover{border-color:var(--orange);transform:translateY(-2px)}
  .filtre.actif{background:var(--ink);color:var(--cream)}
  .filtre.actif.age03{background:var(--a03);color:#412402;border-color:#412402}
  .filtre.actif.age36{background:var(--a36);color:#173404;border-color:#173404}
  .filtre.actif.age612{background:var(--a612);color:#fff}
  .geo-msg{font-size:14px;opacity:.7}
  #ligne-input{border:2px solid var(--ink);border-radius:22px;padding:7px 14px;font-family:var(--sans);font-size:14px;min-width:260px;background:#fff;color:var(--ink)}
  #ligne-chips{display:flex;gap:6px;flex-wrap:wrap}
  .chip{display:inline-flex;align-items:center;gap:6px;background:var(--ink);color:var(--cream);border-radius:20px;padding:5px 6px 5px 12px;font-size:13px;font-weight:700}
  .chip button{border:none;background:var(--orange);color:#fff;width:18px;height:18px;border-radius:50%;cursor:pointer;line-height:1;font-size:12px;padding:0}
  /* Actions + nouveaux éléments */
  .actions{display:flex;gap:10px;flex-wrap:wrap;max-width:1180px;margin:0 auto;padding:18px 30px 0;align-items:center}
  .act{background:var(--ink);color:var(--cream);border:2px solid var(--ink);border-radius:22px;padding:9px 16px;font-family:var(--sans);font-weight:700;font-size:14px;cursor:pointer;transition:transform .12s ease,background .12s ease}
  .act:hover{transform:translateY(-2px)}
  .zone{max-width:1180px;margin:0 auto;padding:6px 30px}
  .zone.perso{background:#fff;border:2px solid var(--ink);border-radius:16px;margin:18px auto 6px;padding:14px 22px}
  .zone.filtrer{padding-top:12px}
  .zone-titre{display:block;font-family:var(--serif);font-weight:900;font-size:19px;margin:0 0 4px;letter-spacing:-.3px}
  .zone.perso .zone-titre{color:var(--orange)}
  .zone .filtres{padding:5px 0;max-width:none;margin:0}
  .sep{width:1px;align-self:center;height:26px;background:rgba(22,35,63,.22);margin:0 6px}
  #btn-favoris.actif,#btn-mes-enfants.actif,.filtre[data-malin].actif{background:var(--orange);color:#fff;border-color:var(--orange)}
  .banniere{max-width:1180px;margin:10px auto 0;padding:8px 30px;font-weight:700}
  .banniere a{color:var(--orange)}
  .carte{position:relative}
  .fav{position:absolute;top:12px;right:12px;background:#fff;border:2px solid var(--ink);border-radius:50%;width:34px;height:34px;font-size:16px;line-height:1;cursor:pointer;color:var(--orange);z-index:2;padding:0}
  .fav.on{background:var(--orange);color:#fff}
  .c-haut{padding-right:40px}
  .c-boutons{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .ics{background:#fff;color:var(--ink);border:2px solid var(--ink);border-radius:10px;padding:10px 12px;font-family:var(--sans);font-weight:700;font-size:13px;cursor:pointer}
  .ics:hover{background:var(--ink);color:var(--cream)}
  .carte.surprise{outline:4px solid var(--orange);outline-offset:3px;animation:pulse 1s ease 2}
  @keyframes pulse{0%,100%{outline-color:var(--orange)}50%{outline-color:var(--a03)}}

  /* Agenda */
  main{max-width:1180px;margin:0 auto;padding:20px 30px 70px}
  .board{column-width:300px;column-gap:22px}
  .carte{break-inside:avoid;-webkit-column-break-inside:avoid;border:2px solid var(--ink);border-radius:14px;padding:20px;margin:0 0 22px;display:flex;flex-direction:column;transition:transform .22s ease}
  .carte h2{transition:color .18s ease,text-shadow .18s ease}
  .carte:hover{transform:rotate(0deg) translateY(-5px) scale(1.015) !important}
  .carte:hover h2{color:var(--ink) !important;text-shadow:3px 0 var(--orange),-3px 0 var(--a612)}
  .c-haut{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px}
  .type{font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700;opacity:.7}
  .cdc{display:inline-flex;align-items:center;gap:5px;background:var(--orange);color:#fff;font-size:11px;font-weight:700;padding:4px 9px;border-radius:12px;white-space:nowrap;transform:rotate(4deg)}
  .carte h2{font-family:var(--serif);font-weight:700;font-size:22px;line-height:1.15;margin:2px 0 8px}
  .accroche{margin:0 0 10px;font-size:15px}
  .compos{margin:0 0 10px;font-family:var(--serif);font-style:italic;font-size:14px;opacity:.85}
  .pastilles{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
  .pastille{display:inline-flex;align-items:center;gap:5px;padding:3px 9px 3px 6px;border-radius:20px;font-size:12px;font-weight:700}
  .infos{font-size:14px;margin:0 0 16px;opacity:.9}
  .autres{font-style:italic;opacity:.8}.dist{color:var(--orange);font-weight:700}
  .c-bas{margin-top:auto;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
  .billet{background:var(--orange);color:#fff;text-decoration:none;font-weight:700;padding:11px 16px;border-radius:10px;border:2px solid var(--ink);display:inline-block;transition:transform .15s ease,background .15s ease}
  .billet:hover{background:var(--ink);transform:scale(1.04)}
  .ocp{font-size:11px;opacity:.7}
  .vide{text-align:center;font-family:var(--serif);font-style:italic;font-size:18px;opacity:.7;padding:50px 0}

  /* Footer */
  footer{background:var(--ink);color:var(--cream)}
  .foot{max-width:1180px;margin:0 auto;padding:46px 30px;display:flex;gap:34px;flex-wrap:wrap;justify-content:space-between}
  .foot .news h3{font-family:var(--serif);font-weight:900;font-size:30px;margin:0 0 12px;text-shadow:3px 0 var(--orange),-3px 0 var(--a612)}
  .foot form{display:flex;gap:8px;flex-wrap:wrap}
  .foot input{border:2px solid var(--cream);border-radius:10px;padding:11px 13px;font-family:var(--sans);font-size:15px;background:transparent;color:var(--cream);min-width:210px}
  .foot input::placeholder{color:#b9c2d2}
  .foot .sinscrire{background:var(--orange);color:#fff;border:none;border-radius:10px;padding:11px 18px;font-weight:700;font-family:var(--sans);cursor:pointer;transition:transform .15s ease}
  .foot .sinscrire:hover{transform:scale(1.05)}
  .foot .meta{font-size:14px;opacity:.85;max-width:280px}
  .foot .meta a{color:var(--orange);text-decoration:none;font-weight:700}

  /* Instagram dans le header */
  nav.pills a.ig{display:inline-flex;align-items:center;justify-content:center;padding:7px 11px}

  /* Sections Playlists / Médiation / Boutique */
  .band{max-width:1180px;margin:0 auto;padding:54px 30px}
  .band .eyebrow{position:static}
  .sec{font-family:var(--serif);font-weight:900;font-size:clamp(30px,5.4vw,54px);line-height:.92;margin:0 0 8px;letter-spacing:-1px}
  .sec .e{text-shadow:3px 0 var(--orange),-3px 0 var(--a612)}
  .intro{max-width:560px;margin:0 0 24px;font-weight:500;font-size:17px}
  .plgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px}
  .pl{border:2px solid var(--ink);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:4px;text-decoration:none;color:var(--ink);transition:transform .18s ease}
  .pl:hover{transform:translateY(-5px) rotate(-1deg)}
  .pl .play{width:44px;height:44px;border-radius:50%;background:var(--orange);border:2px solid var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;margin-bottom:8px}
  .pl h3{font-family:var(--serif);font-weight:700;font-size:19px;margin:2px 0 2px;line-height:1.15}
  .pl p{font-size:14px;margin:0;opacity:.85}
  .pl1{background:#FBEFC6}.pl2{background:#E4F3D9}.pl3{background:#DCE6FE}.pl4{background:#F7DCE4}
  .medgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px}
  .med{border:2px dashed var(--ink);border-radius:14px;padding:20px 18px;position:relative;background:#fffdf9}
  .med .tag{position:absolute;top:-11px;left:14px;background:var(--a612);color:#fff;font-size:11px;font-weight:700;padding:3px 9px;border-radius:10px;transform:rotate(-3deg)}
  .med h3{font-family:var(--serif);font-weight:700;font-size:19px;margin:4px 0 6px}
  .med p{font-size:14px;margin:0;opacity:.85}
  .boutique{background:var(--orange);color:#fff;border-top:2px solid var(--ink);border-bottom:2px solid var(--ink)}
  .bout-in{max-width:1180px;margin:0 auto;padding:42px 30px;display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap}
  .boutique .sec{color:#fff}
  .boutique .sec .e2{color:var(--ink)}
  .boutique .eyebrow{color:var(--ink)}
  .intro2{margin:8px 0 0;font-weight:500;max-width:430px}
  .bout-shapes{font-size:46px;letter-spacing:10px;opacity:.92}

  @media (prefers-reduced-motion: no-preference){
    .title .word{animation:buzz 2.6s ease-in-out infinite}
    .title .word:nth-child(1){animation-delay:.2s}
  }
  @media (prefers-reduced-motion: reduce){
    .waves svg path,.ripple,.ticker .run{animation:none}
  }
  @media(max-width:600px){.title .l2,.title .l3{margin-left:0}.shape.cercle{width:240px;height:240px;top:-70px;right:-60px}}
</style>
</head>
<body>
  <header class="top">
    <span class="wm">à portée</span>
    <nav class="pills"><a href="#agenda">Agenda</a><a href="#playlists">Playlists</a><a href="#mediation">Médiation</a><a href="#boutique">Boutique</a><a class="ig" href="#" aria-label="Instagram">${IG_ICON}</a></nav>
  </header>

  <section class="hero">
    ${HERO_DECOR}
    <p class="eyebrow">notre sélection · Paris · 0-12 ans</p>
    <h1 class="title">
      <span class="line"><span class="word">la belle</span></span>
      <span class="line l2"><span class="word outline">musique</span></span>
      <span class="line l3"><span class="word">à hauteur d'enfant.</span></span>
    </h1>
    <p class="sub">On choisit pour vous les concerts et spectacles qui font vibrer les petites oreilles. Un par un, jamais au hasard.</p>
    <a class="cta" href="#agenda">Voir l'agenda</a>
  </section>

  ${TICKER}

  <div id="banniere-selection" class="banniere" style="display:none">👀 Une sélection partagée avec vous. <a href="./">Voir tout l'agenda</a></div>

  <section class="zone perso" aria-label="Pour vous">
    <span class="zone-titre">Pour vous</span>
    <div class="filtres" id="enfants-row">
      <span class="lab">Mes enfants</span>
      <span id="enfants-liste" class="chips"></span>
      <button id="btn-ajout-enfant" class="filtre" type="button">+ ajouter un enfant</button>
      <button id="btn-mes-enfants" class="filtre" type="button" style="display:none">👶 Pour mes enfants</button>
    </div>
    <div class="filtres" id="perso-actions">
      <span class="lab">Mes outils</span>
      <button id="btn-favoris" class="act" type="button">❤️ Mes favoris</button>
      <button id="btn-surprise" class="act" type="button">🎲 Surprends-moi</button>
      <button id="btn-partager" class="act" type="button">🔗 Partager ma sélection</button>
      <span id="partage-msg" class="geo-msg"></span>
    </div>
  </section>

  <section class="zone filtrer" aria-label="Filtrer l'agenda">
    <span class="zone-titre">Filtrer l'agenda</span>
    <div class="filtres" id="filtres-periode">
      <span class="lab">Quand</span>
      <button class="filtre actif" data-periode="tous">Toute l'année</button>
      <button class="filtre" data-periode="mois">Ce mois-ci</button>
      <button class="filtre" data-periode="weekend">Ce week-end</button>
      <button class="filtre" data-periode="semaine">Cette semaine</button>
      <span class="sep"></span>
      <button class="filtre" data-malin="sieste" type="button">🛏️ Compatible sieste</button>
      <button class="filtre" data-malin="court" type="button">⏱️ Court (‹ 45 min)</button>
    </div>
    <div class="filtres" id="filtres-age">
      <span class="lab">Âge</span>
      <button class="filtre actif" data-age="tous">Tous</button>
      <button class="filtre age03" data-age="0-3">0-3 ans</button>
      <button class="filtre age36" data-age="3-6">3-6 ans</button>
      <button class="filtre age612" data-age="6-12">6-12 ans</button>
    </div>
    <div class="filtres" id="ou-row">
      <span class="lab">Où</span>
      <button class="filtre" id="btn-geo">📍 Près de moi</button>
      <input id="ligne-input" list="ligne-list" placeholder="ex. Métro 6, Bus 91… (sans changement)" autocomplete="off">
      <datalist id="ligne-list">${ligneOptions}</datalist>
      <span id="ligne-chips" class="chips"></span>
      <span id="geo-msg" class="geo-msg"></span>
    </div>
  </section>

  <main id="agenda">
    <div class="board" id="grille">${cartes || vide}</div>
    <p class="vide" id="aucun" style="display:none">Aucun événement pour ce choix. Essaie une autre période ou un autre âge.</p>
  </main>

  ${PLAYLISTS}
  ${MEDIATION}
  ${BOUTIQUE}

  <footer id="news">
    <div class="foot">
      <div class="news">
        <h3>Recevez nos coups de cœur</h3>
        <form onsubmit="return false">
          <input type="email" placeholder="votre e-mail" aria-label="votre e-mail">
          <button class="sinscrire" type="submit">Je m'inscris</button>
        </form>
      </div>
      <div class="meta">une initiative de l'Orchestre de chambre de Paris.<br><br>Suivez-nous sur <a href="#">Instagram</a>.</div>
    </div>
  </footer>

  <script>
    const cartes = [...document.querySelectorAll('.carte')]
    let curAges = new Set(), curPer = 'tous', userPos = null, curLignes = new Set()
    let sieste = false, court = false, favView = false, selection = null
    const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} } }
    let favoris = new Set(LS.get('aportee-favoris', []))
    let enfants = LS.get('aportee-enfants', [])
    const anneeCourante = new Date().getFullYear()
    const tranchesAge = (a) => { const t = []; if (a < 4) t.push('0-3'); if (a >= 3 && a < 7) t.push('3-6'); if (a >= 6) t.push('6-12'); return [...new Set(t)] }
    const finSemaine = (now) => { const d = new Date(now); d.setDate(now.getDate() + ((7 - now.getDay()) % 7)); d.setHours(23, 59, 59, 999); return d }
    const finMois = (now) => new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    function okPeriode(c) {
      if (curPer === 'tous') return true
      if (c.dataset.ongoing === '1') return true
      const ds = c.dataset.date; if (!ds) return false
      const d = new Date(ds + 'T12:00:00'); const now = new Date()
      if (curPer === 'semaine') return d <= finSemaine(now)
      if (curPer === 'mois') return d <= finMois(now)
      if (curPer === 'weekend') { const wd = d.getDay(); return (wd === 0 || wd === 6) && (d - now) <= 7 * 864e5 }
      return true
    }
    const okAge = (c) => curAges.size === 0 || (c.dataset.ages || '').split(' ').some((x) => curAges.has(x))
    const okSieste = (c) => { if (!sieste) return true; const h = parseInt(c.dataset.heure, 10); return isNaN(h) ? false : (h < 13 || h >= 16) }
    const okCourt = (c) => { if (!court) return true; const m = parseInt(c.dataset.dureemin, 10); return isNaN(m) ? false : m <= 45 }
    const okFav = (c) => !favView || favoris.has(c.dataset.id)
    const okSel = (c) => !selection || selection.has(c.dataset.id)
    function okLignes(c) {
      if (curLignes.size === 0) return true
      const ls = (c.dataset.lignes || '').split('|')
      for (const l of ls) if (curLignes.has(l)) return true
      return false
    }
    function appliquer() {
      let n = 0
      cartes.forEach((c) => { const ok = okAge(c) && okPeriode(c) && okLignes(c) && okSieste(c) && okCourt(c) && okFav(c) && okSel(c); c.style.display = ok ? '' : 'none'; if (ok) n++ })
      const v = document.getElementById('aucun'); if (v) v.style.display = n ? 'none' : ''
    }
    function brancher(sel, set) {
      const btns = [...document.querySelectorAll(sel + ' .filtre')]
      btns.forEach((b) => b.addEventListener('click', () => { btns.forEach((x) => x.classList.remove('actif')); b.classList.add('actif'); set(b); appliquer() }))
    }
    const periBtns = [...document.querySelectorAll('#filtres-periode .filtre[data-periode]')]
    periBtns.forEach((b) => b.addEventListener('click', () => { periBtns.forEach((x) => x.classList.remove('actif')); b.classList.add('actif'); curPer = b.dataset.periode; appliquer() }))
    document.querySelectorAll('#filtres-age .filtre').forEach((b) => b.addEventListener('click', () => {
      document.querySelectorAll('#filtres-age .filtre').forEach((x) => x.classList.remove('actif')); b.classList.add('actif')
      const a = b.dataset.age; curAges = a === 'tous' ? new Set() : new Set([a])
      const me = document.getElementById('btn-mes-enfants'); if (me) me.classList.remove('actif')
      appliquer()
    }))
    document.querySelectorAll('.filtre[data-malin]').forEach((b) => b.addEventListener('click', () => {
      b.classList.toggle('actif'); const on = b.classList.contains('actif')
      if (b.dataset.malin === 'sieste') sieste = on; else court = on
      appliquer()
    }))
    function distKm(la1, lo1, la2, lo2) { const R = 6371, r = Math.PI / 180; const dLa = (la2 - la1) * r, dLo = (lo2 - lo1) * r; const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(a)) }
    const btnGeo = document.getElementById('btn-geo'), geoMsg = document.getElementById('geo-msg'), grille = document.getElementById('grille')
    btnGeo.addEventListener('click', () => {
      if (!navigator.geolocation) { geoMsg.textContent = 'Géolocalisation non disponible.'; return }
      geoMsg.textContent = 'Localisation…'
      navigator.geolocation.getCurrentPosition((pos) => {
        userPos = {lat: pos.coords.latitude, lon: pos.coords.longitude}
        btnGeo.classList.add('actif'); geoMsg.textContent = ''
        cartes.forEach((c) => {
          const la = parseFloat(c.dataset.lat), lo = parseFloat(c.dataset.lon), span = c.querySelector('.dist')
          if (!isNaN(la) && !isNaN(lo)) { const d = distKm(userPos.lat, userPos.lon, la, lo); c.dataset.km = d; if (span) span.textContent = ' · ' + (d < 10 ? d.toFixed(1).replace('.', ',') : Math.round(d)) + ' km' }
          else c.dataset.km = ''
        })
        ;[...cartes].sort((a, b) => { const ka = parseFloat(a.dataset.km), kb = parseFloat(b.dataset.km); if (isNaN(ka)) return 1; if (isNaN(kb)) return -1; return ka - kb }).forEach((c) => grille.appendChild(c))
      }, () => { geoMsg.textContent = 'Localisation refusée.' })
    })
    // Ma ligne : ajouter / retirer des lignes
    const ligneInput = document.getElementById('ligne-input')
    const ligneChips = document.getElementById('ligne-chips')
    const dispo = new Set([...document.querySelectorAll('#ligne-list option')].map((o) => o.value))
    function ajouterLigne(l) {
      if (!l || curLignes.has(l) || !dispo.has(l)) return
      curLignes.add(l)
      const chip = document.createElement('span')
      chip.className = 'chip'
      chip.textContent = l + ' '
      const b = document.createElement('button'); b.textContent = '×'; b.setAttribute('aria-label', 'retirer')
      b.addEventListener('click', () => { curLignes.delete(l); chip.remove(); appliquer() })
      chip.appendChild(b); ligneChips.appendChild(chip); appliquer()
    }
    ligneInput.addEventListener('change', () => { ajouterLigne(ligneInput.value.trim()); ligneInput.value = '' })
    ligneInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ajouterLigne(ligneInput.value.trim()); ligneInput.value = '' } })

    // Favoris (cœur)
    const syncFav = (c) => { const b = c.querySelector('.fav'); const on = favoris.has(c.dataset.id); b.textContent = on ? '♥' : '♡'; b.classList.toggle('on', on) }
    cartes.forEach((c) => { const b = c.querySelector('.fav'); if (!b) return; syncFav(c); b.addEventListener('click', () => { const id = c.dataset.id; if (favoris.has(id)) favoris.delete(id); else favoris.add(id); LS.set('aportee-favoris', [...favoris]); syncFav(c); if (favView) appliquer() }) })
    document.getElementById('btn-favoris').addEventListener('click', function () { favView = !favView; this.classList.toggle('actif', favView); appliquer() })

    // Partager la sélection
    document.getElementById('btn-partager').addEventListener('click', () => {
      const msg = document.getElementById('partage-msg')
      if (favoris.size === 0) { msg.textContent = 'Ajoute d’abord des favoris ❤️ à partager.'; return }
      const url = location.origin + location.pathname + '?sel=' + [...favoris].join(',')
      if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {})
      window.open('https://wa.me/?text=' + encodeURIComponent('Ma sélection à portée : ' + url), '_blank')
      msg.textContent = 'Lien copié, et WhatsApp ouvert.'
    })

    // Surprends-moi
    document.getElementById('btn-surprise').addEventListener('click', () => {
      const vis = cartes.filter((c) => c.style.display !== 'none'); if (!vis.length) return
      const c = vis[Math.floor(Math.random() * vis.length)]
      cartes.forEach((x) => x.classList.remove('surprise')); c.classList.add('surprise')
      c.scrollIntoView({behavior: 'smooth', block: 'center'}); setTimeout(() => c.classList.remove('surprise'), 2500)
    })

    // Mes enfants
    const enfantsListe = document.getElementById('enfants-liste'), btnMesEnfants = document.getElementById('btn-mes-enfants')
    const ageBtns = [...document.querySelectorAll('#filtres-age .filtre')]
    function renderEnfants() {
      enfantsListe.innerHTML = ''
      enfants.forEach((enf, idx) => {
        const age = anneeCourante - enf.naissance
        const chip = document.createElement('span'); chip.className = 'chip'; chip.textContent = enf.nom + ' ' + age + ' ans '
        const b = document.createElement('button'); b.textContent = '×'; b.addEventListener('click', () => { enfants.splice(idx, 1); LS.set('aportee-enfants', enfants); renderEnfants() })
        chip.appendChild(b); enfantsListe.appendChild(chip)
      })
      btnMesEnfants.style.display = enfants.length ? '' : 'none'
    }
    document.getElementById('btn-ajout-enfant').addEventListener('click', () => {
      const nom = prompt('Prénom de l’enfant ?'); if (!nom) return
      const age = parseInt(prompt('Son âge, en années ?'), 10); if (isNaN(age)) return
      enfants.push({nom: nom.trim(), naissance: anneeCourante - age}); LS.set('aportee-enfants', enfants); renderEnfants()
    })
    btnMesEnfants.addEventListener('click', function () {
      const on = !this.classList.contains('actif'); this.classList.toggle('actif', on)
      if (on) { const s = new Set(); enfants.forEach((enf) => tranchesAge(anneeCourante - enf.naissance).forEach((t) => s.add(t))); curAges = s; ageBtns.forEach((x) => x.classList.remove('actif')) }
      else { curAges = new Set(); const tb = ageBtns.find((x) => x.dataset.age === 'tous'); if (tb) tb.classList.add('actif') }
      appliquer()
    })
    renderEnfants()

    // Ajouter à mon agenda (.ics)
    const slug = (s) => (s || 'evenement').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 40)
    cartes.forEach((c) => {
      const b = c.querySelector('.ics'); if (!b) return
      b.addEventListener('click', () => {
        const start = c.dataset.start; const d = start ? new Date(start) : null
        if (!d || isNaN(d)) { alert('Date à confirmer pour cet événement.'); return }
        const dm = parseInt(c.dataset.dureemin, 10); const end = new Date(d.getTime() + (isNaN(dm) ? 60 : dm) * 60000)
        const fmt = (x) => { const s = x.toISOString().replace(/[-:]/g, ''); const i = s.indexOf('.'); return (i < 0 ? s : s.slice(0, i)) + 'Z' }
        const bs = String.fromCharCode(92), crlf = String.fromCharCode(13, 10)
        const esc = (s) => String(s || '').split(bs).join(bs + bs).split(',').join(bs + ',').split(';').join(bs + ';')
        const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//a portee//FR', 'BEGIN:VEVENT', 'UID:' + c.dataset.id + '@aportee', 'DTSTAMP:' + fmt(new Date()), 'DTSTART:' + fmt(d), 'DTEND:' + fmt(end), 'SUMMARY:' + esc(c.dataset.titre), 'LOCATION:' + esc(c.dataset.lieu), 'END:VEVENT', 'END:VCALENDAR'].join(crlf)
        const blob = new Blob([ics], {type: 'text/calendar'}); const u = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = u; a.download = slug(c.dataset.titre) + '.ics'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u)
      })
    })

    // Sélection partagée reçue par lien (?sel=)
    const params = new URLSearchParams(location.search)
    if (params.get('sel')) { selection = new Set(params.get('sel').split(',').filter(Boolean)); document.getElementById('banniere-selection').style.display = '' }
    appliquer()
  </script>
</body>
</html>`

writeFileSync(new URL('./index.html', import.meta.url), html, 'utf8')
console.log(`Site V5 « vibration » généré : ${evenements.length} événement(s) publié(s).`)
