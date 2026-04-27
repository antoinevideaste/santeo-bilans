import { useState, useRef } from "react";

// ── Constants ─────────────────────────────────────────────────────
const C = {
  bg:"#090F1C", bg2:"#0D1627", card:"#111C30",
  border:"#1C2E4A", gold:"#C8A84B", goldL:"#E2C472",
  blue:"#4B8EC8", red:"#D95B5B", text:"#D4E4F4",
  dim:"#6A8AAA", white:"#EEF6FF", green:"#52C878",
};

const STEPS = [
  {label:"Identité",icon:"👤"},{label:"Musculaire",icon:"💪"},
  {label:"Mesures",icon:"📐"},{label:"Interprétations",icon:"📝"},
  {label:"Plaintes",icon:"💬"},{label:"Programme",icon:"🎯"},
  {label:"Annexe Bassin",icon:"🦴"},{label:"Annexe Genoux",icon:"🦵"},
  {label:"Annexe Lombaires",icon:"🔩"},{label:"Annexe Dorsales",icon:"🔝"},
  {label:"Générer",icon:"✨"},
];

const MESURES = [
  {id:"m1", label:"Hauteur d\u2019\u00e9paules",            norme:"[0\u20131\u00b0]",  normVal:1  },
  {id:"m2", label:"Rotation du bassin",                      norme:"[0\u20133\u00b0]",  normVal:3  },
  {id:"m3", label:"Angle du genou Droit",                    norme:"[0\u20131\u00b0]",  normVal:1  },
  {id:"m4", label:"Angle du genou Gauche",                   norme:"[0\u20131\u00b0]",  normVal:1  },
  {id:"m5", label:"Posture de la t\u00eate",                 norme:"[\u223c11\u00b0]",  normVal:11 },
  {id:"m6", label:"Inclinaison du bassin",                   norme:"[0\u20131\u00b0]",  normVal:1  },
  {id:"m7", label:"Courbure thoracique",                     norme:"[\u223c36\u00b0]",  normVal:36 },
  {id:"m8", label:"Lordose lombaire",                        norme:"[\u223c35\u00b0]",  normVal:35 },
  {id:"m9", label:"Genou en arri\u00e8re (r\u00e9curvatum)",norme:"[0\u20132\u00b0]",  normVal:2  },
  {id:"m10",label:"\u00c9paules enroul\u00e9es",            norme:"[\u223c5\u00b0]",   normVal:5  },
  {id:"m11",label:"D\u00e9viation col. vert. (scoliose)",   norme:"\u2014",            normVal:999},
  {id:"m12",label:"\u00c9l\u00e9vation du bassin",          norme:"[0\u20131\u00b0]",  normVal:1  },
];

// ── PDF helpers ───────────────────────────────────────────────────
async function fileToB64(imgObj) {
  if (!imgObj?.file) return null;
  return new Promise(res => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.readAsDataURL(imgObj.file);
  });
}

async function collectImgs(d) {
  const map = {
    mf: d.musculaire?.face,   md: d.musculaire?.dos,
    aa: d.mesures?.ant,       as: d.mesures?.sag,    ap: d.mesures?.post,
    bb: d.bassin?.bascule_s,  br: d.bassin?.rotation_s, be: d.bassin?.elevation_s,
    bm: d.bassin?.bascule_m,  bn: d.bassin?.rotation_m, bo: d.bassin?.elevation_m,
    gd: d.genoux?.droit_s,    gg: d.genoux?.gauche_s,   gr: d.genoux?.recurv_s,
    gm: d.genoux?.droit_m,    gn: d.genoux?.gauche_m,   go: d.genoux?.recurv_m,
    ls: d.lombaires?.schema,  lb: d.lombaires?.bleu,     lr: d.lombaires?.rouge,
    de: d.dorsales?.epaules_s,di: d.dorsales?.enroul_s,  dc: d.dorsales?.cervical_s,
    dk: d.dorsales?.courb_s,  db: d.dorsales?.bleu,      dr: d.dorsales?.rouge,
  };
  const out = {};
  await Promise.all(Object.entries(map).map(async ([k,v]) => {
    out[k] = await fileToB64(v);
  }));
  return out;
}

function mColor(id, val) {
  const norms = {m1:1,m2:3,m3:1,m4:1,m5:11,m6:1,m7:36,m8:35,m9:2,m10:5,m11:999,m12:1};
  const v = parseFloat(val); const n = norms[id];
  if (!val||isNaN(v)) return "#6A8AAA";
  if (v <= n) return "#52C878";
  if (v <= n*1.6) return "#C8A84B";
  return "#D95B5B";
}

function imgTag(src, style="") {
  if (!src) return `<div style="background:#1C2E4A;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#6A8AAA;font-size:11px;${style}">Aucune image</div>`;
  return `<img src="${src}" style="object-fit:contain;border-radius:6px;${style}">`;
}

function nl2p(text) {
  if (!text) return "<p style='color:#6A8AAA;font-style:italic'>Non renseigné</p>";
  return text.split("\n").filter(l=>l.trim()).map(l=>`<p>${l}</p>`).join("");
}

function buildPDFHTML(d, imgs) {
  const nom = `${d.identite?.prenom||""} ${d.identite?.nom||""}`.trim();
  const date = d.identite?.date || "";
  const vals = d.mesures?.vals || {};
  const interp = d.interp || {};
  const prog = d.programme || {};
  const plaintes = (d.plaintes?.plaintes||[]).filter(p=>p.citation);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&family=DM+Mono:wght@400;500&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#090F1C;font-family:'DM Sans',sans-serif;color:#D4E4F4}
    .page{width:210mm;min-height:297mm;background:#090F1C;page-break-after:always;position:relative;overflow:hidden;display:flex;flex-direction:column}
    .ph{background:#0D1627;border-bottom:2px solid #C8A84B;padding:10px 22px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
    .ph-brand{font-size:12px;font-weight:700;color:#C8A84B;letter-spacing:.03em}
    .ph-sub{font-size:9px;color:#6A8AAA;margin-top:2px}
    .ph-contact{text-align:right;font-size:9px;color:#6A8AAA;line-height:1.7}
    .pf{background:#0D1627;border-top:1px solid #1C2E4A;padding:8px 22px;display:flex;justify-content:space-between;align-items:center;font-size:8px;color:#6A8AAA;margin-top:auto;flex-shrink:0}
    .pf-name{font-weight:600;color:#C8A84B;font-size:9px}
    .pb{padding:18px 22px 0;flex:1}
    .st{display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #1C2E4A}
    .sn{width:22px;height:22px;border-radius:50%;background:#C8A84B;color:#090F1C;font-weight:800;font-size:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:'DM Mono',monospace}
    .sl{font-size:11px;font-weight:700;color:#C8A84B;letter-spacing:.06em;text-transform:uppercase;font-family:'DM Mono',monospace}
    .card{background:#111C30;border:1px solid #1C2E4A;border-radius:8px;padding:14px;margin-bottom:12px}
    .card-title{font-size:11px;font-weight:700;color:#6AAEE8;display:flex;align-items:center;gap:6px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #1C2E4A}
    .card-title::before{content:'';width:3px;height:14px;background:#4B8EC8;border-radius:2px;display:inline-block}
    .card p{font-size:9.5px;line-height:1.75;color:#D4E4F4;margin-bottom:7px}
    .card ul{padding-left:14px;margin:6px 0}
    .card ul li{font-size:9.5px;line-height:1.7;color:#D4E4F4;margin-bottom:2px}
    .summary{background:rgba(200,168,75,.07);border:1px solid rgba(200,168,75,.2);border-radius:6px;padding:10px 12px;margin-top:8px}
    .summary p{font-size:9.5px;color:#E2C472;margin:0;line-height:1.7}
    .info-box{background:rgba(75,142,200,.08);border:1px solid rgba(75,142,200,.2);border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:9px;color:rgba(110,174,232,.9);line-height:1.6}
    .img-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
    .img-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px}
    .img-wrap{background:#111C30;border:1px solid #1C2E4A;border-radius:7px;padding:6px;text-align:center}
    .img-wrap img{width:100%;height:140px;object-fit:contain;border-radius:5px}
    .img-label{font-size:8px;font-weight:600;color:#C8A84B;text-transform:uppercase;letter-spacing:.08em;margin-top:5px;font-family:'DM Mono',monospace}
    .img-wrap-sm img{height:95px}
    .measures-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
    .m-row{display:flex;align-items:center;gap:8px;padding:5px 10px;background:#111C30;border:1px solid #1C2E4A;border-radius:6px;margin-bottom:5px}
    .m-label{flex:1;font-size:10px;color:#D4E4F4}
    .m-norm{font-size:9px;color:#6A8AAA;font-family:'DM Mono',monospace;white-space:nowrap}
    .m-val{font-weight:700;font-size:13px;font-family:'DM Mono',monospace;min-width:28px;text-align:right}
    .tag{display:inline-block;padding:3px 9px;border-radius:4px;font-size:8.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin:6px 0 4px}
    .tag-e{background:rgba(75,142,200,.15);color:#6AAEE8;border:1px solid rgba(75,142,200,.3)}
    .tag-r{background:rgba(217,91,91,.12);color:#F07070;border:1px solid rgba(217,91,91,.25)}
    .tag-m{background:rgba(82,200,120,.12);color:#7EE07E;border:1px solid rgba(82,200,120,.25)}
    .prog-block{background:#111C30;border:1px solid #1C2E4A;border-radius:8px;margin-bottom:12px;overflow:hidden}
    .prog-header{padding:10px 14px;background:rgba(200,168,75,.1);border-bottom:1px solid rgba(200,168,75,.2);font-size:11px;font-weight:700;color:#C8A84B}
    .prog-body{padding:12px 14px}
    .prog-body p{font-size:9.5px;color:#D4E4F4;line-height:1.7;margin-bottom:5px}
    .quote-box{background:rgba(75,142,200,.08);border-left:3px solid #4B8EC8;border-radius:0 6px 6px 0;padding:9px 12px;margin-bottom:12px;font-size:10px;color:#6AAEE8;font-style:italic;line-height:1.6}
    .annex-imgs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px}
    .annex-cell{background:#111C30;border:1px solid #1C2E4A;border-radius:7px;padding:7px;text-align:center}
    .annex-cell img{width:100%;height:85px;object-fit:contain}
    .annex-cell .av{font-family:'DM Mono',monospace;font-size:18px;font-weight:700;color:#C8A84B;margin-top:4px}
    .annex-cell .al{font-size:7.5px;color:#6A8AAA;margin-top:2px;line-height:1.4}
    .annex-muscles{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
    .annex-m-cell{background:#111C30;border:1px solid #1C2E4A;border-radius:7px;padding:8px;display:flex;gap:8px;align-items:flex-start}
    .annex-m-cell img{width:60px;height:80px;object-fit:contain;flex-shrink:0}
    .annex-m-title{font-size:8.5px;font-weight:600;margin-bottom:4px;padding-bottom:3px;border-bottom:1px solid #1C2E4A}
    .annex-m-title.red{color:#F07070}.annex-m-title.blue{color:#6AAEE8}
    .annex-m-list{list-style:none;padding:0}
    .annex-m-list li{font-size:8px;line-height:1.6;color:#D4E4F4;display:flex;align-items:center;gap:4px}
    .annex-m-list li::before{content:'';width:4px;height:4px;border-radius:50%;flex-shrink:0;background:#C8A84B}
    @media print{
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .page{page-break-after:always}
    }
  `;

  const header = () => `
    <div class="ph">
      <div><div class="ph-brand">Ostéopathie SANTEO</div><div class="ph-sub">Santé Holistique</div></div>
      <div class="ph-contact"><span>+262 692 22 76 60</span><br><span>pg.osteoptahe@gmail.com</span></div>
    </div>`;

  const footer = () => `
    <div class="pf"><span class="pf-name">PAYET Guillaume · Ostéopathe D.O</span><span>+262 692 22 76 60 · pg.osteoptahe@gmail.com</span></div>`;

  const sectionTitle = (num, title) => `
    <div class="st"><div class="sn">${num}</div><div class="sl">${title}</div></div>`;

  // ── Page 1: Cover ──
  const cover = `<div class="page" style="background:linear-gradient(160deg,#090F1C 0%,#0D1A2E 100%)">
    <div style="padding:18px 28px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1C2E4A;background:#0D1627">
      <div><span style="font-size:16px;font-weight:700;color:#EEF6FF">Ostéopathie <span style="color:#C8A84B">SANTEO</span></span><br><span style="font-size:9px;color:#6A8AAA;letter-spacing:.1em;text-transform:uppercase">Santé Holistique</span></div>
      <div style="text-align:right;font-size:9px;color:#6A8AAA;line-height:1.8"><span>+262 692 22 76 60</span><br><span>pg.osteoptahe@gmail.com</span></div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px">
      <div style="background:rgba(200,168,75,.12);border:1px solid #C8A84B;color:#C8A84B;font-size:9px;letter-spacing:.15em;text-transform:uppercase;font-weight:700;padding:5px 18px;border-radius:30px;margin-bottom:22px">Bilan Ostéopathique</div>
      <div style="font-family:'DM Serif Display',serif;font-size:48px;color:#EEF6FF;letter-spacing:-.03em;text-align:center;line-height:1;margin-bottom:6px">Étude<br>Posturale</div>
      <div style="font-size:13px;color:#6A8AAA;text-align:center;margin-bottom:32px;letter-spacing:.05em">Synthèse visuelle globale</div>
      <div style="width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(75,142,200,.15) 0%,rgba(200,168,75,.08) 50%,transparent 70%);display:flex;align-items:center;justify-content:center;margin-bottom:32px">
        <div style="font-size:80px">🧍</div>
      </div>
      <div style="width:50px;height:3px;background:linear-gradient(90deg,#C8A84B,#4B8EC8);border-radius:2px;margin-bottom:24px"></div>
      <div style="font-family:'DM Serif Display',serif;font-size:32px;color:#EEF6FF;text-align:center;margin-bottom:6px">${nom}</div>
      <div style="font-size:12px;color:#6A8AAA;text-align:center">${date}</div>
    </div>
    <div style="padding:14px 28px;background:#0D1627;border-top:1px solid #1C2E4A;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-size:12px;font-weight:700;color:#EEF6FF">PAYET Guillaume</div><div style="font-size:10px;color:#6A8AAA;margin-top:2px">Ostéopathe D.O</div></div>
      <div style="text-align:right;font-size:10px;color:#6A8AAA;line-height:1.8"><span>+262 692 22 76 60</span><br><span>pg.osteoptahe@gmail.com</span></div>
    </div>
  </div>`;

  // ── Page 2: Disclaimer ──
  const disclaimer = `<div class="page">${header()}<div class="pb">
    <div style="background:#111C30;border:1px solid #1C2E4A;border-radius:8px;padding:26px;margin-top:8px">
      <div style="font-size:14px;font-weight:700;color:#C8A84B;text-align:center;letter-spacing:.1em;text-transform:uppercase;margin-bottom:22px;padding-bottom:14px;border-bottom:1px solid #1C2E4A">⚠ À lire attentivement</div>
      ${[
        ["🔬","Ce bilan postural a été réalisé dans le cadre de la prise en charge ostéopathique du patient, à l'aide du dispositif <strong>MOTIPHYSIO2</strong>, qui permet une évaluation instrumentée et objective de l'alignement corporel, des appuis au sol et des compensations musculo-squelettiques."],
        ["👨‍⚕️","Les observations partagées ici ne se substituent en aucun cas à l'expertise des professionnels impliqués dans le parcours de soin du patient, mais peuvent, le cas échéant, offrir un éclairage complémentaire dans une logique de prise en charge pluridisciplinaire."],
        ["⚕️","Ces données ne constituent en aucun cas un <strong>diagnostic médical</strong> et ne peuvent s'y substituer. Toute interprétation ou orientation thérapeutique relevant du champ médical reste strictement du ressort du médecin."],
        ["🔒","Le patient atteste avoir été informé et consent à la réalisation de ce bilan. Les informations recueillies sont couvertes par le <strong>secret professionnel</strong> et sont strictement confidentielles."],
      ].map(([icon,text])=>`
        <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:18px">
          <div style="width:30px;height:30px;border-radius:7px;background:rgba(200,168,75,.12);border:1px solid rgba(200,168,75,.3);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${icon}</div>
          <p style="font-size:10px;color:#6A8AAA;line-height:1.75;font-style:italic;margin:4px 0 0">${text}</p>
        </div>`).join("")}
    </div>
  </div>${footer()}</div>`;

  // ── Page 3: Bilan musculaire ──
  const musculaire = `<div class="page">${header()}<div class="pb">
    ${sectionTitle(1,"Observation des déséquilibres musculaires · Plan antéro-postérieur")}
    <div class="img-grid-2">
      <div class="img-wrap">${imgTag(imgs.mf,"width:100%;height:155px;object-fit:contain;border-radius:5px")}<div class="img-label">Plan antérieur — de face</div></div>
      <div class="img-wrap">${imgTag(imgs.md,"width:100%;height:155px;object-fit:contain;border-radius:5px")}<div class="img-label">Plan postérieur — de dos</div></div>
    </div>
    <div class="info-box">ℹ️ Les muscles en <strong style="color:#F07070">rouge</strong> sont trop sollicités pour maintenir l'équilibre. Les muscles en <strong style="color:#6AAEE8">bleu</strong> sont inhibés et ne jouent pas suffisamment leur rôle postural.</div>
  </div>${footer()}</div>`;

  // ── Page 4: Mesures articulaires ──
  const mesuresPage = `<div class="page">${header()}<div class="pb">
    ${sectionTitle(2,"Observation des déséquilibres articulaires · Plan antérieur – sagittal – postérieur")}
    <div class="img-grid-3" style="margin-bottom:12px">
      <div class="img-wrap img-wrap-sm">${imgTag(imgs.aa,"width:100%;height:95px;object-fit:contain;border-radius:5px")}<div class="img-label">Antérieur</div></div>
      <div class="img-wrap img-wrap-sm">${imgTag(imgs.as,"width:100%;height:95px;object-fit:contain;border-radius:5px")}<div class="img-label">Sagittal</div></div>
      <div class="img-wrap img-wrap-sm">${imgTag(imgs.ap,"width:100%;height:95px;object-fit:contain;border-radius:5px")}<div class="img-label">Postérieur</div></div>
    </div>
    <div class="measures-grid">
      ${MESURES.map(m=>{
        const v = vals[m.id]; const col = mColor(m.id,v);
        return `<div class="m-row"><span class="m-label">${m.label}</span><span class="m-norm">${m.norme}</span><span class="m-val" style="color:${col}">${v||"—"}${v?"°":""}</span></div>`;
      }).join("")}
    </div>
  </div>${footer()}</div>`;

  // ── Page 5: Interprétations ──
  const interpPage = `<div class="page">${header()}<div class="pb">
    ${sectionTitle(3,"Interprétation détaillée · Genoux, bassin, lombaires, dorsales et cervicales")}
    <div class="card"><div class="card-title">Genoux</div>${nl2p(interp.genoux)}</div>
    <div class="card"><div class="card-title">Bassin</div>${nl2p(interp.bassin)}</div>
    <div class="card"><div class="card-title">Lombaires</div>${nl2p(interp.lombaires)}</div>
  </div>${footer()}</div>
  <div class="page">${header()}<div class="pb">
    ${sectionTitle(3,"Interprétation détaillée · Dorsales et cervicales")}
    <div class="card"><div class="card-title">Dorsales et cervicales</div>${nl2p(interp.dorsales)}</div>
  </div>${footer()}</div>`;

  // ── Page(s): Plaintes & Réponses ──
  const plaintesPages = plaintes.map(p=>`<div class="page">${header()}<div class="pb">
    ${sectionTitle(4,"Réponses aux problématiques")}
    <div class="quote-box">&laquo;&nbsp;${p.citation}&nbsp;&raquo;</div>
    <div class="card">${nl2p(p.reponse)}</div>
  </div>${footer()}</div>`).join("") || `<div class="page">${header()}<div class="pb">
    ${sectionTitle(4,"Réponses aux problématiques")}
    <div class="info-box">Aucune plainte renseignée.</div>
  </div>${footer()}</div>`;

  // ── Page: Programme ──
  const programmePage = `<div class="page">${header()}<div class="pb">
    ${sectionTitle(5,"Axes d'améliorations")}
    <div class="prog-block">
      <div class="prog-header">A &mdash; Rééquilibrage du bassin, zone lombaire et genoux</div>
      <div class="prog-body">
        ${prog.objA?`<p style="color:#6A8AAA;font-style:italic;margin-bottom:10px">${prog.objA}</p>`:""}
        ${prog.etirerA?`<div class="tag tag-e">Étirer</div>${nl2p(prog.etirerA)}`:""}
        ${prog.renforcerA?`<div class="tag tag-r">Renforcer</div>${nl2p(prog.renforcerA)}`:""}
        ${prog.mobiliteA?`<div class="tag tag-m">Mobilité</div>${nl2p(prog.mobiliteA)}`:""}
        ${prog.resultatA?`<div class="summary">${nl2p(prog.resultatA)}</div>`:""}
      </div>
    </div>
    <div class="prog-block">
      <div class="prog-header" style="color:#6AAEE8;background:rgba(75,142,200,.1);border-color:rgba(75,142,200,.2)">B &mdash; Rééquilibrer le haut du corps</div>
      <div class="prog-body">
        ${prog.objB?`<p style="color:#6A8AAA;font-style:italic;margin-bottom:10px">${prog.objB}</p>`:""}
        ${prog.etirerB?`<div class="tag tag-e">Étirer</div>${nl2p(prog.etirerB)}`:""}
        ${prog.renforcerB?`<div class="tag tag-r">Renforcer</div>${nl2p(prog.renforcerB)}`:""}
        ${prog.resultatB?`<div class="summary">${nl2p(prog.resultatB)}</div>`:""}
      </div>
    </div>
  </div>${footer()}</div>`;

  // ── Annexes ──
  const annexeImgRow = (imgs3, vals3, labels3) => `
    <div class="annex-imgs">
      ${imgs3.map((src,i)=>`<div class="annex-cell">${src?`<img src="${src}">`:`<div style="height:85px;background:#1C2E4A;border-radius:5px;display:flex;align-items:center;justify-content:center;color:#6A8AAA;font-size:10px">Aucune image</div>`}<div class="av">${vals3[i]}</div><div class="al">${labels3[i]}</div></div>`).join("")}
    </div>`;

  const annexeMusRow = (muscles3) => `
    <div class="annex-muscles">
      ${muscles3.map(m=>`<div class="annex-m-cell">
        ${m.src?`<img src="${m.src}">`:`<div style="width:60px;height:80px;background:#1C2E4A;border-radius:5px;flex-shrink:0"></div>`}
        <div style="flex:1;min-width:0">
          <div class="annex-m-title ${m.type}">${m.type==="red"?"🔴 Sollicités":"🔵 Inhibés"}</div>
          <ul class="annex-m-list">${(m.list||[]).map(l=>`<li>${l}</li>`).join("")}</ul>
        </div>
      </div>`).join("")}
    </div>`;

  const bassinAnnexe = `<div class="page">${header()}<div class="pb">
    <div class="st"><div class="sl">Annexe &mdash; Observation détaillée : Bassin</div></div>
    ${annexeImgRow(
      [imgs.bb,imgs.br,imgs.be],
      [vals.m6?vals.m6+"°":"—", vals.m2?vals.m2+"°":"—", vals.m12?vals.m12+"°":"—"],
      ["Bascule en avant","Rotation du bassin","Élévation du bassin"]
    )}
    ${annexeMusRow([
      {src:imgs.bm, type:"red",  list:["Quadriceps","Ischio-jambiers","Psoas iliaques","Paravertébraux"]},
      {src:imgs.bn, type:"red",  list:["TFL Droite","Obliques interne Droit","Obliques externe Gauche"]},
      {src:imgs.bo, type:"blue", list:["Grand droit de l'abdomen","Grand et moyen fessiers","Obliques"]},
    ])}
  </div>${footer()}</div>`;

  const genouxAnnexe = `<div class="page">${header()}<div class="pb">
    <div class="st"><div class="sl">Annexe &mdash; Observation détaillée : Genoux</div></div>
    ${annexeImgRow(
      [imgs.gd,imgs.gg,imgs.gr],
      [vals.m3?vals.m3+"°":"—", vals.m4?vals.m4+"°":"—", vals.m9?vals.m9+"°":"—"],
      ["Angle genou Droit","Angle genou Gauche","Récurvatum"]
    )}
    ${annexeMusRow([
      {src:imgs.gm, type:"red",  list:["Biceps fémorale","Semi-tendineux","Semi-membraneux","TFL"]},
      {src:imgs.gn, type:"red",  list:["Biceps fémorale","Semi-tendineux","Semi-membraneux","TFL"]},
      {src:imgs.go, type:"blue", list:["Fessiers grand et moyen","Gastrocnémien (Mollet)"]},
    ])}
  </div>${footer()}</div>`;

  const lombairesAnnexe = `<div class="page">${header()}<div class="pb">
    <div class="st"><div class="sl">Annexe &mdash; Observation détaillée : Lombaires</div></div>
    <div style="text-align:center;margin-bottom:14px">
      <div class="annex-cell" style="display:inline-block;min-width:160px">${imgs.ls?`<img src="${imgs.ls}" style="height:110px;max-width:140px;object-fit:contain">`:`<div style="height:110px;background:#1C2E4A;border-radius:5px;display:flex;align-items:center;justify-content:center;color:#6A8AAA;font-size:10px;width:140px">Aucune image</div>`}<div class="av">${vals.m8?vals.m8+"°":"—"}</div><div class="al">Augmentation de la cambrure lombaire</div></div>
    </div>
    ${annexeMusRow([
      {src:imgs.lr, type:"red",  list:["Quadriceps (Droit fémorale)","Psoas-iliaque","TFL","Paravertébraux"]},
      {src:imgs.lb, type:"blue", list:["Fessiers grand et moyen","Grand droit de l'abdomen","Obliques interne et externe"]},
      {src:null,    type:"blue", list:[]},
    ])}
  </div>${footer()}</div>`;

  const dorsalesAnnexe = `<div class="page">${header()}<div class="pb">
    <div class="st"><div class="sl">Annexe &mdash; Observation détaillée : Dorsales et cervicales</div></div>
    ${annexeImgRow(
      [imgs.de,imgs.di,imgs.dc,imgs.dk].slice(0,3),
      [vals.m1?vals.m1+"°":"—", vals.m10?vals.m10+"°":"—", vals.m5?vals.m5+"°":"—"],
      ["Abaissement épaules","Enroulement avant","Rachis cervical"]
    )}
    <div style="margin-bottom:10px;text-align:center">
      <div class="annex-cell" style="display:inline-block;min-width:140px">${imgs.dk?`<img src="${imgs.dk}" style="height:80px;max-width:130px;object-fit:contain">`:`<div style="height:80px;background:#1C2E4A;border-radius:5px;width:130px;display:flex;align-items:center;justify-content:center;color:#6A8AAA;font-size:10px">Aucune image</div>`}<div class="av">${vals.m7?vals.m7+"°":"—"}</div><div class="al">Courbure dorsale</div></div>
    </div>
    ${annexeMusRow([
      {src:imgs.dr, type:"red",  list:["SCOM","Élévateur de la scapula","Trapèze supérieur","Pectoraux"]},
      {src:imgs.db, type:"blue", list:["Trapèze moyen et inférieur","Rhomboïdes","Grand dorsal","Supra et infra épineux","Ronds"]},
      {src:null,    type:"blue", list:[]},
    ])}
  </div>${footer()}</div>`;

  return `<!DOCTYPE html><html lang="fr"><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bilan Postural \u2014 ${nom}</title>
  <style>${CSS}</style>
  </head>
  <body>
    ${cover}${disclaimer}${musculaire}${mesuresPage}${interpPage}${plaintesPages}${programmePage}${bassinAnnexe}${genouxAnnexe}${lombairesAnnexe}${dorsalesAnnexe}
    <div style="position:fixed;top:0;left:0;right:0;background:#0D1627;border-bottom:2px solid #C8A84B;padding:12px 24px;display:flex;justify-content:space-between;align-items:center;z-index:9999" id="printbar">
      <span style="color:#C8A84B;font-weight:700;font-family:sans-serif;font-size:13px">Bilan de ${nom} prêt !</span>
      <button onclick="window.print();document.getElementById('printbar').style.display='none'" style="background:linear-gradient(135deg,#C8A84B,#E2C472);border:none;border-radius:7px;color:#090F1C;font-weight:700;font-size:13px;padding:8px 22px;cursor:pointer">
        🖨 Enregistrer en PDF
      </button>
    </div>
    <div style="height:60px"></div>
  </body></html>`;
}

// ── Shared UI ─────────────────────────────────────────────────────
function StepTitle({num,children}) {
  return <div style={{marginBottom:22}}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
      <div style={{width:26,height:26,borderRadius:"50%",background:C.gold,color:C.bg,fontWeight:800,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{num}</div>
      <h2 style={{margin:0,fontSize:16,fontWeight:700,color:C.white,fontFamily:"Georgia,serif"}}>{children}</h2>
    </div>
    <div style={{marginLeft:36,height:1,background:C.border}}/>
  </div>;
}

function Info({children}) {
  return <div style={{padding:"9px 13px",borderRadius:7,marginBottom:16,background:C.blue+"10",border:`1px solid ${C.blue}30`,fontSize:11,color:C.blue+"CC",lineHeight:1.65}}>ℹ️ {children}</div>;
}

function Lbl({children,required}) {
  return <div style={{fontSize:10,fontWeight:700,color:C.gold,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:5,fontFamily:"monospace"}}>{children}{required&&<span style={{color:C.red}}> *</span>}</div>;
}

function TI({label,value,onChange,placeholder,required}) {
  const [f,setF]=useState(false);
  return <div style={{marginBottom:15}}>
    <Lbl required={required}>{label}</Lbl>
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{width:"100%",padding:"9px 12px",borderRadius:7,fontSize:13,background:C.bg+"CC",color:C.text,fontFamily:"inherit",outline:"none",border:`1px solid ${f?C.gold+"70":C.border}`,transition:"border .2s",boxSizing:"border-box"}}/>
  </div>;
}

function TA({label,value,onChange,placeholder,hint,rows=5,required}) {
  const [f,setF]=useState(false);
  return <div style={{marginBottom:18}}>
    <Lbl required={required}>{label}</Lbl>
    {hint&&<div style={{fontSize:10.5,color:C.dim,marginBottom:6,lineHeight:1.5}}>{hint}</div>}
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
      onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{width:"100%",padding:"10px 13px",borderRadius:7,fontSize:12.5,background:C.bg+"CC",color:C.text,fontFamily:"inherit",outline:"none",border:`1px solid ${f?C.gold+"70":C.border}`,resize:"vertical",transition:"border .2s",boxSizing:"border-box",lineHeight:1.7}}/>
    <div style={{textAlign:"right",fontSize:10,color:C.dim+"80",marginTop:3}}>{value.length} car.</div>
  </div>;
}

function ImgSlot({label,hint,value,onChange}) {
  const ref=useRef();
  const [drag,setDrag]=useState(false);
  const handle=f=>{if(!f||!f.type.startsWith("image/"))return;onChange({file:f,preview:URL.createObjectURL(f)});};
  return <div style={{marginBottom:8}}>
    <div style={{fontSize:10,fontWeight:600,color:C.gold+"CC",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4,fontFamily:"monospace"}}>{label}</div>
    {hint&&<div style={{fontSize:9.5,color:C.dim,marginBottom:4,lineHeight:1.4}}>{hint}</div>}
    <div onClick={()=>!value&&ref.current?.click()}
      onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0]);}}
      style={{border:`1.5px dashed ${value?C.gold+"60":drag?C.gold:C.border}`,borderRadius:8,background:value?C.gold+"08":drag?C.gold+"05":C.bg+"80",cursor:value?"default":"pointer",minHeight:value?"auto":72,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",transition:"all .2s",position:"relative"}}>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handle(e.target.files[0])}/>
      {value?(<div style={{width:"100%",position:"relative"}}>
        <img src={value.preview} alt={label} style={{width:"100%",display:"block",borderRadius:7,maxHeight:105,objectFit:"cover"}}/>
        <button onClick={e=>{e.stopPropagation();onChange(null);}} style={{position:"absolute",top:4,right:4,width:18,height:18,background:"#000A",border:"none",borderRadius:"50%",color:"#fff",cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>):(
        <div style={{textAlign:"center",padding:"10px 8px"}}>
          <div style={{fontSize:20,marginBottom:3,opacity:.4}}>📷</div>
          <div style={{fontSize:9.5,color:C.dim}}>Cliquer ou déposer</div>
        </div>
      )}
    </div>
  </div>;
}

function MRow({label,norme,normVal,value,onChange}) {
  const [f,setF]=useState(false);
  const n=parseFloat(value);
  const col=!value?"#6A8AAA":n<=normVal?C.green:n<=normVal*1.6?C.gold:C.red;
  return <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:f?C.gold+"07":C.bg+"80",border:`1px solid ${f?C.gold+"40":C.border}`,borderRadius:7,marginBottom:5,transition:"all .2s"}}>
    <div style={{flex:1,fontSize:11,color:C.text}}>{label}</div>
    <div style={{fontSize:9,color:C.dim,fontFamily:"monospace",whiteSpace:"nowrap"}}>{norme}</div>
    <input type="number" value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} placeholder="0"
      style={{width:48,padding:"4px 5px",borderRadius:5,fontSize:13,background:C.card,color:col,fontFamily:"monospace",fontWeight:700,border:`1px solid ${C.border}`,outline:"none",textAlign:"center"}}/>
    <span style={{fontSize:12,color:col,fontWeight:700}}>°</span>
  </div>;
}

// ── Steps ─────────────────────────────────────────────────────────
function S1({d,s}) {
  return <div>
    <StepTitle num="1">Identité du patient</StepTitle>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
      <TI label="Prénom" value={d.prenom} onChange={v=>s({...d,prenom:v})} placeholder="Nicolas" required/>
      <TI label="Nom" value={d.nom} onChange={v=>s({...d,nom:v})} placeholder="Manicom" required/>
    </div>
    <TI label="Date de séance" value={d.date} onChange={v=>s({...d,date:v})} placeholder="27 avril 2025" required/>
  </div>;
}

function S2({d,s}) {
  return <div>
    <StepTitle num="2">Bilan musculaire</StepTitle>
    <Info>2 screenshots "Déséquilibres musculaires" de votre machine : corps de face et corps de dos.</Info>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <ImgSlot label="Corps de FACE" hint="Muscles colorés, vue frontale" value={d.face} onChange={v=>s({...d,face:v})}/>
      <ImgSlot label="Corps de DOS" hint="Muscles colorés, vue dorsale" value={d.dos} onChange={v=>s({...d,dos:v})}/>
    </div>
  </div>;
}

function S3({d,s}) {
  const v=d.vals||{};
  return <div>
    <StepTitle num="3">Mesures articulaires</StepTitle>
    <Info>3 screenshots "Déséquilibres articulaires" puis saisissez les 12 valeurs.</Info>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}}>
      <ImgSlot label="Vue ANTÉRIEURE" hint="Squelette de face" value={d.ant} onChange={vv=>s({...d,ant:vv})}/>
      <ImgSlot label="Vue SAGITTALE" hint="Squelette de profil" value={d.sag} onChange={vv=>s({...d,sag:vv})}/>
      <ImgSlot label="Vue POSTÉRIEURE" hint="Squelette de dos" value={d.post} onChange={vv=>s({...d,post:vv})}/>
    </div>
    <Lbl>Les 12 valeurs mesurées</Lbl>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px",marginTop:8}}>
      {MESURES.map(m=><MRow key={m.id} {...m} value={v[m.id]||""} onChange={vv=>s({...d,vals:{...v,[m.id]:vv}})}/>)}
    </div>
  </div>;
}

function S4({d,s}) {
  const sections=[
    {k:"genoux",l:"Genoux",ph:"Au niveau des genoux, l\u2019alignement est globalement correct\u2026"},
    {k:"bassin",l:"Bassin",ph:"Sur ce bilan, un param\u00e8tre ressort comme probl\u00e9matique : la bascule du bassin\u2026"},
    {k:"lombaires",l:"Lombaires",ph:"La stabilit\u00e9 lombaire repose sur un \u00e9quilibre entre les muscles du dos, les abdominaux et les fessiers\u2026"},
    {k:"dorsales",l:"Dorsales & Cervicales",ph:"Le haut du dos et le cou sont maintenus par un \u00e9quilibre entre les muscles ant\u00e9rieurs et post\u00e9rieurs\u2026"},
  ];
  return <div>
    <StepTitle num="4">Interprétations posturales</StepTitle>
    <Info>Ces textes seront intégrés tels quels dans la section 3 du bilan. Rédigez comme vous le feriez à la main.</Info>
    {sections.map(sec=><TA key={sec.k} label={sec.l} value={d[sec.k]||""} onChange={v=>s({...d,[sec.k]:v})} placeholder={sec.ph} rows={5} hint="S'adresse directement au patient"/>)}
  </div>;
}

function S5({d,s}) {
  const plaintes=d.plaintes||[{citation:"",reponse:""}];
  const upd=(i,field,val)=>{const u=plaintes.map((p,x)=>x===i?{...p,[field]:val}:p);s({...d,plaintes:u});};
  return <div>
    <StepTitle num="5">Plaintes & Réponses</StepTitle>
    <Info>Pour chaque plainte : la citation exacte du patient + votre réponse médicale.</Info>
    {plaintes.map((p,i)=><div key={i} style={{background:C.bg+"90",border:`1px solid ${C.border}`,borderRadius:10,padding:"16px 16px 10px",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:"monospace"}}>Plainte {i+1}</div>
        {i>0&&<button onClick={()=>s({...d,plaintes:plaintes.filter((_,x)=>x!==i)})} style={{background:"none",border:`1px solid ${C.red}40`,borderRadius:5,color:C.red+"80",cursor:"pointer",fontSize:11,padding:"2px 8px"}}>Supprimer</button>}
      </div>
      <TA label="Citation du patient" value={p.citation} onChange={v=>upd(i,"citation",v)} placeholder={"\"Douleur au pli de l\u2019aine gauche apr\u00e8s un effort\u2026\""} hint="Mot pour mot \u2014 apparaitra entre guillemets dans le PDF" rows={2}/>
      <TA label="Votre réponse médicale" value={p.reponse} onChange={v=>upd(i,"reponse",v)} placeholder={"Explication du lien entre la posture et la douleur d\u00e9crite\u2026"} rows={5}/>
    </div>)}
    {plaintes.length<3&&<button onClick={()=>s({...d,plaintes:[...plaintes,{citation:"",reponse:""}]})} style={{width:"100%",padding:"9px",borderRadius:8,background:"transparent",border:`1px dashed ${C.border}`,color:C.dim,cursor:"pointer",fontSize:12}}>+ Ajouter une plainte</button>}
  </div>;
}

function S6({d,s}) {
  return <div>
    <StepTitle num="6">Programme d&apos;amélioration</StepTitle>
    <Info>Les champs Objectif / Étirer / Renforcer / Mobilité seront affichés avec leurs badges colorés dans le PDF.</Info>
    <div style={{background:C.gold+"08",border:`1px solid ${C.gold}30`,borderRadius:10,padding:"14px 16px",marginBottom:16}}>
      <div style={{fontSize:12,fontWeight:700,color:C.gold,marginBottom:12}}>A — Bassin, lombaires et genoux</div>
      <TA label="Objectif" value={d.objA||""} onChange={v=>s({...d,objA:v})} placeholder={"Redonner une stabilit\u00e9 naturelle au bassin\u2026"} rows={2}/>
      <TA label={"ÉTIRER"} value={d.etirerA||""} onChange={v=>s({...d,etirerA:v})} placeholder={"Les quadriceps et les psoas\u2026"} rows={3}/>
      <TA label="RENFORCER" value={d.renforcerA||""} onChange={v=>s({...d,renforcerA:v})} placeholder={"Les abdominaux et les fessiers\u2026"} rows={3}/>
      <TA label="MOBILITÉ" value={d.mobiliteA||""} onChange={v=>s({...d,mobiliteA:v})} placeholder={"Exercice de mobilit\u00e9 pour r\u00e9curvatum\u2026"} rows={2}/>
      <TA label="Résultats attendus" value={d.resultatA||""} onChange={v=>s({...d,resultatA:v})} placeholder={"En r\u00e9\u00e9quilibrant ce couple musculaire\u2026"} rows={3}/>
    </div>
    <div style={{background:C.blue+"08",border:`1px solid ${C.blue}30`,borderRadius:10,padding:"14px 16px"}}>
      <div style={{fontSize:12,fontWeight:700,color:C.blue+"CC",marginBottom:12}}>B — Haut du corps</div>
      <TA label="Objectif" value={d.objB||""} onChange={v=>s({...d,objB:v})} placeholder={"R\u00e9duire le d\u00e9s\u00e9quilibre vers l\u2019avant\u2026"} rows={2}/>
      <TA label={"ÉTIRER"} value={d.etirerB||""} onChange={v=>s({...d,etirerB:v})} placeholder={"Les pectoraux et les muscles du cou\u2026"} rows={3}/>
      <TA label="RENFORCER" value={d.renforcerB||""} onChange={v=>s({...d,renforcerB:v})} placeholder={"Les muscles du dos entre les omoplates\u2026"} rows={3}/>
      <TA label="Résultats attendus" value={d.resultatB||""} onChange={v=>s({...d,resultatB:v})} placeholder={"En ramenant la t\u00eate et le dos\u2026"} rows={2}/>
    </div>
  </div>;
}

function makeAnnexeStep(num,title,info,slots) {
  return function AnnexeStep({d,s}) {
    return <div>
      <StepTitle num={num}>{title}</StepTitle>
      <Info>{info}</Info>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        {slots.map(sl=><ImgSlot key={sl.k} label={sl.l} hint={sl.h} value={d[sl.k]} onChange={v=>s({...d,[sl.k]:v})}/>)}
      </div>
    </div>;
  };
}

const S7 = makeAnnexeStep(7,"Annexe — Bassin","6 screenshots : 3 schémas angulaires + 3 images musculaires.",[
  {k:"bascule_s",l:"Schéma bascule avant",h:"Pelvis + valeur (ex: 4°)"},
  {k:"rotation_s",l:"Schéma rotation bassin",h:"Pelvis + valeur (ex: 0°)"},
  {k:"elevation_s",l:"Schéma élévation bassin",h:"Pelvis + valeur (ex: 1°)"},
  {k:"bascule_m",l:"Muscles — Bascule",h:"Muscles rouge/bleu"},
  {k:"rotation_m",l:"Muscles — Rotation",h:"Muscles rouge/bleu"},
  {k:"elevation_m",l:"Muscles — Élévation",h:"Muscles rouge/bleu"},
]);

const S8 = makeAnnexeStep(8,"Annexe — Genoux","6 screenshots : 3 schémas angulaires + 3 images musculaires.",[
  {k:"droit_s",l:"Schéma genou Droit",h:"Jambe droite + angle"},
  {k:"gauche_s",l:"Schéma genou Gauche",h:"Jambe gauche + angle"},
  {k:"recurv_s",l:"Schéma récurvatum",h:"Jambes + angle global"},
  {k:"droit_m",l:"Muscles — Genou Droit",h:"Muscles rouge/bleu"},
  {k:"gauche_m",l:"Muscles — Genou Gauche",h:"Muscles rouge/bleu"},
  {k:"recurv_m",l:"Muscles — Récurvatum",h:"Muscles rouge/bleu"},
]);

const S9 = makeAnnexeStep(9,"Annexe — Lombaires","3 screenshots : schéma de cambrure + 2 images musculaires.",[
  {k:"schema",l:"Schéma cambrure lombaire",h:"Vue sagittale + valeur (ex: 41°)"},
  {k:"bleu",l:"Muscles inhibés (bleu)",h:"Muscles en bleu"},
  {k:"rouge",l:"Muscles sollicités (rouge)",h:"Muscles en rouge"},
]);

const S10 = makeAnnexeStep(10,"Annexe — Dorsales & Cervicales","6 screenshots : 4 schémas + 2 images musculaires.",[
  {k:"epaules_s",l:"Schéma hauteur épaules",h:"Vue ant. + valeur"},
  {k:"enroul_s",l:"Schéma enroulement",h:"Vue post. + valeur"},
  {k:"cervical_s",l:"Schéma rachis cervical",h:"Vue sagittale + valeur"},
  {k:"courb_s",l:"Schéma courbure dorsale",h:"Vue sag. dos + valeur"},
  {k:"bleu",l:"Muscles inhibés (bleu)",h:"Muscles en bleu"},
  {k:"rouge",l:"Muscles sollicités (rouge)",h:"Muscles en rouge"},
]);

function S11({allData,onGenerate,status}) {
  const {identite:id,mesures,interp,plaintes:pl,programme:prog}=allData;
  const patient=`${id?.prenom||""} ${id?.nom||""}`.trim()||"—";
  const nbVals=Object.values(mesures?.vals||{}).filter(Boolean).length;
  const nbPlaintes=(pl?.plaintes||[]).filter(p=>p.citation).length;
  const interpOk=["genoux","bassin","lombaires","dorsales"].filter(k=>interp?.[k]?.trim()).length;
  const progOk=["objA","etirerA","renforcerA","objB","etirerB","renforcerB"].filter(k=>prog?.[k]?.trim()).length;

  if(status==="loading") return <div style={{textAlign:"center",padding:"56px 0"}}>
    <div style={{width:52,height:52,borderRadius:"50%",border:`3px solid ${C.border}`,borderTop:`3px solid ${C.gold}`,animation:"spin .85s linear infinite",margin:"0 auto 20px"}}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={{color:C.gold,fontSize:15,fontWeight:600,fontFamily:"Georgia,serif",marginBottom:6}}>Composition du PDF en cours…</div>
    <div style={{color:C.dim,fontSize:12,lineHeight:1.8}}>Traitement des images · Mise en page · Design SANTEO</div>
  </div>;

  if(status==="done") return <div style={{textAlign:"center",padding:"44px 0"}}>
    <div style={{width:60,height:60,borderRadius:"50%",border:`2px solid ${C.gold}`,background:C.gold+"15",fontSize:28,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>✓</div>
    <div style={{color:C.white,fontSize:20,fontFamily:"Georgia,serif",marginBottom:6}}>Bilan ouvert dans un nouvel onglet !</div>
    <div style={{color:C.dim,fontSize:12,marginBottom:6,lineHeight:1.7}}>Cliquez sur le bouton doré <strong style={{color:C.gold}}>"Enregistrer en PDF"</strong> en haut de la page<br/>ou faites <strong style={{color:C.gold}}>Ctrl+P</strong> → "Enregistrer au format PDF"</div>
    <div style={{background:C.blue+"10",border:`1px solid ${C.blue}25`,borderRadius:8,padding:"10px 16px",maxWidth:380,margin:"16px auto 0",fontSize:11,color:C.blue+"BB",lineHeight:1.7}}>
      💡 Dans la boîte de dialogue d'impression, activez <strong>"Graphiques d'arrière-plan"</strong> pour garder le fond sombre.
    </div>
  </div>;

  const checks=[
    {l:"Patient identifié",v:patient,ok:!!(id?.prenom&&id?.nom&&id?.date)},
    {l:"Mesures articulaires",v:`${nbVals}/12 valeurs`,ok:nbVals>=10},
    {l:"Interprétations rédigées",v:`${interpOk}/4 sections`,ok:interpOk===4},
    {l:"Plaintes & réponses",v:`${nbPlaintes} plainte(s)`,ok:nbPlaintes>=1},
    {l:"Programme d'amélioration",v:`${progOk}/6 champs`,ok:progOk>=4},
  ];

  return <div>
    <StepTitle num="11">Récapitulatif & Génération</StepTitle>
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:20,marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:14,fontFamily:"monospace",letterSpacing:"0.05em"}}>VÉRIFICATION DU DOSSIER</div>
      {checks.map(c=><div key={c.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
        <span style={{fontSize:12,color:C.dim}}>{c.l}</span>
        <span style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:C.text}}>{c.v}</span>
          <span style={{fontSize:13}}>{c.ok?"✅":"⚠️"}</span>
        </span>
      </div>)}
    </div>
    <div style={{padding:"11px 14px",borderRadius:8,marginBottom:18,background:C.green+"08",border:`1px solid ${C.green}25`,fontSize:11,color:C.green+"BB",lineHeight:1.7}}>
      ✦ Tout le contenu sera mis en forme avec le design SANTEO<br/>
      ✦ Les images seront intégrées aux bons emplacements<br/>
      ✦ Une nouvelle fenêtre s'ouvrira — cliquez "Enregistrer en PDF"
    </div>
    <button onClick={onGenerate} style={{width:"100%",padding:15,fontSize:15,fontWeight:700,background:`linear-gradient(135deg,${C.gold},${C.goldL})`,border:"none",borderRadius:9,color:C.bg,cursor:"pointer",letterSpacing:"0.02em",boxShadow:`0 4px 20px ${C.gold}35`}}>
      ⚡ Générer le bilan de {patient}
    </button>
  </div>;
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [step,setStep]=useState(0);
  const [status,setStatus]=useState("idle");
  const [identite,setIdentite]=useState({prenom:"",nom:"",date:""});
  const [musculaire,setMusculaire]=useState({});
  const [mesures,setMesures]=useState({vals:{}});
  const [interp,setInterp]=useState({});
  const [plaintesD,setPlaintesD]=useState({plaintes:[{citation:"",reponse:""}]});
  const [programme,setProgramme]=useState({});
  const [bassin,setBassin]=useState({});
  const [genoux,setGenoux]=useState({});
  const [lombaires,setLombaires]=useState({});
  const [dorsales,setDorsales]=useState({});

  const allData={identite,musculaire,mesures,interp,plaintes:plaintesD,programme,bassin,genoux,lombaires,dorsales};

  const handleGenerate=async()=>{
    setStatus("loading");
    const win=window.open("","_blank");
    win.document.write(`<html><body style="background:#090F1C;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p style="color:#C8A84B;font-family:sans-serif;font-size:16px">⚕️ Génération du bilan en cours…</p></body></html>`);
    try {
      const imgs=await collectImgs(allData);
      const html=buildPDFHTML(allData,imgs);
      win.document.open();
      win.document.write(html);
      win.document.close();
      setStatus("done");
    } catch(e) {
      console.error(e);
      win.close();
      setStatus("idle");
      alert("Erreur lors de la génération. Veuillez réessayer.");
    }
  };

  const reset=()=>{
    setStep(0);setStatus("idle");
    setIdentite({prenom:"",nom:"",date:""});setMusculaire({});setMesures({vals:{}});
    setInterp({});setPlaintesD({plaintes:[{citation:"",reponse:""}]});
    setProgramme({});setBassin({});setGenoux({});setLombaires({});setDorsales({});
  };

  const canNext=[
    !!(identite.prenom&&identite.nom&&identite.date),
    true,true,
    !!(interp.genoux||interp.bassin),
    !!(plaintesD.plaintes?.[0]?.citation),
    !!(programme.objA||programme.etirerA),
    true,true,true,true,true,
  ][step];

  const stepEls=[
    <S1 d={identite} s={setIdentite}/>,
    <S2 d={musculaire} s={setMusculaire}/>,
    <S3 d={mesures} s={setMesures}/>,
    <S4 d={interp} s={setInterp}/>,
    <S5 d={plaintesD} s={setPlaintesD}/>,
    <S6 d={programme} s={setProgramme}/>,
    <S7 d={bassin} s={setBassin}/>,
    <S8 d={genoux} s={setGenoux}/>,
    <S9 d={lombaires} s={setLombaires}/>,
    <S10 d={dorsales} s={setDorsales}/>,
    <S11 allData={allData} onGenerate={handleGenerate} status={status}/>,
  ];

  return <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
    <style>{`*{box-sizing:border-box}input,textarea{color:inherit!important}input::placeholder,textarea::placeholder{color:${C.dim}70!important}input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${C.bg2}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}`}</style>

    <div style={{background:C.bg2,borderBottom:`2px solid ${C.gold}`,padding:"11px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:29,height:29,borderRadius:7,background:C.gold+"20",border:`1px solid ${C.gold}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>⚕️</div>
        <div><div style={{fontSize:13,fontWeight:700,color:C.white}}>SANTEO · Générateur de bilans posturaux</div><div style={{fontSize:9.5,color:C.dim}}>PAYET Guillaume · Ostéopathe D.O</div></div>
      </div>
      <div style={{fontSize:9.5,color:C.dim,textAlign:"right",lineHeight:1.7}}><div>+262 692 22 76 60</div><div>pg.osteoptahe@gmail.com</div></div>
    </div>

    <div style={{maxWidth:840,margin:"0 auto",padding:"24px 16px 80px"}}>
      <div style={{display:"flex",gap:4,marginBottom:22,overflowX:"auto",paddingBottom:4}}>
        {STEPS.map((s,i)=>{
          const done=i<step,active=i===step;
          return <button key={i} onClick={()=>i<step&&setStep(i)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",borderRadius:7,flexShrink:0,fontSize:11,fontWeight:active?700:400,border:`1px solid ${active?C.gold:done?C.gold+"40":C.border}`,background:active?C.gold+"15":done?C.gold+"08":"transparent",color:active?C.gold:done?C.gold+"90":C.dim,cursor:i<step?"pointer":"default",transition:"all .2s"}}>
            <span>{s.icon}</span><span style={{whiteSpace:"nowrap"}}>{s.label}</span>{done&&<span style={{color:C.green,fontSize:10}}>✓</span>}
          </button>;
        })}
      </div>

      <div style={{height:3,background:C.border,borderRadius:2,marginBottom:22,overflow:"hidden"}}>
        <div style={{height:"100%",borderRadius:2,background:`linear-gradient(90deg,${C.gold},${C.goldL})`,width:`${(step/(STEPS.length-1))*100}%`,transition:"width .4s ease"}}/>
      </div>

      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"24px 20px",minHeight:300}}>
        {stepEls[step]}
      </div>

      {status!=="loading"&&status!=="done"&&<div style={{display:"flex",justifyContent:"space-between",marginTop:14}}>
        <button onClick={()=>setStep(s=>s-1)} disabled={step===0} style={{padding:"10px 22px",borderRadius:8,fontSize:13,background:"transparent",border:`1px solid ${C.border}`,color:step===0?C.border:C.dim,cursor:step===0?"default":"pointer"}}>← Retour</button>
        {step<STEPS.length-1&&<button onClick={()=>setStep(s=>s+1)} disabled={!canNext} style={{padding:"10px 28px",borderRadius:8,fontSize:13,fontWeight:600,background:canNext?`linear-gradient(135deg,${C.gold},${C.goldL})`:C.border,border:"none",color:canNext?C.bg:C.dim,cursor:canNext?"pointer":"default",boxShadow:canNext?`0 3px 14px ${C.gold}30`:"none",transition:"all .2s"}}>
          {step===STEPS.length-2?"Voir le récap →":"Étape suivante →"}
        </button>}
      </div>}

      {status==="done"&&<div style={{textAlign:"center",marginTop:14}}>
        <button onClick={reset} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,color:C.dim,padding:"8px 18px",cursor:"pointer",fontSize:12}}>+ Nouveau patient</button>
      </div>}

      <div style={{textAlign:"center",marginTop:20,fontSize:10,color:C.border}}>Conçu par <span style={{color:C.gold+"60"}}>Signature Web</span></div>
    </div>
  </div>;
}
