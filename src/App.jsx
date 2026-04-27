import { useState, useRef } from "react";

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
  {id:"m1", label:"Hauteur d\u2019\u00e9paules",            norme:"[0\u20131\u00b0]", normVal:1  },
  {id:"m2", label:"Rotation du bassin",                      norme:"[0\u20133\u00b0]", normVal:3  },
  {id:"m3", label:"Angle du genou Droit",                    norme:"[0\u20131\u00b0]", normVal:1  },
  {id:"m4", label:"Angle du genou Gauche",                   norme:"[0\u20131\u00b0]", normVal:1  },
  {id:"m5", label:"Posture de la t\u00eate",                 norme:"[\u223c11\u00b0]", normVal:11 },
  {id:"m6", label:"Inclinaison du bassin",                   norme:"[0\u20131\u00b0]", normVal:1  },
  {id:"m7", label:"Courbure thoracique",                     norme:"[\u223c36\u00b0]", normVal:36 },
  {id:"m8", label:"Lordose lombaire",                        norme:"[\u223c35\u00b0]", normVal:35 },
  {id:"m9", label:"Genou en arri\u00e8re (r\u00e9curvatum)",norme:"[0\u20132\u00b0]", normVal:2  },
  {id:"m10",label:"\u00c9paules enroul\u00e9es",            norme:"[\u223c5\u00b0]",  normVal:5  },
  {id:"m11",label:"D\u00e9viation col. vert. (scoliose)",   norme:"\u2014",           normVal:999},
  {id:"m12",label:"\u00c9l\u00e9vation du bassin",          norme:"[0\u20131\u00b0]", normVal:1  },
];

async function fileToB64(obj) {
  if (!obj?.file) return null;
  return new Promise(res => { const r=new FileReader(); r.onload=e=>res(e.target.result); r.readAsDataURL(obj.file); });
}

async function collectImgs(d) {
  const map = {
    mf:d.musculaire?.face, md:d.musculaire?.dos,
    aa:d.mesures?.ant, as_:d.mesures?.sag, ap:d.mesures?.post,
    bb:d.bassin?.bascule_s, br:d.bassin?.rotation_s, be:d.bassin?.elevation_s,
    bm:d.bassin?.bascule_m, bn:d.bassin?.rotation_m, bo:d.bassin?.elevation_m,
    gd:d.genoux?.droit_s, gg:d.genoux?.gauche_s, gr:d.genoux?.recurv_s,
    gm:d.genoux?.droit_m, gn:d.genoux?.gauche_m, go_:d.genoux?.recurv_m,
    ls:d.lombaires?.schema, lb:d.lombaires?.bleu, lr:d.lombaires?.rouge,
    de_:d.dorsales?.epaules_s, di:d.dorsales?.enroul_s, dc:d.dorsales?.cervical_s,
    dk:d.dorsales?.courb_s, db:d.dorsales?.bleu, dr:d.dorsales?.rouge,
  };
  const out={};
  await Promise.all(Object.entries(map).map(async([k,v])=>{ out[k]=await fileToB64(v); }));
  return out;
}

function mColor(id,val) {
  const n={m1:1,m2:3,m3:1,m4:1,m5:11,m6:1,m7:36,m8:35,m9:2,m10:5,m11:999,m12:1}[id];
  const v=parseFloat(val);
  if(!val||isNaN(v)) return "#555";
  if(v<=n) return "#27AE60";
  if(v<=n*1.6) return "#E67E22";
  return "#C0392B";
}

function imgBox(src, h="160px") {
  if(!src) return `<div style="width:100%;height:${h};background:#F0F2F5;border:1px dashed #CBD0D8;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#AAB0BB;font-size:11px;font-family:Arial">Aucune image</div>`;
  return `<img src="${src}" style="width:100%;height:${h};object-fit:contain;border-radius:4px;">`;
}

function txt(t) {
  if(!t||!t.trim()) return "";
  return t.split("\n").filter(l=>l.trim()).map(l=>`<p style="margin:0 0 6px;font-size:10px;line-height:1.7;color:#333">${l}</p>`).join("");
}

function buildPDFHTML(d, imgs) {
  const nom=`${d.identite?.prenom||""}${d.identite?.nom?" "+d.identite.nom:""}`.trim();
  const date=d.identite?.date||"";
  const vals=d.mesures?.vals||{};
  const interp=d.interp||{};
  const prog=d.programme||{};
  const plaintes=(d.plaintes?.plaintes||[]).filter(p=>p.citation&&p.citation.trim());

  const CSS=`
    @import url('https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#E8EBF0;font-family:'Open Sans',Arial,sans-serif;color:#333}
    .page{width:210mm;height:297mm;background:#fff;page-break-after:always;overflow:hidden;display:flex;flex-direction:column;margin:0 auto 8px;box-shadow:0 2px 12px rgba(0,0,0,.15)}
    .ph{display:flex;justify-content:space-between;align-items:center;padding:10px 22px;border-bottom:1px solid #E0E4EC;background:#fff;flex-shrink:0}
    .ph-contact{text-align:right;font-size:9px;color:#7A8CA8;line-height:1.8}
    .pf{display:flex;justify-content:space-between;align-items:center;padding:7px 22px;border-top:1px solid #E0E4EC;font-size:8.5px;color:#7A8CA8;flex-shrink:0;background:#FAFBFC}
    .pf-name{font-weight:700;color:#2B4A7A}
    .pb{flex:1;padding:14px 22px;overflow:hidden}
    .st{font-size:11px;font-weight:700;color:#2B4A7A;letter-spacing:.04em;text-transform:uppercase;border-bottom:2px solid #2B4A7A;padding-bottom:6px;margin-bottom:14px}
    .st-num{display:inline-flex;width:20px;height:20px;border-radius:50%;background:#2B4A7A;color:#fff;font-size:10px;font-weight:700;align-items:center;justify-content:center;margin-right:7px}
    .img-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px}
    .img-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px}
    .img-wrap{text-align:center}
    .img-label{font-size:8.5px;font-weight:700;color:#2B4A7A;text-transform:uppercase;letter-spacing:.06em;margin-top:5px}
    .mtable{width:100%;border-collapse:collapse;font-size:9.5px}
    .mtable th{background:#2B4A7A;color:#fff;padding:5px 8px;text-align:left;font-weight:600}
    .mtable td{padding:5px 8px;border-bottom:1px solid #EEF1F6}
    .mtable tr:nth-child(even) td{background:#F5F7FA}
    .mval{font-weight:700;font-size:13px}
    .card-interp{background:#F8FAFB;border-left:3px solid #2B4A7A;padding:10px 12px;margin-bottom:10px;border-radius:0 4px 4px 0}
    .ci-title{font-size:10.5px;font-weight:700;color:#2B4A7A;margin-bottom:6px}
    .quote{background:#EEF3FA;border-left:3px solid #4A7AB5;padding:8px 12px;font-style:italic;font-size:10px;color:#2B4A7A;margin-bottom:10px;border-radius:0 4px 4px 0;line-height:1.6}
    .prog-header{font-size:10px;font-weight:700;color:#2B4A7A;text-decoration:underline;margin:10px 0 5px}
    .prog-obj{font-size:9.5px;color:#555;font-style:italic;margin-bottom:8px;line-height:1.6}
    .prog-tag{display:inline-block;padding:2px 8px;border-radius:3px;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:5px 0 3px}
    .tag-e{background:#EBF5FF;color:#1A6EA8;border:1px solid #A8CFF0}
    .tag-r{background:#FFF0EE;color:#C0392B;border:1px solid #F0B8B0}
    .tag-m{background:#EDFAF2;color:#1A7A40;border:1px solid #90D8A8}
    .annexe-title{font-size:11px;font-weight:700;color:#2B4A7A;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #2B4A7A;padding-bottom:5px;margin-bottom:12px}
    .annex-imgs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px}
    .annex-cell{text-align:center;background:#F8FAFB;border:1px solid #E0E4EC;border-radius:5px;padding:8px 6px}
    .annex-val{font-size:20px;font-weight:700;color:#2B4A7A;margin:4px 0 2px}
    .annex-lbl{font-size:8px;color:#7A8CA8;line-height:1.4}
    .annex-muscles{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
    .ann-m{background:#F8FAFB;border:1px solid #E0E4EC;border-radius:5px;padding:8px}
    .ann-m-title{font-size:9px;font-weight:700;margin-bottom:5px;padding-bottom:3px;border-bottom:1px solid #E0E4EC}
    .red-t{color:#C0392B}.blue-t{color:#2980B9}
    .ann-m-list{list-style:none;padding:0}
    .ann-m-list li{font-size:8.5px;line-height:1.7;color:#333;display:flex;align-items:center;gap:4px}
    .ann-m-list li::before{content:'';width:5px;height:5px;border-radius:50%;flex-shrink:0}
    .red-d li::before{background:#C0392B}.blue-d li::before{background:#2980B9}
    .disc{font-size:10px;color:#555;font-style:italic;line-height:1.8;margin-bottom:16px;text-align:justify}
    .disc b{font-weight:700;color:#2B4A7A;font-style:normal}
    #pb{position:fixed;top:0;left:0;right:0;z-index:9999;background:#2B4A7A;padding:10px 24px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 10px rgba(0,0,0,.3)}
    #pb span{color:#fff;font-family:Arial;font-size:13px;font-weight:600}
    #pb button{background:#C8A84B;border:none;border-radius:6px;color:#fff;font-weight:700;font-size:13px;padding:8px 20px;cursor:pointer;font-family:Arial}
    .sp{height:52px}
    @media print{
      body{background:none}
      #pb{display:none!important}
      .sp{display:none!important}
      .page{box-shadow:none!important;margin:0!important}
      @page{size:A4;margin:0}
    }
  `;

  const hdr=()=>`<div class="ph"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:22px;color:#4A7AB5">✦</span><div><div style="font-size:18px;font-weight:700;color:#2B4A7A">Ostéopathie</div><div style="font-size:9px;color:#7A8CA8">Santé Holistique &ndash; SANTEO</div></div></div><div class="ph-contact"><div>+262 692 22 76 60</div><div>pg.osteoptahe@gmail.com</div></div></div>`;
  const ftr=()=>`<div class="pf"><div><span class="pf-name">PAYET Guillaume</span><br>Ostéopathe D.O</div><div style="text-align:right">+262 692 22 76 60<br>pg.osteoptahe@gmail.com</div></div>`;
  const st=(n,t)=>`<div class="st"><span class="st-num">${n}</span>${t}</div>`;

  const cover=`<div class="page"><div style="display:flex;justify-content:space-between;align-items:center;padding:14px 24px;border-bottom:1px solid #E0E4EC"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:26px;color:#4A7AB5">✦</span><span style="font-size:20px;font-weight:700;color:#2B4A7A">Ostéopathie</span></div><div style="font-size:11px;color:#7A8CA8">Santé Holistique &ndash; SANTEO</div></div><div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 40px"><div style="font-size:34px;font-weight:700;color:#2B4A7A;text-align:center;margin-bottom:8px">Étude Posturale</div><div style="width:120px;height:2px;background:#2B4A7A;margin:10px auto 30px"></div><div style="width:170px;height:170px;border:1.5px solid #D0D8E8;border-radius:4px;display:flex;align-items:center;justify-content:center;margin-bottom:28px;background:#F8FAFB"><div style="text-align:center;color:#7A8CA8"><div style="font-size:64px;line-height:1">🧍</div><div style="font-size:8px;margin-top:4px">Illustration posturale</div></div></div><div style="font-size:11px;font-weight:600;color:#2B4A7A;text-align:center;margin-bottom:18px">Nouvelle approche de la synthèse posturale globale</div><div style="max-width:380px;text-align:center;font-size:10px;color:#555;line-height:1.7">Ostéopathie Santé Holistique (SANTEO) vous présente une <strong>synthèse visuelle</strong> de votre bilan postural ostéopathique, conçue pour offrir une vision claire de votre posture, sans jargon médical.</div></div><div style="padding:14px 24px;border-top:1px solid #E0E4EC;background:#FAFBFC;display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:13px;font-weight:700;color:#2B4A7A">PAYET Guillaume</div><div style="font-size:10px;color:#7A8CA8">Ostéopathe D.O</div></div><div style="text-align:right;font-size:10px;color:#7A8CA8;line-height:1.8"><div>+262 692 22 76 60</div><div>pg.osteoptahe@gmail.com</div></div></div></div>`;

  const disclaimer=`<div class="page">${hdr()}<div class="pb"><div style="text-align:center;font-size:12px;font-weight:700;color:#2B4A7A;letter-spacing:.08em;text-transform:uppercase;margin:12px 0 20px;padding-bottom:10px;border-bottom:1px solid #E0E4EC">À LIRE ATTENTIVEMENT :</div><p class="disc">Ce bilan postural a été réalisé dans le cadre de la prise en charge ostéopathique du patient, à l&apos;aide du dispositif <b>MOTIPHYSIO2</b>, qui permet une évaluation instrumentée et objective de l&apos;alignement corporel, des appuis au sol et des compensations musculo-squelettiques.</p><p class="disc">Les observations partagées ici ne se substituent en aucun cas à l&apos;expertise des professionnels impliqués dans le parcours de soin du patient, mais peuvent, le cas échéant, offrir un éclairage complémentaire dans une logique de prise en charge pluridisciplinaire.</p><p class="disc">De plus, ces données ne constituent en aucun cas un <b>diagnostic médical</b> et ne peuvent s&apos;y substituer. Toute interprétation ou orientation thérapeutique relevant du champ médical reste strictement du ressort du médecin. En cas de suspicion de pathologie, une orientation vers un professionnel de santé habilité est systématiquement proposée.</p><p class="disc">Enfin, le patient atteste avoir été informé et consent à la réalisation de ce bilan à l&apos;aide de l&apos;outil MOTIPHYSIO2. Les informations recueillies sont couvertes par le <b>secret professionnel</b> et sont strictement confidentielles. Elles ne seront communiquées à des tiers qu&apos;avec l&apos;accord explicite du patient ou dans les cas légalement prévus.</p></div>${ftr()}</div>`;

  const musculaire_p=`<div class="page">${hdr()}<div class="pb">${st(1,"Observation des déséquilibres musculaires : Plan antéro-postérieur")}<div class="img-grid-2"><div class="img-wrap">${imgBox(imgs.mf,"200px")}<div class="img-label">Plan antérieur (de face)</div></div><div class="img-wrap">${imgBox(imgs.md,"200px")}<div class="img-label">Plan postérieur (de dos)</div></div></div><div style="background:#F8FAFB;border:1px solid #E0E4EC;border-radius:4px;padding:8px 12px;font-size:9.5px;color:#555;line-height:1.6">Les muscles en <strong style="color:#C0392B">rouge</strong> sont trop sollicités pour maintenir l&apos;équilibre. Les muscles en <strong style="color:#2980B9">bleu</strong> sont inhibés et jouent insuffisamment leur rôle postural.</div></div>${ftr()}</div>`;

  const mRows=MESURES.map(m=>{const v=vals[m.id];const col=mColor(m.id,v);return `<tr><td style="width:3px;background:${col};padding:0"></td><td style="font-size:9.5px">${m.label}</td><td style="color:#888;font-size:8.5px;text-align:center">${m.norme}</td><td class="mval" style="color:${col};text-align:center">${v||"—"}${v?"°":""}</td></tr>`;});
  const mesures_p=`<div class="page">${hdr()}<div class="pb">${st(2,"Observation des déséquilibres articulaires : Plan antérieur – sagittal – postérieur")}<div class="img-grid-3" style="margin-bottom:12px"><div class="img-wrap">${imgBox(imgs.aa,"100px")}<div class="img-label">Antérieur</div></div><div class="img-wrap">${imgBox(imgs.as_,"100px")}<div class="img-label">Sagittal</div></div><div class="img-wrap">${imgBox(imgs.ap,"100px")}<div class="img-label">Postérieur</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><table class="mtable"><thead><tr><th colspan="2">Paramètre</th><th>Norme</th><th>Valeur</th></tr></thead><tbody>${mRows.slice(0,6).join("")}</tbody></table><table class="mtable"><thead><tr><th colspan="2">Paramètre</th><th>Norme</th><th>Valeur</th></tr></thead><tbody>${mRows.slice(6).join("")}</tbody></table></div></div>${ftr()}</div>`;

  const mkI=(k,l)=>interp[k]?.trim()?`<div class="card-interp"><div class="ci-title">${l} :</div>${txt(interp[k])}</div>`:"";
  const interp1=`<div class="page">${hdr()}<div class="pb">${st(3,"Interprétation détaillée : Genoux, bassin, lombaires, dorsales et cervicales")}${mkI("genoux","Genoux")}${mkI("bassin","Bassin")}${mkI("lombaires","Lombaires")}</div>${ftr()}</div>`;
  const interp2=`<div class="page">${hdr()}<div class="pb">${st(3,"Interprétation détaillée : Genoux, bassin, lombaires, dorsales et cervicales")}${mkI("dorsales","Dorsales et cervicales")}</div>${ftr()}</div>`;

  const plPages=plaintes.length?plaintes.map(p=>`<div class="page">${hdr()}<div class="pb">${st(4,"Réponses aux problématiques")}<div class="quote">&laquo;&nbsp;${p.citation}&nbsp;&raquo;</div>${txt(p.reponse)}</div>${ftr()}</div>`).join(""):`<div class="page">${hdr()}<div class="pb">${st(4,"Réponses aux problématiques")}<p style="font-size:10px;color:#888;font-style:italic">Aucune plainte renseignée.</p></div>${ftr()}</div>`;

  const mkTag=(cls,l,c)=>c?.trim()?`<div><span class="prog-tag ${cls}">${l}</span>${txt(c)}</div>`:"";
  const prog_p=`<div class="page">${hdr()}<div class="pb">${st(5,"Axes d\u2019am\u00e9liorations")}<div style="text-align:center;font-size:10.5px;font-weight:600;color:#333;margin-bottom:12px">Programme</div><div class="prog-header">A &ndash; Le rééquilibrage du bassin, de la zone lombaire et des genoux</div>${prog.objA?`<div class="prog-obj">${prog.objA}</div>`:""}${mkTag("tag-e","ÉTIRER",prog.etirerA)}${mkTag("tag-r","RENFORCER",prog.renforcerA)}${mkTag("tag-m","MOBILITÉ",prog.mobiliteA)}${prog.resultatA?`<div style="margin-top:8px;padding:8px;background:#F8FAFB;border:1px solid #E0E4EC;border-radius:4px">${txt(prog.resultatA)}</div>`:""}<div class="prog-header" style="margin-top:14px">B &ndash; Rééquilibrer le haut du corps</div>${prog.objB?`<div class="prog-obj">${prog.objB}</div>`:""}${mkTag("tag-e","ÉTIRER",prog.etirerB)}${mkTag("tag-r","RENFORCER",prog.renforcerB)}${prog.resultatB?`<div style="margin-top:8px;padding:8px;background:#F8FAFB;border:1px solid #E0E4EC;border-radius:4px">${txt(prog.resultatB)}</div>`:""}</div>${ftr()}</div>`;

  const aImgs=(srcs,v3,l3)=>`<div class="annex-imgs">${srcs.map((s,i)=>`<div class="annex-cell">${s?`<img src="${s}" style="width:100%;height:80px;object-fit:contain">`:`<div style="height:80px;background:#F0F2F5;border-radius:3px;display:flex;align-items:center;justify-content:center;color:#AAB0BB;font-size:9px">Aucune image</div>`}<div class="annex-val">${v3[i]}</div><div class="annex-lbl">${l3[i]}</div></div>`).join("")}</div>`;
  const aMus=(cells)=>`<div class="annex-muscles">${cells.map(c=>c?`<div class="ann-m">${c.src?`<img src="${c.src}" style="width:100%;height:80px;object-fit:contain;margin-bottom:6px;">`:""}<div class="ann-m-title ${c.t==="red"?"red-t":"blue-t"}">${c.t==="red"?"🔴 Muscles sollicités":"🔵 Muscles inhibés"}</div><ul class="ann-m-list ${c.t==="red"?"red-d":"blue-d"}">${(c.l||[]).map(x=>`<li>${x}</li>`).join("")}</ul></div>`:`<div></div>`).join("")}</div>`;

  const bassin_p=`<div class="page">${hdr()}<div class="pb"><div class="annexe-title">ANNEXE : Observation détaillée : Bassin</div>${aImgs([imgs.bb,imgs.br,imgs.be],[vals.m6?vals.m6+"°":"—",vals.m2?vals.m2+"°":"—",vals.m12?vals.m12+"°":"—"],["Bascule en avant du bassin","Rotation du bassin","Élévation du bassin"])}${aMus([{src:imgs.bm,t:"red",l:["Quadriceps","Ischio-jambiers","Psoas iliaques","Paravertébraux"]},{src:imgs.bn,t:"red",l:["TFL Droite","Obliques interne Droit","Obliques externe Gauche"]},{src:imgs.bo,t:"blue",l:["Grand droit de l'abdomen","Grand et moyen fessiers","Obliques"]}])}</div>${ftr()}</div>`;

  const genoux_p=`<div class="page">${hdr()}<div class="pb"><div class="annexe-title">ANNEXE : Observation détaillée : Genoux</div>${aImgs([imgs.gd,imgs.gg,imgs.gr],[vals.m3?vals.m3+"°":"—",vals.m4?vals.m4+"°":"—",vals.m9?vals.m9+"°":"—"],["Angle du genou Droit","Angle du genou Gauche","Genoux en arrière (récurvatum)"])}${aMus([{src:imgs.gm,t:"red",l:["Biceps fémorale","Semi-tendineux","Semi-membraneux","Tenseur du fascia lata (TFL)"]},{src:imgs.gn,t:"red",l:["Biceps fémorale","Semi-tendineux","Semi-membraneux","Tenseur du fascia lata (TFL)"]},{src:imgs.go_,t:"blue",l:["Fessiers grand et moyen","Gastrocnémien (Mollet)"]}])}</div>${ftr()}</div>`;

  const lomb_p=`<div class="page">${hdr()}<div class="pb"><div class="annexe-title">ANNEXE : Observation détaillée : Lombaires</div><div style="text-align:center;margin-bottom:12px"><div class="annex-cell" style="display:inline-block;min-width:180px">${imgs.ls?`<img src="${imgs.ls}" style="height:100px;max-width:160px;object-fit:contain">`:`<div style="height:100px;background:#F0F2F5;border-radius:3px;display:flex;align-items:center;justify-content:center;color:#AAB0BB;font-size:9px;width:160px">Aucune image</div>`}<div class="annex-val">${vals.m8?vals.m8+"°":"—"}</div><div class="annex-lbl">Augmentation de la cambrure du bas dos</div></div></div>${aMus([{src:imgs.lr,t:"red",l:["Quadriceps : droit fémorale","Psoas-iliaque","TFL","Paravertébraux"]},{src:imgs.lb,t:"blue",l:["Fessiers grand et moyen","Grand droit de l'abdomen","Obliques interne et externe droit/gauche"]},null])}</div>${ftr()}</div>`;

  const dors_p=`<div class="page">${hdr()}<div class="pb"><div class="annexe-title">ANNEXE : Observation détaillée : Dorsales et cervicales</div>${aImgs([imgs.de_,imgs.di,imgs.dc],[vals.m1?vals.m1+"°":"—",vals.m10?vals.m10+"°":"—",vals.m5?vals.m5+"°":"—"],["Abaissement de la ligne des épaules","Enroulement avant des épaules","Rachis cervical avancé"])}<div style="text-align:center;margin-bottom:8px"><div class="annex-cell" style="display:inline-block;min-width:150px">${imgs.dk?`<img src="${imgs.dk}" style="height:70px;max-width:130px;object-fit:contain">`:`<div style="height:70px;background:#F0F2F5;border-radius:3px;display:flex;align-items:center;justify-content:center;color:#AAB0BB;font-size:9px;width:130px">Aucune image</div>`}<div class="annex-val">${vals.m7?vals.m7+"°":"—"}</div><div class="annex-lbl">Augmentation de la courbure dorsale (Dos arrondi)</div></div></div>${aMus([{src:imgs.dr,t:"red",l:["SCOM","Élévateur de la scapula","Trapèze supérieur","Pectoraux"]},{src:imgs.db,t:"blue",l:["Trapèze moyen et inférieur","Rhomboïdes","Grand dorsal","Supra et infra épineux","Ronds"]},null])}</div>${ftr()}</div>`;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Bilan Postural \u2014 ${nom}</title><style>${CSS}</style></head><body>
  <div class="sp"></div>
  ${cover}${disclaimer}${musculaire_p}${mesures_p}${interp1}${interp2}${plPages}${prog_p}${bassin_p}${genoux_p}${lomb_p}${dors_p}
  <div id="pb"><span>Bilan de ${nom} \u2014 Prêt à enregistrer</span><button onclick="this.parentElement.style.display='none';window.print();">\uD83D\uDDA8 Enregistrer en PDF</button></div>
  </body></html>`;
}

function StepTitle({num,children}){return <div style={{marginBottom:22}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><div style={{width:26,height:26,borderRadius:"50%",background:C.gold,color:C.bg,fontWeight:800,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{num}</div><h2 style={{margin:0,fontSize:16,fontWeight:700,color:C.white,fontFamily:"Georgia,serif"}}>{children}</h2></div><div style={{marginLeft:36,height:1,background:C.border}}/></div>;}
function Info({children}){return <div style={{padding:"9px 13px",borderRadius:7,marginBottom:16,background:C.blue+"10",border:`1px solid ${C.blue}30`,fontSize:11,color:C.blue+"CC",lineHeight:1.65}}>ℹ️ {children}</div>;}
function Lbl({children,required}){return <div style={{fontSize:10,fontWeight:700,color:C.gold,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:5,fontFamily:"monospace"}}>{children}{required&&<span style={{color:C.red}}> *</span>}</div>;}
function TI({label,value,onChange,placeholder,required}){const [f,setF]=useState(false);return <div style={{marginBottom:15}}><Lbl required={required}>{label}</Lbl><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{width:"100%",padding:"9px 12px",borderRadius:7,fontSize:13,background:C.bg+"CC",color:C.text,fontFamily:"inherit",outline:"none",border:`1px solid ${f?C.gold+"70":C.border}`,transition:"border .2s",boxSizing:"border-box"}}/></div>;}
function TA({label,value,onChange,placeholder,hint,rows=5,required}){const [f,setF]=useState(false);return <div style={{marginBottom:18}}><Lbl required={required}>{label}</Lbl>{hint&&<div style={{fontSize:10.5,color:C.dim,marginBottom:6,lineHeight:1.5}}>{hint}</div>}<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{width:"100%",padding:"10px 13px",borderRadius:7,fontSize:12.5,background:C.bg+"CC",color:C.text,fontFamily:"inherit",outline:"none",border:`1px solid ${f?C.gold+"70":C.border}`,resize:"vertical",transition:"border .2s",boxSizing:"border-box",lineHeight:1.7}}/><div style={{textAlign:"right",fontSize:10,color:C.dim+"80",marginTop:3}}>{value.length} car.</div></div>;}
function ImgSlot({label,hint,value,onChange}){const ref=useRef();const [drag,setDrag]=useState(false);const handle=f=>{if(!f||!f.type.startsWith("image/"))return;onChange({file:f,preview:URL.createObjectURL(f)});};return <div style={{marginBottom:8}}><div style={{fontSize:10,fontWeight:600,color:C.gold+"CC",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4,fontFamily:"monospace"}}>{label}</div>{hint&&<div style={{fontSize:9.5,color:C.dim,marginBottom:4,lineHeight:1.4}}>{hint}</div>}<div onClick={()=>!value&&ref.current?.click()} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0]);}} style={{border:`1.5px dashed ${value?C.gold+"60":drag?C.gold:C.border}`,borderRadius:8,background:value?C.gold+"08":drag?C.gold+"05":C.bg+"80",cursor:value?"default":"pointer",minHeight:value?"auto":72,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",transition:"all .2s",position:"relative"}}><input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handle(e.target.files[0])}/>{value?(<div style={{width:"100%",position:"relative"}}><img src={value.preview} alt={label} style={{width:"100%",display:"block",borderRadius:7,maxHeight:105,objectFit:"cover"}}/><button onClick={e=>{e.stopPropagation();onChange(null);}} style={{position:"absolute",top:4,right:4,width:18,height:18,background:"#000A",border:"none",borderRadius:"50%",color:"#fff",cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></div>):(<div style={{textAlign:"center",padding:"10px 8px"}}><div style={{fontSize:20,marginBottom:3,opacity:.4}}>📷</div><div style={{fontSize:9.5,color:C.dim}}>Cliquer ou déposer</div></div>)}</div></div>;}
function MRow({label,norme,normVal,value,onChange}){const [f,setF]=useState(false);const n=parseFloat(value);const col=!value?"#6A8AAA":n<=normVal?C.green:n<=normVal*1.6?C.gold:C.red;return <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:f?C.gold+"07":C.bg+"80",border:`1px solid ${f?C.gold+"40":C.border}`,borderRadius:7,marginBottom:5,transition:"all .2s"}}><div style={{flex:1,fontSize:11,color:C.text}}>{label}</div><div style={{fontSize:9,color:C.dim,fontFamily:"monospace",whiteSpace:"nowrap"}}>{norme}</div><input type="number" value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} placeholder="0" style={{width:48,padding:"4px 5px",borderRadius:5,fontSize:13,background:C.card,color:col,fontFamily:"monospace",fontWeight:700,border:`1px solid ${C.border}`,outline:"none",textAlign:"center"}}/><span style={{fontSize:12,color:col,fontWeight:700}}>°</span></div>;}

function S1({d,s}){return <div><StepTitle num="1">Identité du patient</StepTitle><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}><TI label="Prénom" value={d.prenom} onChange={v=>s({...d,prenom:v})} placeholder="Nicolas" required/><TI label="Nom" value={d.nom} onChange={v=>s({...d,nom:v})} placeholder="Manicom" required/></div><TI label="Date de séance" value={d.date} onChange={v=>s({...d,date:v})} placeholder="27 avril 2025" required/></div>;}
function S2({d,s}){return <div><StepTitle num="2">Bilan musculaire</StepTitle><Info>2 screenshots de la page "Déséquilibres musculaires" : corps de face et corps de dos.</Info><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><ImgSlot label="Corps de FACE" hint="Muscles colorés, vue frontale" value={d.face} onChange={v=>s({...d,face:v})}/><ImgSlot label="Corps de DOS" hint="Muscles colorés, vue dorsale" value={d.dos} onChange={v=>s({...d,dos:v})}/></div></div>;}
function S3({d,s}){const v=d.vals||{};return <div><StepTitle num="3">Mesures articulaires</StepTitle><Info>3 screenshots "Déséquilibres articulaires" puis saisissez les 12 valeurs.</Info><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}}><ImgSlot label="Vue ANTÉRIEURE" hint="Squelette de face" value={d.ant} onChange={vv=>s({...d,ant:vv})}/><ImgSlot label="Vue SAGITTALE" hint="Squelette de profil" value={d.sag} onChange={vv=>s({...d,sag:vv})}/><ImgSlot label="Vue POSTÉRIEURE" hint="Squelette de dos" value={d.post} onChange={vv=>s({...d,post:vv})}/></div><Lbl>Les 12 valeurs mesurées</Lbl><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px",marginTop:8}}>{MESURES.map(m=><MRow key={m.id} {...m} value={v[m.id]||""} onChange={vv=>s({...d,vals:{...v,[m.id]:vv}})}/>)}</div></div>;}
function S4({d,s}){const sections=[{k:"genoux",l:"Genoux",ph:"Au niveau des genoux, l\u2019alignement est globalement correct\u2026"},{k:"bassin",l:"Bassin",ph:"La bascule du bassin vers l\u2019avant\u2026"},{k:"lombaires",l:"Lombaires",ph:"La stabilit\u00e9 lombaire repose sur un \u00e9quilibre\u2026"},{k:"dorsales",l:"Dorsales & Cervicales",ph:"Le haut du dos et le cou sont maintenus par un \u00e9quilibre\u2026"}];return <div><StepTitle num="4">Interprétations posturales</StepTitle><Info>Ces textes seront intégrés tels quels dans la section 3 du bilan.</Info>{sections.map(sec=><TA key={sec.k} label={sec.l} value={d[sec.k]||""} onChange={v=>s({...d,[sec.k]:v})} placeholder={sec.ph} rows={5} hint="S'adresse directement au patient"/>)}</div>;}
function S5({d,s}){const plaintes=d.plaintes||[{citation:"",reponse:""}];const upd=(i,field,val)=>{const u=plaintes.map((p,x)=>x===i?{...p,[field]:val}:p);s({...d,plaintes:u});};return <div><StepTitle num="5">Plaintes & Réponses</StepTitle><Info>Pour chaque plainte : la citation exacte du patient + votre réponse médicale.</Info>{plaintes.map((p,i)=><div key={i} style={{background:C.bg+"90",border:`1px solid ${C.border}`,borderRadius:10,padding:"16px 16px 10px",marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:"monospace"}}>Plainte {i+1}</div>{i>0&&<button onClick={()=>s({...d,plaintes:plaintes.filter((_,x)=>x!==i)})} style={{background:"none",border:`1px solid ${C.red}40`,borderRadius:5,color:C.red+"80",cursor:"pointer",fontSize:11,padding:"2px 8px"}}>Supprimer</button>}</div><TA label="Citation du patient" value={p.citation} onChange={v=>upd(i,"citation",v)} placeholder={"\"Douleur au pli de l\u2019aine gauche\u2026\""} hint="Mot pour mot \u2014 apparaitra entre guillemets" rows={2}/><TA label="Votre réponse médicale" value={p.reponse} onChange={v=>upd(i,"reponse",v)} placeholder={"Explication du lien entre la posture et la douleur\u2026"} rows={5}/></div>)}{plaintes.length<3&&<button onClick={()=>s({...d,plaintes:[...plaintes,{citation:"",reponse:""}]})} style={{width:"100%",padding:"9px",borderRadius:8,background:"transparent",border:`1px dashed ${C.border}`,color:C.dim,cursor:"pointer",fontSize:12}}>+ Ajouter une plainte</button>}</div>;}
function S6({d,s}){return <div><StepTitle num="6">Programme d&apos;amélioration</StepTitle><Info>Les champs seront formatés automatiquement avec les badges ÉTIRER / RENFORCER / MOBILITÉ dans le PDF.</Info><div style={{background:C.gold+"08",border:`1px solid ${C.gold}30`,borderRadius:10,padding:"14px 16px",marginBottom:16}}><div style={{fontSize:12,fontWeight:700,color:C.gold,marginBottom:12}}>A — Bassin, lombaires et genoux</div><TA label="Objectif" value={d.objA||""} onChange={v=>s({...d,objA:v})} placeholder={"Redonner une stabilit\u00e9 naturelle au bassin\u2026"} rows={2}/><TA label={"ÉTIRER"} value={d.etirerA||""} onChange={v=>s({...d,etirerA:v})} placeholder={"Les quadriceps et les psoas\u2026"} rows={3}/><TA label="RENFORCER" value={d.renforcerA||""} onChange={v=>s({...d,renforcerA:v})} placeholder={"Les abdominaux et les fessiers\u2026"} rows={3}/><TA label="MOBILITÉ" value={d.mobiliteA||""} onChange={v=>s({...d,mobiliteA:v})} placeholder={"Exercice de mobilit\u00e9\u2026"} rows={2}/><TA label="Résultats attendus" value={d.resultatA||""} onChange={v=>s({...d,resultatA:v})} placeholder={"En r\u00e9\u00e9quilibrant ce couple musculaire\u2026"} rows={3}/></div><div style={{background:C.blue+"08",border:`1px solid ${C.blue}30`,borderRadius:10,padding:"14px 16px"}}><div style={{fontSize:12,fontWeight:700,color:C.blue+"CC",marginBottom:12}}>B — Haut du corps</div><TA label="Objectif" value={d.objB||""} onChange={v=>s({...d,objB:v})} placeholder={"R\u00e9duire le d\u00e9s\u00e9quilibre vers l\u2019avant\u2026"} rows={2}/><TA label={"ÉTIRER"} value={d.etirerB||""} onChange={v=>s({...d,etirerB:v})} placeholder={"Les pectoraux et les muscles du cou\u2026"} rows={3}/><TA label="RENFORCER" value={d.renforcerB||""} onChange={v=>s({...d,renforcerB:v})} placeholder={"Les muscles du dos entre les omoplates\u2026"} rows={3}/><TA label="Résultats attendus" value={d.resultatB||""} onChange={v=>s({...d,resultatB:v})} placeholder={"En ramenant la t\u00eate et le dos\u2026"} rows={2}/></div></div>;}
function makeAnn(num,title,info,slots){return function AnnS({d,s}){return <div><StepTitle num={num}>{title}</StepTitle><Info>{info}</Info><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>{slots.map(sl=><ImgSlot key={sl.k} label={sl.l} hint={sl.h} value={d[sl.k]} onChange={v=>s({...d,[sl.k]:v})}/>)}</div></div>;};}
const S7=makeAnn(7,"Annexe — Bassin","6 screenshots : 3 schémas angulaires + 3 images musculaires.",[{k:"bascule_s",l:"Schéma bascule avant",h:"Pelvis + valeur"},{k:"rotation_s",l:"Schéma rotation bassin",h:"Pelvis + valeur"},{k:"elevation_s",l:"Schéma élévation bassin",h:"Pelvis + valeur"},{k:"bascule_m",l:"Muscles — Bascule",h:"Rouge/bleu"},{k:"rotation_m",l:"Muscles — Rotation",h:"Rouge/bleu"},{k:"elevation_m",l:"Muscles — Élévation",h:"Rouge/bleu"}]);
const S8=makeAnn(8,"Annexe — Genoux","6 screenshots : 3 schémas angulaires + 3 images musculaires.",[{k:"droit_s",l:"Schéma genou Droit",h:"Jambe + angle"},{k:"gauche_s",l:"Schéma genou Gauche",h:"Jambe + angle"},{k:"recurv_s",l:"Schéma récurvatum",h:"Angle global"},{k:"droit_m",l:"Muscles — Genou Droit",h:"Rouge/bleu"},{k:"gauche_m",l:"Muscles — Genou Gauche",h:"Rouge/bleu"},{k:"recurv_m",l:"Muscles — Récurvatum",h:"Rouge/bleu"}]);
const S9=makeAnn(9,"Annexe — Lombaires","3 screenshots : schéma + 2 images musculaires.",[{k:"schema",l:"Schéma cambrure lombaire",h:"Vue sagittale + valeur"},{k:"bleu",l:"Muscles inhibés (bleu)",h:"Muscles en bleu"},{k:"rouge",l:"Muscles sollicités (rouge)",h:"Muscles en rouge"}]);
const S10=makeAnn(10,"Annexe — Dorsales & Cervicales","6 screenshots : 4 schémas + 2 images musculaires.",[{k:"epaules_s",l:"Schéma hauteur épaules",h:"Vue + valeur"},{k:"enroul_s",l:"Schéma enroulement",h:"Vue + valeur"},{k:"cervical_s",l:"Schéma rachis cervical",h:"Vue + valeur"},{k:"courb_s",l:"Schéma courbure dorsale",h:"Vue + valeur"},{k:"bleu",l:"Muscles inhibés (bleu)",h:"Muscles en bleu"},{k:"rouge",l:"Muscles sollicités (rouge)",h:"Muscles en rouge"}]);

function S11({allData,onGenerate,status}){
  const {identite:id,mesures,interp,plaintes:pl,programme:prog}=allData;
  const patient=`${id?.prenom||""} ${id?.nom||""}`.trim()||"—";
  const nbV=Object.values(mesures?.vals||{}).filter(Boolean).length;
  const nbP=(pl?.plaintes||[]).filter(p=>p.citation).length;
  const iOk=["genoux","bassin","lombaires","dorsales"].filter(k=>interp?.[k]?.trim()).length;
  const pOk=["objA","etirerA","renforcerA","objB","etirerB","renforcerB"].filter(k=>prog?.[k]?.trim()).length;
  if(status==="loading")return <div style={{textAlign:"center",padding:"56px 0"}}><div style={{width:52,height:52,borderRadius:"50%",border:`3px solid ${C.border}`,borderTop:`3px solid ${C.gold}`,animation:"spin .85s linear infinite",margin:"0 auto 20px"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{color:C.gold,fontSize:15,fontWeight:600,fontFamily:"Georgia,serif",marginBottom:6}}>Mise en page du bilan…</div><div style={{color:C.dim,fontSize:12}}>Composition · Design SANTEO · Intégration des images</div></div>;
  if(status==="done")return <div style={{textAlign:"center",padding:"44px 0"}}><div style={{width:60,height:60,borderRadius:"50%",border:`2px solid ${C.gold}`,background:C.gold+"15",fontSize:28,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>✓</div><div style={{color:C.white,fontSize:20,fontFamily:"Georgia,serif",marginBottom:6}}>Bilan ouvert dans un nouvel onglet !</div><div style={{color:C.dim,fontSize:12,marginBottom:6,lineHeight:1.7}}>Cliquez sur <strong style={{color:C.gold}}>"Enregistrer en PDF"</strong> en haut de la page<br/>ou faites <strong style={{color:C.gold}}>Ctrl+P</strong> → "Enregistrer au format PDF"</div><div style={{background:C.blue+"10",border:`1px solid ${C.blue}25`,borderRadius:8,padding:"10px 16px",maxWidth:360,margin:"12px auto 0",fontSize:11,color:C.blue+"BB",lineHeight:1.7}}>💡 Dans Chrome : cochez <strong>"Graphiques d'arrière-plan"</strong> si le fond n'apparaît pas.</div></div>;
  return <div><StepTitle num="11">Récapitulatif & Génération</StepTitle><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:20,marginBottom:16}}><div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:14,fontFamily:"monospace"}}>VÉRIFICATION DU DOSSIER</div>{[{l:"Patient identifié",v:patient,ok:!!(id?.prenom&&id?.nom&&id?.date)},{l:"Mesures articulaires",v:`${nbV}/12`,ok:nbV>=10},{l:"Interprétations rédigées",v:`${iOk}/4`,ok:iOk>=4},{l:"Plaintes & réponses",v:`${nbP} plainte(s)`,ok:nbP>=1},{l:"Programme",v:`${pOk}/6 champs`,ok:pOk>=4}].map(c=><div key={c.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:12,color:C.dim}}>{c.l}</span><span style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,color:C.text}}>{c.v}</span><span style={{fontSize:13}}>{c.ok?"✅":"⚠️"}</span></span></div>)}</div><button onClick={onGenerate} style={{width:"100%",padding:15,fontSize:15,fontWeight:700,background:`linear-gradient(135deg,${C.gold},${C.goldL})`,border:"none",borderRadius:9,color:C.bg,cursor:"pointer",letterSpacing:"0.02em",boxShadow:`0 4px 20px ${C.gold}35`}}>⚡ Générer le bilan de {patient}</button></div>;
}

export default function App(){
  const [step,setStep]=useState(0);const [status,setStatus]=useState("idle");
  const [identite,setIdentite]=useState({prenom:"",nom:"",date:""});
  const [musculaire,setMusculaire]=useState({});const [mesures,setMesures]=useState({vals:{}});
  const [interp,setInterp]=useState({});const [plaintesD,setPlaintesD]=useState({plaintes:[{citation:"",reponse:""}]});
  const [programme,setProgramme]=useState({});const [bassin,setBassin]=useState({});
  const [genoux,setGenoux]=useState({});const [lombaires,setLombaires]=useState({});const [dorsales,setDorsales]=useState({});
  const allData={identite,musculaire,mesures,interp,plaintes:plaintesD,programme,bassin,genoux,lombaires,dorsales};
  const handleGenerate=async()=>{
    setStatus("loading");
    const win=window.open("","_blank");
    if(win)win.document.write(`<html><body style="background:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:Arial"><p style="color:#2B4A7A;font-size:16px">Génération en cours…</p></body></html>`);
    try{const imgs=await collectImgs(allData);const html=buildPDFHTML(allData,imgs);if(win){win.document.open();win.document.write(html);win.document.close();}setStatus("done");}
    catch(e){console.error(e);if(win)win.close();setStatus("idle");alert("Erreur. Réessayez.");}
  };
  const reset=()=>{setStep(0);setStatus("idle");setIdentite({prenom:"",nom:"",date:""});setMusculaire({});setMesures({vals:{}});setInterp({});setPlaintesD({plaintes:[{citation:"",reponse:""}]});setProgramme({});setBassin({});setGenoux({});setLombaires({});setDorsales({});};
  const canNext=[!!(identite.prenom&&identite.nom&&identite.date),true,true,!!(interp.genoux||interp.bassin),!!(plaintesD.plaintes?.[0]?.citation),!!(programme.objA||programme.etirerA),true,true,true,true,true][step];
  const stepEls=[<S1 d={identite} s={setIdentite}/>,<S2 d={musculaire} s={setMusculaire}/>,<S3 d={mesures} s={setMesures}/>,<S4 d={interp} s={setInterp}/>,<S5 d={plaintesD} s={setPlaintesD}/>,<S6 d={programme} s={setProgramme}/>,<S7 d={bassin} s={setBassin}/>,<S8 d={genoux} s={setGenoux}/>,<S9 d={lombaires} s={setLombaires}/>,<S10 d={dorsales} s={setDorsales}/>,<S11 allData={allData} onGenerate={handleGenerate} status={status}/>];
  return <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
    <style>{`*{box-sizing:border-box}input,textarea{color:inherit!important}input::placeholder,textarea::placeholder{color:${C.dim}70!important}input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${C.bg2}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}`}</style>
    <div style={{background:C.bg2,borderBottom:`2px solid ${C.gold}`,padding:"11px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:29,height:29,borderRadius:7,background:C.gold+"20",border:`1px solid ${C.gold}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>⚕️</div><div><div style={{fontSize:13,fontWeight:700,color:C.white}}>SANTEO · Générateur de bilans posturaux</div><div style={{fontSize:9.5,color:C.dim}}>PAYET Guillaume · Ostéopathe D.O</div></div></div>
      <div style={{fontSize:9.5,color:C.dim,textAlign:"right",lineHeight:1.7}}><div>+262 692 22 76 60</div><div>pg.osteoptahe@gmail.com</div></div>
    </div>
    <div style={{maxWidth:840,margin:"0 auto",padding:"24px 16px 80px"}}>
      <div style={{display:"flex",gap:4,marginBottom:22,overflowX:"auto",paddingBottom:4}}>{STEPS.map((s,i)=>{const done=i<step,active=i===step;return <button key={i} onClick={()=>i<step&&setStep(i)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",borderRadius:7,flexShrink:0,fontSize:11,fontWeight:active?700:400,border:`1px solid ${active?C.gold:done?C.gold+"40":C.border}`,background:active?C.gold+"15":done?C.gold+"08":"transparent",color:active?C.gold:done?C.gold+"90":C.dim,cursor:i<step?"pointer":"default",transition:"all .2s"}}><span>{s.icon}</span><span style={{whiteSpace:"nowrap"}}>{s.label}</span>{done&&<span style={{color:C.green,fontSize:10}}>✓</span>}</button>;})}
      </div>
      <div style={{height:3,background:C.border,borderRadius:2,marginBottom:22,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:`linear-gradient(90deg,${C.gold},${C.goldL})`,width:`${(step/(STEPS.length-1))*100}%`,transition:"width .4s ease"}}/></div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"24px 20px",minHeight:300}}>{stepEls[step]}</div>
      {status!=="loading"&&status!=="done"&&<div style={{display:"flex",justifyContent:"space-between",marginTop:14}}><button onClick={()=>setStep(s=>s-1)} disabled={step===0} style={{padding:"10px 22px",borderRadius:8,fontSize:13,background:"transparent",border:`1px solid ${C.border}`,color:step===0?C.border:C.dim,cursor:step===0?"default":"pointer"}}>← Retour</button>{step<STEPS.length-1&&<button onClick={()=>setStep(s=>s+1)} disabled={!canNext} style={{padding:"10px 28px",borderRadius:8,fontSize:13,fontWeight:600,background:canNext?`linear-gradient(135deg,${C.gold},${C.goldL})`:C.border,border:"none",color:canNext?C.bg:C.dim,cursor:canNext?"pointer":"default",boxShadow:canNext?`0 3px 14px ${C.gold}30`:"none",transition:"all .2s"}}>{step===STEPS.length-2?"Voir le récap →":"Étape suivante →"}</button>}</div>}
      {status==="done"&&<div style={{textAlign:"center",marginTop:14}}><button onClick={reset} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,color:C.dim,padding:"8px 18px",cursor:"pointer",fontSize:12}}>+ Nouveau patient</button></div>}
      <div style={{textAlign:"center",marginTop:20,fontSize:10,color:C.border}}>Conçu par <span style={{color:C.gold+"60"}}>Signature Web</span></div>
    </div>
  </div>;
}

