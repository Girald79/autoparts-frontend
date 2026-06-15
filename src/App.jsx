import { useState, useEffect, useCallback, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "https://ton-app.railway.app";

// ── SUPABASE STORAGE ──────────────────────────────────────────────────────────
const SB_URL = "https://qbomcjfbsuatunlhdprr.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFib21jamZic3VhdHVubGhkcHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0ODg5NDAsImV4cCI6MjA5NzA2NDk0MH0.RJCJr7VZPrhBQsK2zZyz4l4n_HOBdKYeYnxWXRYZNfY";
const BUCKET = "image piece";

async function uploadPhoto(file, ref) {
  const ext = file.name.split(".").pop();
  const path = `${ref}/${Date.now()}.${ext}`;
  const res = await fetch(`${SB_URL}/storage/v1/object/${encodeURIComponent(BUCKET)}/${path}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${SB_KEY}`, "Content-Type": file.type, "x-upsert": "true" },
    body: file,
  });
  if (!res.ok) throw new Error("Erreur upload");
  return `${SB_URL}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${path}`;
}

async function deletePhoto(url) {
  const path = url.split(`/object/public/${encodeURIComponent(BUCKET)}/`)[1];
  if (!path) return;
  await fetch(`${SB_URL}/storage/v1/object/${encodeURIComponent(BUCKET)}/${path}`, {
    method: "DELETE", headers: { "Authorization": `Bearer ${SB_KEY}` },
  });
}

// ── DESIGN ────────────────────────────────────────────────────────────────────
const T = {
  bg:"#0F1117",surface:"#1A1D27",card:"#22263A",border:"#2E3350",
  amber:"#F5A623",amberDim:"#7A5312",green:"#2ECC71",greenDim:"#1A5C3A",
  red:"#E74C3C",redDim:"#6B2020",blue:"#3498DB",purple:"#9B59B6",
  text:"#E8EAF2",muted:"#7B82A0",white:"#FFFFFF",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${T.bg};color:${T.text};font-family:'Space Grotesk',sans-serif;min-height:100vh}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${T.surface}}::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
  .mono{font-family:'JetBrains Mono',monospace}
  input,select,textarea{font-family:'Space Grotesk',sans-serif}
  @media print{.no-print{display:none!important}body{background:white;color:black}}
`;

// ── API HELPER ────────────────────────────────────────────────────────────────
async function api(path, method = "GET", body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : null });
  if (!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err.erreur || `Erreur ${res.status}`); }
  return res.json();
}

// ── OFFLINE QUEUE ─────────────────────────────────────────────────────────────
const QUEUE_KEY = "autoparts_offline_queue";
function getQueue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY)||"[]"); } catch { return []; } }
function addToQueue(item) { const q=getQueue(); q.push(item); localStorage.setItem(QUEUE_KEY,JSON.stringify(q)); }
function clearQueue() { localStorage.removeItem(QUEUE_KEY); }

// ── UTILS ─────────────────────────────────────────────────────────────────────
const genId  = p => p + Date.now().toString(36).toUpperCase();
const today  = () => new Date().toISOString().split("T")[0];
const dateHT = d => new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
const fmt    = n => new Intl.NumberFormat("fr-HT").format(Math.round(n)) + " HTG";
const fmtUSD = (n,t) => "$" + (n/t).toFixed(2);

// ── BASE COMPONENTS ───────────────────────────────────────────────────────────
const Badge = ({color,children}) => (
  <span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600,letterSpacing:"0.05em"}}>{children}</span>
);
const Btn = ({onClick,color=T.amber,outline,small,children,style={},disabled}) => (
  <button onClick={onClick} disabled={disabled} style={{background:outline?"transparent":color,color:outline?color:(color===T.amber?"#000":T.white),border:`1px solid ${color}`,borderRadius:6,padding:small?"5px 12px":"9px 18px",fontSize:small?12:14,fontWeight:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,...style}}
    onMouseEnter={e=>{if(!disabled)e.currentTarget.style.opacity=".8"}} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{children}</button>
);
const Input = ({label,value,onChange,placeholder,type="text",style={}}) => (
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    {label&&<label style={{fontSize:12,color:T.muted,fontWeight:600,letterSpacing:"0.05em"}}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"9px 12px",color:T.text,fontSize:14,outline:"none",...style}}/>
  </div>
);
const Sel = ({label,value,onChange,options}) => (
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    {label&&<label style={{fontSize:12,color:T.muted,fontWeight:600,letterSpacing:"0.05em"}}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"9px 12px",color:T.text,fontSize:14,outline:"none"}}>
      {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
    </select>
  </div>
);
const Card = ({children,style={}}) => <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:16,...style}}>{children}</div>;
const Modal = ({title,onClose,children,wide}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,width:"100%",maxWidth:wide?720:560,maxHeight:"92vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${T.border}`}}>
        <span style={{fontWeight:700,fontSize:16}}>{title}</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,fontSize:22,cursor:"pointer"}}>×</button>
      </div>
      <div style={{padding:20}}>{children}</div>
    </div>
  </div>
);
const StockBadge = ({qte,qte_min}) => {
  if(qte===0) return <Badge color={T.red}>Rupture</Badge>;
  if(qte<=qte_min) return <Badge color={T.amber}>Stock bas</Badge>;
  return <Badge color={T.green}>En stock</Badge>;
};
const PageHeader = ({label,title,action}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:4}}>
    <div><div style={{fontSize:11,color:T.muted,letterSpacing:"0.08em"}}>{label}</div><div style={{fontSize:22,fontWeight:700}}>{title}</div></div>
    {action}
  </div>
);
const Spinner = () => <div style={{textAlign:"center",padding:40,color:T.muted}}>Chargement…</div>;
const ErrMsg  = ({msg}) => <div style={{color:T.red,padding:12,background:T.redDim+"33",borderRadius:6,fontSize:13}}>{msg}</div>;
const OfflineBanner = ({isOffline,queueLen}) => !isOffline ? null : (
  <div style={{background:T.amberDim,borderBottom:`1px solid ${T.amber}`,padding:"8px 16px",textAlign:"center",fontSize:12,color:T.amber}}>
    ⚠ Mode hors-ligne — {queueLen>0?`${queueLen} vente${queueLen>1?"s":""} en attente de synchronisation`:"Les ventes seront synchronisées au retour d'internet"}
  </div>
);

// ── PHOTO GALLERY COMPONENT ───────────────────────────────────────────────────
function PhotoGallery({photos,onRemove,uploading,onAdd,fileRef}) {
  return (
    <div style={{background:T.surface,borderRadius:8,padding:12}}>
      <div style={{fontSize:12,color:T.muted,fontWeight:600,marginBottom:8}}>📷 PHOTOS DE LA PIÈCE ({photos.length}/5)</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
        {photos.map((url,i)=>(
          <div key={i} style={{position:"relative",width:80,height:80}}>
            <img src={url} alt={`Photo ${i+1}`} style={{width:80,height:80,objectFit:"cover",borderRadius:6,border:`1px solid ${T.border}`}}/>
            {onRemove&&(
              <button onClick={()=>onRemove(url)} style={{position:"absolute",top:-6,right:-6,width:20,height:20,borderRadius:"50%",background:T.red,border:"none",color:"white",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>×</button>
            )}
          </div>
        ))}
        {photos.length===0&&<div style={{color:T.muted,fontSize:12,padding:"10px 0"}}>Aucune photo ajoutée</div>}
      </div>
      {onAdd&&photos.length<5&&(
        <>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={onAdd} style={{display:"none"}}/>
          <Btn small outline onClick={()=>fileRef.current?.click()} color={T.blue} disabled={uploading}>
            {uploading?"Téléchargement…":"📷 Ajouter des photos"}
          </Btn>
          <div style={{fontSize:10,color:T.muted,marginTop:4}}>Max 5 photos · Prendre en photo ou choisir depuis la galerie</div>
        </>
      )}
    </div>
  );
}

// ── TAUX WIDGET ───────────────────────────────────────────────────────────────
function TauxWidget({taux,setTaux,token}) {
  const [edit,setEdit]=useState(false);
  const [val,setVal]=useState(taux.toString());
  const [fetching,setFetching]=useState(false);
  const [lastUpdate,setLastUpdate]=useState("Manuel");

  const fetchTaux=async()=>{
    setFetching(true);
    try{
      const d=await api("/api/taux","GET",null,token);
      setTaux(d.taux);setVal(d.taux.toString());
      setLastUpdate("Auto · "+new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}));
    }catch{setLastUpdate("Pas de connexion");}
    setFetching(false);
  };
  const save=()=>{const n=parseFloat(val);if(n>1){setTaux(n);setLastUpdate("Manuel");}setEdit(false);};

  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <div style={{fontSize:11,color:T.muted,fontWeight:600}}>USD/HTG</div>
      {edit?(
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <input value={val} onChange={e=>setVal(e.target.value)} style={{width:65,background:T.card,border:`1px solid ${T.amber}`,borderRadius:4,padding:"3px 6px",color:T.text,fontSize:13,outline:"none"}}/>
          <Btn small onClick={save}>OK</Btn><Btn small outline onClick={()=>setEdit(false)}>✕</Btn>
        </div>
      ):(
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontWeight:700,color:T.amber,fontSize:14,fontFamily:"monospace"}}>1$ = {taux} HTG</span>
          <Btn small outline onClick={()=>setEdit(true)} color={T.muted}>Modifier</Btn>
          <Btn small outline onClick={fetchTaux} color={T.blue}>{fetching?"…":"🔄"}</Btn>
        </div>
      )}
      <span style={{fontSize:10,color:T.muted,marginLeft:"auto"}}>{lastUpdate}</span>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({token,taux,pieces,ventes,demandes,commandes}) {
  const ventesJour   = ventes.filter(v=>v.created_at?.startsWith(today())||v.date===today());
  const totalJour    = ventesJour.reduce((s,v)=>s+(+v.sous_total||+v.sousTotal||0),0);
  const ruptures     = pieces.filter(p=>p.qte===0);
  const stockBas     = pieces.filter(p=>p.qte>0&&p.qte<=p.qte_min);
  const top5         = [...pieces].sort((a,b)=>b.vendu-a.vendu).slice(0,5);
  const valeurStock  = pieces.reduce((s,p)=>s+p.qte*+p.prix_achat,0);
  const cmdEnCours   = commandes.filter(c=>c.statut==="En attente"||c.statut==="Confirmée");

  const StatCard=({label,value,sub,color=T.amber})=>(
    <Card style={{flex:1,minWidth:140}}>
      <div style={{color:T.muted,fontSize:11,fontWeight:600,letterSpacing:"0.06em",marginBottom:6}}>{label}</div>
      <div style={{fontSize:24,fontWeight:700,color,lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:T.muted,marginTop:4}}>{sub}</div>}
    </Card>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <PageHeader label="TABLEAU DE BORD" title="Vue d'ensemble"/>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <StatCard label="VENTES AUJOURD'HUI" value={fmt(totalJour)} sub={`${fmtUSD(totalJour,taux)} · ${ventesJour.length} transaction${ventesJour.length!==1?"s":""}`} color={T.green}/>
        <StatCard label="VALEUR DU STOCK" value={fmt(valeurStock)} sub={fmtUSD(valeurStock,taux)}/>
        <StatCard label="PIÈCES RÉFÉRENCÉES" value={pieces.length} sub="références actives" color={T.blue}/>
        <StatCard label="ALERTES" value={ruptures.length+stockBas.length} sub={`${ruptures.length} rupture · ${stockBas.length} bas`} color={ruptures.length>0?T.red:T.amber}/>
      </div>
      {cmdEnCours.length>0&&(
        <Card style={{borderColor:T.purple+"66"}}>
          <div style={{fontWeight:700,marginBottom:10,color:T.purple}}>📦 Commandes fournisseurs en cours ({cmdEnCours.length})</div>
          {cmdEnCours.map(c=>(
            <div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.border}`,fontSize:13}}>
              <span>BC-{c.id} — {c.fournisseur_nom}</span><Badge color={T.purple}>{c.statut}</Badge>
            </div>
          ))}
        </Card>
      )}
      {(ruptures.length>0||stockBas.length>0)&&(
        <Card style={{borderColor:ruptures.length>0?T.redDim:T.amberDim}}>
          <div style={{fontWeight:700,marginBottom:12,color:ruptures.length>0?T.red:T.amber}}>⚠ Alertes de stock</div>
          {[...ruptures,...stockBas].map(p=>(
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:T.surface,borderRadius:6,marginBottom:6}}>
              <div>
                {(p.photos||[]).length>0&&<img src={p.photos[0]} alt="" style={{width:40,height:40,objectFit:"cover",borderRadius:4,marginBottom:4,display:"block"}}/>}
                <span className="mono" style={{fontSize:11,color:T.muted}}>{p.ref}</span>
                <div style={{fontWeight:600,fontSize:14}}>{p.nom}</div>
                <div style={{fontSize:11,color:T.muted}}>📍 {p.localisation}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <StockBadge qte={p.qte} qte_min={p.qte_min}/>
                <div style={{fontSize:11,color:T.muted,marginTop:4}}>Qté: {p.qte} / Min: {p.qte_min}</div>
              </div>
            </div>
          ))}
        </Card>
      )}
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
        <Card style={{flex:2,minWidth:260}}>
          <div style={{fontWeight:700,marginBottom:12}}>🏆 Pièces les plus vendues</div>
          {top5.map((p,i)=>(
            <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<4?`1px solid ${T.border}`:"none"}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:i===0?T.amber+"33":T.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:i===0?T.amber:T.muted}}>{i+1}</div>
              {(p.photos||[]).length>0&&<img src={p.photos[0]} alt="" style={{width:32,height:32,objectFit:"cover",borderRadius:4}}/>}
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{p.nom}</div><div style={{fontSize:11,color:T.muted}}>{p.marque}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontWeight:700,color:T.green}}>{p.vendu}</div><div style={{fontSize:10,color:T.muted}}>vendus</div></div>
            </div>
          ))}
        </Card>
        <Card style={{flex:1,minWidth:220}}>
          <div style={{fontWeight:700,marginBottom:12}}>📋 Demandes en attente</div>
          {demandes.filter(d=>d.statut!=="Livrée").slice(0,4).map(d=>(
            <div key={d.id} style={{padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{d.piece}</div>
              <div style={{fontSize:11,color:T.muted}}>{d.client}</div>
              <Badge color={d.statut==="Commandée"?T.blue:T.amber}>{d.statut}</Badge>
            </div>
          ))}
          {demandes.filter(d=>d.statut!=="Livrée").length===0&&<div style={{color:T.muted,fontSize:13}}>Aucune demande en cours</div>}
        </Card>
      </div>
    </div>
  );
}

// ── INVENTAIRE ────────────────────────────────────────────────────────────────
const CATEGORIES=["Filtration","Freinage","Suspension","Électrique","Transmission","Allumage","Direction","Refroidissement","Carrosserie","Autre"];
const ZONES=["A","B","C","D","E"];

function Inventaire({token,taux,pieces,setPieces,fournisseurs}) {
  const [search,setSearch]=useState("");
  const [catFilter,setCatFilter]=useState("Toutes");
  const [stockFilter,setStockFilter]=useState("Tous");
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");
  const [photos,setPhotos]=useState([]);
  const [uploading,setUploading]=useState(false);
  const [viewPhoto,setViewPhoto]=useState(null);
  const fileRef=useRef();

  const filtered=pieces.filter(p=>{
    const q=search.toLowerCase();
    const ms=!q||[p.nom,p.ref,p.marque,...(p.vehicules||[]),p.localisation].join(" ").toLowerCase().includes(q);
    const mc=catFilter==="Toutes"||p.categorie===catFilter;
    const mst=stockFilter==="Tous"||(stockFilter==="Rupture"&&p.qte===0)||(stockFilter==="Bas"&&p.qte>0&&p.qte<=p.qte_min)||(stockFilter==="OK"&&p.qte>p.qte_min);
    return ms&&mc&&mst;
  });

  const blank=()=>({ref:"",nom:"",marque:"",categorie:"Filtration",qte:"",qte_min:"",prix_achat:"",prix_vente:"",zone:"A",etagere:"01",niveau:"1",position:"A",vehicules:"",fournisseur_id:""});

  const toApiBody=f=>({ref:f.ref,nom:f.nom,marque:f.marque,categorie:f.categorie,qte:+f.qte,qte_min:+f.qte_min,prix_achat:+f.prix_achat,prix_vente:+f.prix_vente,localisation:`${f.zone}-${f.etagere}-${f.niveau}-${f.position}`,vehicules:f.vehicules.split("\n").map(s=>s.trim()).filter(Boolean),fournisseur_id:f.fournisseur_id||null,photos});

  const handlePhotoSelect=async(e)=>{
    const files=Array.from(e.target.files);
    if(!form.ref){setErr("Entrez d'abord la référence avant d'ajouter des photos.");return;}
    if(photos.length+files.length>5){setErr("Maximum 5 photos par pièce.");return;}
    setUploading(true);setErr("");
    try{
      const urls=await Promise.all(files.map(f=>uploadPhoto(f,form.ref||"piece")));
      setPhotos(prev=>[...prev,...urls]);
    }catch(e){setErr("Erreur upload: "+e.message);}
    setUploading(false);
    e.target.value="";
  };

  const removePhoto=async(url)=>{
    try{await deletePhoto(url);}catch{}
    setPhotos(prev=>prev.filter(u=>u!==url));
  };

  const save=async()=>{
    setSaving(true);setErr("");
    try{
      if(modal==="add"){
        const p=await api("/api/pieces","POST",toApiBody(form),token);
        setPieces(prev=>[...prev,{...p,photos}]);
      } else {
        const p=await api(`/api/pieces/${form.id}`,"PUT",toApiBody(form),token);
        setPieces(prev=>prev.map(x=>x.id===form.id?{...p,photos}:x));
      }
      setModal(null);setPhotos([]);setForm({});
    }catch(e){setErr(e.message);}
    setSaving(false);
  };

  const openEdit=p=>{
    const [zone="A",etagere="01",niveau="1",position="A"]=(p.localisation||"").split("-");
    setForm({...p,zone,etagere,niveau,position,vehicules:(p.vehicules||[]).join("\n"),fournisseur_id:p.fournisseur_id||""});
    setPhotos(p.photos||[]);
    setModal("edit");
  };

  const marge=form.prix_achat&&form.prix_vente?+form.prix_vente - +form.prix_achat:0;
  const fournOptions=[{value:"",label:"— Aucun —"},...fournisseurs.map(f=>({value:f.id,label:f.nom}))];

  const PieceForm=()=>(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {err&&<ErrMsg msg={err}/>}
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><Input label="RÉFÉRENCE" value={form.ref||""} onChange={v=>setForm(f=>({...f,ref:v}))} placeholder="FH-4521"/></div>
        <div style={{flex:1}}><Input label="MARQUE" value={form.marque||""} onChange={v=>setForm(f=>({...f,marque:v}))} placeholder="Bosch"/></div>
      </div>
      <Input label="NOM DE LA PIÈCE" value={form.nom||""} onChange={v=>setForm(f=>({...f,nom:v}))} placeholder="Filtre à huile"/>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><Sel label="CATÉGORIE" value={form.categorie||"Filtration"} onChange={v=>setForm(f=>({...f,categorie:v}))} options={CATEGORIES}/></div>
        <div style={{flex:1}}><Sel label="FOURNISSEUR" value={form.fournisseur_id||""} onChange={v=>setForm(f=>({...f,fournisseur_id:v}))} options={fournOptions}/></div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><Input label="QUANTITÉ" type="number" value={form.qte||""} onChange={v=>setForm(f=>({...f,qte:v}))} placeholder="0"/></div>
        <div style={{flex:1}}><Input label="QTÉ MINIMUM" type="number" value={form.qte_min||""} onChange={v=>setForm(f=>({...f,qte_min:v}))} placeholder="3"/></div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><Input label="PRIX ACHAT (HTG)" type="number" value={form.prix_achat||""} onChange={v=>setForm(f=>({...f,prix_achat:v}))}/></div>
        <div style={{flex:1}}><Input label="PRIX VENTE (HTG)" type="number" value={form.prix_vente||""} onChange={v=>setForm(f=>({...f,prix_vente:v}))}/></div>
      </div>
      {marge>0&&<div style={{background:T.surface,borderRadius:6,padding:"8px 12px",fontSize:12}}>Marge : <span style={{color:T.green,fontWeight:700}}>{fmt(marge)}</span> · {fmtUSD(marge,taux)} ({Math.round(marge/+form.prix_vente*100)}%)</div>}
      <div style={{background:T.surface,borderRadius:8,padding:12}}>
        <div style={{fontSize:12,color:T.muted,fontWeight:600,marginBottom:8}}>📍 LOCALISATION</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Sel label="ZONE" value={form.zone||"A"} onChange={v=>setForm(f=>({...f,zone:v}))} options={ZONES}/>
          <Input label="ÉTAGÈRE" value={form.etagere||""} onChange={v=>setForm(f=>({...f,etagere:v}))} placeholder="01" style={{width:70}}/>
          <Input label="NIVEAU" value={form.niveau||""} onChange={v=>setForm(f=>({...f,niveau:v}))} placeholder="1" style={{width:60}}/>
          <Input label="POS." value={form.position||""} onChange={v=>setForm(f=>({...f,position:v}))} placeholder="A" style={{width:55}}/>
        </div>
        {form.zone&&<div style={{marginTop:8,fontFamily:"monospace",fontSize:13,color:T.amber}}>→ {form.zone}-{form.etagere}-{form.niveau}-{form.position}</div>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        <label style={{fontSize:12,color:T.muted,fontWeight:600}}>VÉHICULES COMPATIBLES (un par ligne)</label>
        <textarea value={form.vehicules||""} onChange={e=>setForm(f=>({...f,vehicules:e.target.value}))} rows={3}
          placeholder={"Toyota Corolla 2010-2018\nToyota Camry 2012-2020"}
          style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"9px 12px",color:T.text,fontSize:13,resize:"vertical"}}/>
      </div>
      <PhotoGallery photos={photos} onRemove={removePhoto} uploading={uploading} onAdd={handlePhotoSelect} fileRef={fileRef}/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:4}}>
        <Btn outline onClick={()=>{setModal(null);setPhotos([]);setForm({});}}>Annuler</Btn>
        <Btn onClick={save} disabled={saving}>{saving?"Enregistrement…":modal==="edit"?"Enregistrer":"Ajouter la pièce"}</Btn>
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <PageHeader label="INVENTAIRE" title={`${pieces.length} références · ${filtered.length} affichées`} action={<Btn onClick={()=>{setForm(blank());setPhotos([]);setModal("add");}}>+ Nouvelle pièce</Btn>}/>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Chercher pièce, ref, véhicule, emplacement..."
          style={{flex:1,minWidth:200,background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"9px 14px",color:T.text,fontSize:14,outline:"none"}}/>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"9px 12px",color:T.text,fontSize:13}}>
          <option>Toutes</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={stockFilter} onChange={e=>setStockFilter(e.target.value)} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"9px 12px",color:T.text,fontSize:13}}>
          <option value="Tous">Tous les stocks</option><option value="OK">En stock</option><option value="Bas">Stock bas</option><option value="Rupture">Rupture</option>
        </select>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.length===0&&<Card><div style={{color:T.muted,textAlign:"center",padding:20}}>Aucune pièce trouvée</div></Card>}
        {filtered.map(p=>(
          <Card key={p.id} style={{cursor:"pointer"}} onClick={()=>openEdit(p)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
              {/* Photo miniature */}
              {(p.photos||[]).length>0&&(
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <img src={p.photos[0]} alt={p.nom} onClick={e=>{e.stopPropagation();setViewPhoto(p.photos);}}
                    style={{width:64,height:64,objectFit:"cover",borderRadius:6,border:`1px solid ${T.border}`,cursor:"zoom-in"}}/>
                  {p.photos.length>1&&<div style={{fontSize:10,color:T.muted,textAlign:"center"}}>+{p.photos.length-1}</div>}
                </div>
              )}
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                  <span className="mono" style={{fontSize:11,color:T.amber,fontWeight:600}}>{p.ref}</span>
                  <Badge color={T.blue}>{p.categorie}</Badge>
                  <StockBadge qte={p.qte} qte_min={p.qte_min}/>
                </div>
                <div style={{fontWeight:700,fontSize:15}}>{p.nom}</div>
                <div style={{fontSize:12,color:T.muted}}>{p.marque}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>📍 <span style={{color:T.text,fontFamily:"monospace"}}>{p.localisation}</span></div>
                <div style={{fontSize:11,color:T.muted,marginTop:2}}>🚗 {(p.vehicules||[]).slice(0,2).join(" · ")}{(p.vehicules||[]).length>2?` +${p.vehicules.length-2}`:""}</div>
                {p.fournisseur_nom&&<div style={{fontSize:11,color:T.purple,marginTop:2}}>🏭 {p.fournisseur_nom}</div>}
              </div>
              <div style={{textAlign:"right",minWidth:110}}>
                <div style={{fontSize:18,fontWeight:700}}>{p.qte}</div>
                <div style={{fontSize:10,color:T.muted,marginBottom:6}}>en stock</div>
                <div style={{fontSize:13,fontWeight:600,color:T.green}}>{fmt(p.prix_vente)}</div>
                <div style={{fontSize:11,color:T.muted}}>{fmtUSD(p.prix_vente,taux)}</div>
                <div style={{fontSize:11,color:T.muted}}>Achat: {fmt(p.prix_achat)}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {modal&&<Modal title={modal==="edit"?"Modifier la pièce":"Ajouter une pièce"} onClose={()=>{setModal(null);setPhotos([]);setForm({});}}><PieceForm/></Modal>}
      {/* Visionneuse de photos */}
      {viewPhoto&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:2000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setViewPhoto(null)}>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
            {viewPhoto.map((url,i)=>(
              <img key={i} src={url} alt={`Photo ${i+1}`} style={{maxWidth:300,maxHeight:300,objectFit:"contain",borderRadius:8,border:`2px solid ${T.amber}`}}/>
            ))}
          </div>
          <div style={{color:T.muted,fontSize:12,marginTop:16}}>Cliquer pour fermer</div>
        </div>
      )}
    </div>
  );
}

// ── NOUVELLE VENTE ────────────────────────────────────────────────────────────
function NouvelleVente({token,taux,pieces,setPieces,ventes,setVentes,employe,isOffline}) {
  const [client,setClient]=useState("");
  const [tel,setTel]=useState("");
  const [vehicule,setVehicule]=useState("");
  const [panier,setPanier]=useState([]);
  const [search,setSearch]=useState("");
  const [recu,setRecu]=useState("");
  const [facture,setFacture]=useState(null);
  const [saving,setSaving]=useState(false);

  const results=search.length>1?pieces.filter(p=>[p.nom,p.ref,...(p.vehicules||[])].join(" ").toLowerCase().includes(search.toLowerCase())&&p.qte>0).slice(0,5):[];
  const addToPanier=p=>{setPanier(prev=>{const ex=prev.find(x=>x.ref===p.ref);if(ex)return prev.map(x=>x.ref===p.ref?{...x,qty:x.qty+1,total:(x.qty+1)*x.pu}:x);return [...prev,{ref:p.ref,nom:p.nom,qty:1,pu:+p.prix_vente,total:+p.prix_vente,photo:(p.photos||[])[0]||null}];});setSearch("");};
  const removeFromPanier=ref=>setPanier(prev=>prev.filter(x=>x.ref!==ref));
  const updateQty=(ref,qty)=>setPanier(prev=>prev.map(x=>x.ref===ref?{...x,qty:+qty,total:+qty*x.pu}:x));
  const sousTotal=panier.reduce((s,x)=>s+x.total,0);
  const monnaie=recu?+recu-sousTotal:0;

  const finaliser=async()=>{
    if(!panier.length) return;
    setSaving(true);
    const body={client:client||"Client anonyme",telephone:tel,vehicule:vehicule||"—",pieces:panier,sous_total:sousTotal,recu:+recu||sousTotal,monnaie:monnaie>0?monnaie:0};
    try{
      let v;
      if(isOffline){v={id:genId("V"),date:today(),...body,employe_nom:employe};addToQueue({endpoint:"/api/ventes",method:"POST",body});}
      else{v=await api("/api/ventes","POST",body,token);v.pieces=panier;}
      setVentes(prev=>[v,...prev]);
      setPieces(prev=>prev.map(p=>{const item=panier.find(x=>x.ref===p.ref);return item?{...p,qte:p.qte-item.qty,vendu:p.vendu+item.qty}:p;}));
      setFacture({...v,employe_nom:employe});
      setPanier([]);setClient("");setTel("");setVehicule("");setRecu("");
    }catch(e){alert("Erreur: "+e.message);}
    setSaving(false);
  };

  if(facture) return <FacturePrint vente={facture} taux={taux} onClose={()=>setFacture(null)}/>;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <PageHeader label="CAISSE" title="Nouvelle vente"/>
      {isOffline&&<div style={{background:T.amberDim+"44",border:`1px solid ${T.amber}`,borderRadius:6,padding:"8px 12px",fontSize:12,color:T.amber}}>Mode hors-ligne — la vente sera synchronisée à la reconnexion</div>}
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
        <div style={{flex:1.5,minWidth:260,display:"flex",flexDirection:"column",gap:12}}>
          <Card>
            <div style={{fontWeight:600,marginBottom:10,fontSize:13,color:T.muted}}>INFO CLIENT</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <Input label="NOM DU CLIENT" value={client} onChange={setClient} placeholder="Jean Pierre"/>
              <Input label="TÉLÉPHONE" value={tel} onChange={setTel} placeholder="3701-2345"/>
              <Input label="VÉHICULE" value={vehicule} onChange={setVehicule} placeholder="Toyota Corolla 2015"/>
            </div>
          </Card>
          <Card>
            <div style={{fontWeight:600,marginBottom:10,fontSize:13,color:T.muted}}>AJOUTER UNE PIÈCE</div>
            <div style={{position:"relative"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Chercher pièce ou véhicule..."
                style={{width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"9px 14px",color:T.text,fontSize:14,outline:"none"}}/>
              {results.length>0&&(
                <div style={{position:"absolute",top:"100%",left:0,right:0,background:T.card,border:`1px solid ${T.border}`,borderRadius:6,zIndex:100,overflow:"hidden"}}>
                  {results.map(p=>(
                    <div key={p.id} onClick={()=>addToPanier(p)} style={{padding:"10px 14px",cursor:"pointer",borderBottom:`1px solid ${T.border}`,display:"flex",gap:10,alignItems:"center"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surface} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      {(p.photos||[]).length>0&&<img src={p.photos[0]} alt="" style={{width:36,height:36,objectFit:"cover",borderRadius:4}}/>}
                      <div style={{flex:1}}>
                        <span className="mono" style={{fontSize:11,color:T.amber}}>{p.ref}</span>
                        <div style={{fontWeight:600,fontSize:13}}>{p.nom}</div>
                        <div style={{fontSize:11,color:T.muted}}>📍 {p.localisation} · Qté: {p.qte}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontWeight:700,color:T.green,fontSize:13}}>{fmt(p.prix_vente)}</div>
                        <div style={{fontSize:11,color:T.muted}}>{fmtUSD(p.prix_vente,taux)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
        <div style={{flex:1,minWidth:240,display:"flex",flexDirection:"column",gap:12}}>
          <Card style={{flex:1}}>
            <div style={{fontWeight:600,marginBottom:10,fontSize:13,color:T.muted}}>PANIER ({panier.length})</div>
            {panier.length===0&&<div style={{color:T.muted,fontSize:13,textAlign:"center",padding:20}}>Aucune pièce ajoutée</div>}
            {panier.map(x=>(
              <div key={x.ref} style={{padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    {x.photo&&<img src={x.photo} alt="" style={{width:32,height:32,objectFit:"cover",borderRadius:4}}/>}
                    <div style={{fontSize:13,fontWeight:600}}>{x.nom}</div>
                  </div>
                  <button onClick={()=>removeFromPanier(x.ref)} style={{background:"none",border:"none",color:T.red,cursor:"pointer",fontSize:16}}>×</button>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <button onClick={()=>x.qty>1&&updateQty(x.ref,x.qty-1)} style={{width:24,height:24,borderRadius:4,background:T.surface,border:`1px solid ${T.border}`,color:T.text,cursor:"pointer"}}>-</button>
                    <span style={{fontSize:13,fontWeight:600,width:24,textAlign:"center"}}>{x.qty}</span>
                    <button onClick={()=>updateQty(x.ref,x.qty+1)} style={{width:24,height:24,borderRadius:4,background:T.surface,border:`1px solid ${T.border}`,color:T.text,cursor:"pointer"}}>+</button>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.green}}>{fmt(x.total)}</div>
                    <div style={{fontSize:11,color:T.muted}}>{fmtUSD(x.total,taux)}</div>
                  </div>
                </div>
              </div>
            ))}
          </Card>
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:T.muted}}>Sous-total</span><span style={{fontWeight:700,fontSize:18}}>{fmt(sousTotal)}</span></div>
            <div style={{textAlign:"right",fontSize:11,color:T.muted,marginBottom:10}}>{fmtUSD(sousTotal,taux)}</div>
            <Input label="MONTANT REÇU (HTG)" type="number" value={recu} onChange={setRecu} placeholder={sousTotal.toString()}/>
            {recu&&<div style={{display:"flex",justifyContent:"space-between",marginTop:8,padding:"8px 12px",background:monnaie>=0?T.greenDim:T.redDim,borderRadius:6}}><span>{monnaie>=0?"Monnaie à rendre":"Manque"}</span><span style={{fontWeight:700}}>{fmt(Math.abs(monnaie))}</span></div>}
            <Btn onClick={finaliser} disabled={saving||!panier.length} style={{width:"100%",marginTop:12}} color={panier.length?T.amber:T.border}>{saving?"Enregistrement…":"✓ Finaliser la vente"}</Btn>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── FICHE DE VENTE ────────────────────────────────────────────────────────────
function FacturePrint({vente,taux,onClose}) {
  const pieces=vente.pieces||[];
  const sousTotal=+vente.sous_total||+vente.sousTotal||0;
  const recuVal=+vente.recu||0;
  const monnaieVal=+vente.monnaie||0;
  const shareWA=()=>{
    const lines=pieces.map(p=>`• ${p.nom} x${p.qty} = ${p.total.toLocaleString()} HTG`).join("\n");
    const msg=`*AUTOPARTS — Reçu #${vente.id}*\nDate: ${dateHT(vente.created_at||vente.date)}\nClient: ${vente.client}\nVéhicule: ${vente.vehicule||"—"}\n\n${lines}\n\n*TOTAL: ${sousTotal.toLocaleString()} HTG*\nReçu: ${recuVal.toLocaleString()} HTG\nMonnaie: ${monnaieVal.toLocaleString()} HTG\n\nMerci pour votre confiance!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}} className="no-print">
        <div><div style={{fontSize:11,color:T.muted}}>VENTE ENREGISTRÉE</div><div style={{fontSize:22,fontWeight:700,color:T.green}}>✓ Vente #{vente.id}</div></div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn outline onClick={shareWA} color={T.green}>📱 WhatsApp</Btn>
          <Btn outline onClick={()=>window.print()} color={T.blue}>🖨 Imprimer</Btn>
          <Btn onClick={onClose}>Nouvelle vente</Btn>
        </div>
      </div>
      <div id="recu" style={{background:T.white,color:"#111",borderRadius:10,padding:24,maxWidth:420,margin:"0 auto",width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:18,letterSpacing:1}}>MON AUTOPARTS</div>
          <div style={{fontSize:12,color:"#555"}}>Port-au-Prince, Haïti · Tél: +509 XXXX-XXXX</div>
        </div>
        <div style={{borderTop:"2px dashed #ddd",borderBottom:"2px dashed #ddd",padding:"10px 0",margin:"10px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span><strong>Facture:</strong> #{vente.id}</span><span>{dateHT(vente.created_at||vente.date)}</span></div>
          <div style={{fontSize:12}}><strong>Client:</strong> {vente.client}</div>
          {vente.telephone&&<div style={{fontSize:12}}><strong>Tél:</strong> {vente.telephone}</div>}
          <div style={{fontSize:12}}><strong>Véhicule:</strong> {vente.vehicule||"—"}</div>
          <div style={{fontSize:12}}><strong>Employé:</strong> {vente.employe_nom||"—"}</div>
        </div>
        <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #ddd"}}><th style={{textAlign:"left",padding:"4px 0"}}>PIÈCE</th><th style={{textAlign:"center"}}>QTÉ</th><th style={{textAlign:"right"}}>PU</th><th style={{textAlign:"right"}}>TOTAL</th></tr></thead>
          <tbody>{pieces.map((p,i)=><tr key={i} style={{borderBottom:"1px solid #f0f0f0"}}><td style={{padding:"4px 0",fontSize:11}}>{p.nom}</td><td style={{textAlign:"center"}}>{p.qty}</td><td style={{textAlign:"right"}}>{p.pu?.toLocaleString()}</td><td style={{textAlign:"right",fontWeight:600}}>{p.total?.toLocaleString()}</td></tr>)}</tbody>
        </table>
        <div style={{borderTop:"2px dashed #ddd",marginTop:10,paddingTop:10}}>
          <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:14}}><span>SOUS-TOTAL</span><span>{sousTotal.toLocaleString()} HTG</span></div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#555"}}><span>≈ USD</span><span>{fmtUSD(sousTotal,taux)}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#555"}}><span>Reçu</span><span>{recuVal.toLocaleString()} HTG</span></div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#555"}}><span>Monnaie</span><span>{monnaieVal.toLocaleString()} HTG</span></div>
        </div>
        <div style={{textAlign:"center",marginTop:14,fontSize:11,color:"#888",borderTop:"1px solid #eee",paddingTop:10}}>Garantie 30 jours sur pièces · Merci pour votre confiance !</div>
      </div>
    </div>
  );
}

// ── HISTORIQUE ────────────────────────────────────────────────────────────────
function Ventes({ventes,taux}) {
  const [selected,setSelected]=useState(null);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <PageHeader label="HISTORIQUE" title={`${ventes.length} transactions`}/>
      {ventes.map(v=>(
        <Card key={v.id} style={{cursor:"pointer"}} onClick={()=>setSelected(v)}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                <span className="mono" style={{fontSize:11,color:T.amber,fontWeight:600}}>#{v.id}</span>
                <span style={{fontSize:12,color:T.muted}}>{dateHT(v.created_at||v.date)}</span>
              </div>
              <div style={{fontWeight:600}}>{v.client}</div>
              <div style={{fontSize:12,color:T.muted}}>{(v.pieces||[]).length} pièce{(v.pieces||[]).length!==1?"s":""} · {v.employe_nom||v.employe}</div>
              {v.vehicule&&v.vehicule!=="—"&&<div style={{fontSize:12,color:T.muted}}>🚗 {v.vehicule}</div>}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontWeight:700,fontSize:16,color:T.green}}>{fmt(v.sous_total||v.sousTotal||0)}</div>
              <div style={{fontSize:11,color:T.muted}}>{fmtUSD(v.sous_total||v.sousTotal||0,taux)}</div>
            </div>
          </div>
        </Card>
      ))}
      {selected&&<Modal title={`Vente #${selected.id}`} onClose={()=>setSelected(null)}><FacturePrint vente={selected} taux={taux} onClose={()=>setSelected(null)}/></Modal>}
    </div>
  );
}

// ── DEMANDES ──────────────────────────────────────────────────────────────────
function Demandes({token,demandes,setDemandes}) {
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({piece:"",client:"",telephone:""});
  const save=async()=>{try{const d=await api("/api/demandes","POST",form,token);setDemandes(prev=>[d,...prev]);setForm({piece:"",client:"",telephone:""});setModal(false);}catch(e){alert(e.message);}};
  const cycle=async id=>{
    const s=["En recherche","Commandée","Disponible","Livrée"];
    const d=demandes.find(x=>x.id===id);
    const next=s[(s.indexOf(d.statut)+1)%s.length];
    try{const u=await api(`/api/demandes/${id}/statut`,"PATCH",{statut:next},token);setDemandes(prev=>prev.map(x=>x.id===id?u:x));}catch(e){alert(e.message);}
  };
  const cS=s=>({["En recherche"]:T.amber,["Commandée"]:T.blue,["Disponible"]:T.green,["Livrée"]:T.muted}[s]||T.muted);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <PageHeader label="COMMANDES" title="Demandes clients" action={<Btn onClick={()=>setModal(true)}>+ Nouvelle demande</Btn>}/>
      {demandes.map(d=>(
        <Card key={d.id}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div><div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{d.piece}</div><div style={{fontSize:13,color:T.muted}}>{d.client}{d.telephone?` · ${d.telephone}`:""}</div><div style={{fontSize:11,color:T.muted}}>{dateHT(d.created_at)}</div></div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}><Badge color={cS(d.statut)}>{d.statut}</Badge>{d.statut!=="Livrée"&&<Btn small outline onClick={()=>cycle(d.id)} color={T.muted}>Avancer →</Btn>}</div>
          </div>
        </Card>
      ))}
      {modal&&<Modal title="Nouvelle demande client" onClose={()=>setModal(false)}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Input label="PIÈCE DEMANDÉE" value={form.piece} onChange={v=>setForm(f=>({...f,piece:v}))} placeholder="Pompe à eau Toyota Hilux 2005"/>
          <Input label="NOM DU CLIENT" value={form.client} onChange={v=>setForm(f=>({...f,client:v}))} placeholder="Fritz Belizaire"/>
          <Input label="TÉLÉPHONE" value={form.telephone} onChange={v=>setForm(f=>({...f,telephone:v}))} placeholder="3344-5566"/>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn outline onClick={()=>setModal(false)}>Annuler</Btn><Btn onClick={save}>Enregistrer</Btn></div>
        </div>
      </Modal>}
    </div>
  );
}

// ── FOURNISSEURS ──────────────────────────────────────────────────────────────
function Fournisseurs({token,fournisseurs,setFournisseurs,pieces}) {
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const blank={nom:"",contact:"",telephone:"",whatsapp:"",email:"",adresse:"",devise:"USD",delai_livraison:"",note:""};
  const save=async()=>{
    try{
      let f;
      if(modal==="add") f=await api("/api/fournisseurs","POST",form,token);
      else f=await api(`/api/fournisseurs/${form.id}`,"PUT",form,token);
      setFournisseurs(prev=>modal==="add"?[...prev,f]:prev.map(x=>x.id===f.id?f:x));
      setModal(null);
    }catch(e){alert(e.message);}
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <PageHeader label="FOURNISSEURS" title={`${fournisseurs.length} fournisseurs`} action={<Btn onClick={()=>{setForm(blank);setModal("add");}}>+ Ajouter</Btn>}/>
      {fournisseurs.map(f=>{
        const nb=pieces.filter(p=>p.fournisseur_id===f.id).length;
        return (
          <Card key={f.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}><div style={{fontWeight:700,fontSize:15}}>{f.nom}</div><Badge color={T.purple}>{f.devise}</Badge></div>
                <div style={{fontSize:13,color:T.muted}}>{f.contact}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>📞 {f.telephone}</div>
                {f.adresse&&<div style={{fontSize:12,color:T.muted}}>📍 {f.adresse}</div>}
                {f.delai_livraison&&<div style={{fontSize:12,color:T.muted}}>🚚 {f.delai_livraison}</div>}
                {f.note&&<div style={{fontSize:11,color:T.muted,marginTop:4,fontStyle:"italic"}}>{f.note}</div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}>
                <div style={{fontSize:12,color:T.muted}}>{nb} pièce{nb!==1?"s":""}</div>
                <div style={{display:"flex",gap:6}}>
                  {f.whatsapp&&<Btn small outline onClick={()=>window.open(`https://wa.me/${f.whatsapp}`)} color={T.green}>📱 WA</Btn>}
                  <Btn small outline onClick={()=>{setForm({...f});setModal("edit");}} color={T.muted}>Modifier</Btn>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
      {modal&&<Modal title={modal==="add"?"Nouveau fournisseur":"Modifier"} onClose={()=>setModal(null)}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Input label="NOM" value={form.nom||""} onChange={v=>setForm(f=>({...f,nom:v}))} placeholder="Import Auto S.A."/>
          <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="CONTACT" value={form.contact||""} onChange={v=>setForm(f=>({...f,contact:v}))}/></div><div style={{flex:1}}><Input label="TÉLÉPHONE" value={form.telephone||""} onChange={v=>setForm(f=>({...f,telephone:v}))}/></div></div>
          <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="WHATSAPP" value={form.whatsapp||""} onChange={v=>setForm(f=>({...f,whatsapp:v}))} placeholder="50922901122"/></div><div style={{flex:1}}><Input label="EMAIL" value={form.email||""} onChange={v=>setForm(f=>({...f,email:v}))}/></div></div>
          <Input label="ADRESSE" value={form.adresse||""} onChange={v=>setForm(f=>({...f,adresse:v}))}/>
          <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Sel label="DEVISE" value={form.devise||"USD"} onChange={v=>setForm(f=>({...f,devise:v}))} options={["USD","HTG"]}/></div><div style={{flex:1}}><Input label="DÉLAI LIVRAISON" value={form.delai_livraison||""} onChange={v=>setForm(f=>({...f,delai_livraison:v}))}/></div></div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn outline onClick={()=>setModal(null)}>Annuler</Btn><Btn onClick={save}>{modal==="add"?"Ajouter":"Enregistrer"}</Btn></div>
        </div>
      </Modal>}
    </div>
  );
}

// ── BONS DE COMMANDE ──────────────────────────────────────────────────────────
function BonsCommande({token,taux,commandes,setCommandes,fournisseurs,pieces}) {
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({fournisseur_id:"",lignes:[],note:""});
  const [searchP,setSearchP]=useState("");
  const statColor={["En attente"]:T.amber,["Confirmée"]:T.blue,["Livrée"]:T.green,["Annulée"]:T.red};
  const pRes=searchP.length>1?pieces.filter(p=>[p.nom,p.ref].join(" ").toLowerCase().includes(searchP.toLowerCase())).slice(0,5):[];
  const addL=p=>setForm(f=>{const ex=f.lignes.find(l=>l.ref===p.ref);if(ex)return {...f,lignes:f.lignes.map(l=>l.ref===p.ref?{...l,qty:l.qty+1,total:(l.qty+1)*l.pu}:l)};return {...f,lignes:[...f.lignes,{ref:p.ref,nom:p.nom,qty:1,pu:+p.prix_achat,total:+p.prix_achat}]};});
  const totalBC=form.lignes.reduce((s,l)=>s+l.total,0);
  const save=async()=>{
    try{const c=await api("/api/commandes","POST",{fournisseur_id:form.fournisseur_id,lignes:form.lignes,total:totalBC,note:form.note},token);setCommandes(prev=>[{...c,lignes:form.lignes,fournisseur_nom:fournisseurs.find(f=>f.id===+form.fournisseur_id)?.nom},...prev]);setModal(null);setForm({fournisseur_id:"",lignes:[],note:""});}catch(e){alert(e.message);}
  };
  const avancer=async id=>{
    const s=["En attente","Confirmée","Livrée"];
    const c=commandes.find(x=>x.id===id);
    const next=s[(s.indexOf(c.statut)+1)%s.length];
    try{const u=await api(`/api/commandes/${id}/statut`,"PATCH",{statut:next},token);setCommandes(prev=>prev.map(x=>x.id===id?{...x,...u}:x));}catch(e){alert(e.message);}
  };
  const envoyerWA=bc=>{
    const f=fournisseurs.find(x=>x.id===bc.fournisseur_id);
    if(!f?.whatsapp)return alert("Numéro WhatsApp non renseigné.");
    const lignes=(bc.lignes||[]).map(l=>`• ${l.nom} (${l.ref}) — Qté: ${l.qty} — PU: ${(l.pu||l.prix_unitaire||0).toLocaleString()} HTG`).join("\n");
    const msg=`*BON DE COMMANDE #${bc.id}*\nDate: ${dateHT(bc.created_at)}\nFournisseur: ${f.nom}\n\n${lignes}\n\n*TOTAL: ${bc.total?.toLocaleString()} HTG*\n${bc.note?`\nNote: ${bc.note}`:""}`;
    window.open(`https://wa.me/${f.whatsapp}?text=${encodeURIComponent(msg)}`);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <PageHeader label="APPROVISIONNEMENT" title={`${commandes.length} bons de commande`} action={<Btn onClick={()=>setModal("new")}>+ Nouveau bon</Btn>}/>
      {commandes.map(bc=>(
        <Card key={bc.id} style={{borderColor:bc.statut==="En attente"?T.amberDim:bc.statut==="Livrée"?T.greenDim:T.border}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                <span className="mono" style={{fontSize:11,color:T.amber,fontWeight:600}}>BC-{bc.id}</span>
                <Badge color={statColor[bc.statut]||T.muted}>{bc.statut}</Badge>
                <span style={{fontSize:12,color:T.muted}}>{dateHT(bc.created_at)}</span>
              </div>
              <div style={{fontWeight:600,fontSize:15}}>{bc.fournisseur_nom||"—"}</div>
              {(bc.lignes||[]).map(l=><div key={l.ref} style={{fontSize:12,color:T.muted,marginTop:2}}><span className="mono" style={{color:T.amber,fontSize:11}}>{l.ref}</span> {l.nom} ×{l.qty} = {fmt(l.total||l.qty*(l.prix_unitaire||l.pu||0))}</div>)}
              {bc.note&&<div style={{fontSize:11,color:T.muted,marginTop:4,fontStyle:"italic"}}>{bc.note}</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end",minWidth:110}}>
              <div style={{fontWeight:700,fontSize:16,color:T.green}}>{fmt(bc.total)}</div>
              <div style={{fontSize:11,color:T.muted}}>{fmtUSD(bc.total,taux)}</div>
              <Btn small outline onClick={()=>envoyerWA(bc)} color={T.green}>📱 WA</Btn>
              {bc.statut!=="Livrée"&&bc.statut!=="Annulée"&&<Btn small outline onClick={()=>avancer(bc.id)} color={T.blue}>Avancer →</Btn>}
            </div>
          </div>
        </Card>
      ))}
      {modal==="new"&&<Modal title="Nouveau bon de commande" onClose={()=>setModal(null)} wide>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Sel label="FOURNISSEUR" value={form.fournisseur_id} onChange={v=>setForm(f=>({...f,fournisseur_id:v}))} options={[{value:"",label:"— Choisir —"},...fournisseurs.map(f=>({value:f.id,label:f.nom}))]}/>
          <div style={{background:T.surface,borderRadius:8,padding:12}}>
            <div style={{fontSize:12,color:T.muted,fontWeight:600,marginBottom:8}}>AJOUTER DES PIÈCES</div>
            <div style={{position:"relative"}}>
              <input value={searchP} onChange={e=>setSearchP(e.target.value)} placeholder="🔍  Chercher une pièce..."
                style={{width:"100%",background:T.card,border:`1px solid ${T.border}`,borderRadius:6,padding:"9px 12px",color:T.text,fontSize:13,outline:"none"}}/>
              {pRes.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:T.card,border:`1px solid ${T.border}`,borderRadius:6,zIndex:100}}>
                {pRes.map(p=><div key={p.id} onClick={()=>{addL(p);setSearchP("");}} style={{padding:"8px 12px",cursor:"pointer",borderBottom:`1px solid ${T.border}`,fontSize:13,display:"flex",gap:8,alignItems:"center"}} onMouseEnter={e=>e.currentTarget.style.background=T.surface} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  {(p.photos||[]).length>0&&<img src={p.photos[0]} alt="" style={{width:28,height:28,objectFit:"cover",borderRadius:4}}/>}
                  <span className="mono" style={{color:T.amber,fontSize:11}}>{p.ref}</span> {p.nom} <span style={{float:"right",color:T.muted}}>Achat: {fmt(p.prix_achat)}</span>
                </div>)}
              </div>}
            </div>
          </div>
          {form.lignes.length>0&&<div style={{background:T.surface,borderRadius:8,padding:12}}>
            {form.lignes.map(l=><div key={l.ref} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${T.border}`,flexWrap:"wrap"}}>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{l.nom}</div><span className="mono" style={{fontSize:11,color:T.amber}}>{l.ref}</span></div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:12,color:T.muted}}>Qté:</span>
                <input type="number" value={l.qty} onChange={e=>setForm(f=>({...f,lignes:f.lignes.map(x=>x.ref===l.ref?{...x,qty:+e.target.value,total:+e.target.value*x.pu}:x)}))} style={{width:55,background:T.card,border:`1px solid ${T.border}`,borderRadius:4,padding:"4px 6px",color:T.text,fontSize:13,outline:"none"}}/>
                <span style={{fontSize:12,color:T.muted}}>PU:</span>
                <input type="number" value={l.pu} onChange={e=>setForm(f=>({...f,lignes:f.lignes.map(x=>x.ref===l.ref?{...x,pu:+e.target.value,total:x.qty*+e.target.value}:x)}))} style={{width:80,background:T.card,border:`1px solid ${T.border}`,borderRadius:4,padding:"4px 6px",color:T.text,fontSize:13,outline:"none"}}/>
              </div>
              <div style={{fontWeight:700,color:T.green,fontSize:13}}>{fmt(l.total)}</div>
              <button onClick={()=>setForm(f=>({...f,lignes:f.lignes.filter(x=>x.ref!==l.ref)}))} style={{background:"none",border:"none",color:T.red,cursor:"pointer",fontSize:16}}>×</button>
            </div>)}
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,fontWeight:700}}><span>TOTAL</span><span style={{color:T.green}}>{fmt(totalBC)} · {fmtUSD(totalBC,taux)}</span></div>
          </div>}
          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={{fontSize:12,color:T.muted,fontWeight:600}}>NOTE POUR LE FOURNISSEUR</label><textarea value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"9px 12px",color:T.text,fontSize:13,resize:"vertical"}}/></div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn outline onClick={()=>setModal(null)}>Annuler</Btn><Btn onClick={save} disabled={!form.fournisseur_id||!form.lignes.length}>Créer le bon</Btn></div>
        </div>
      </Modal>}
    </div>
  );
}

// ── RAPPORTS ──────────────────────────────────────────────────────────────────
function Rapports({ventes,pieces,taux}) {
  const totalCA=ventes.reduce((s,v)=>s+(+v.sous_total||+v.sousTotal||0),0);
  const valeurStock=pieces.reduce((s,p)=>s+p.qte*+p.prix_achat,0);
  const stockMort=pieces.filter(p=>p.vendu===0);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <PageHeader label="ANALYTIQUE" title="Rapports"/>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        {[{label:"CHIFFRE D'AFFAIRES",value:fmt(totalCA),sub:fmtUSD(totalCA,taux),color:T.green},{label:"VALEUR DU STOCK",value:fmt(valeurStock),sub:fmtUSD(valeurStock,taux),color:T.blue},{label:"TRANSACTIONS",value:ventes.length,sub:"ventes enregistrées",color:T.amber},{label:"STOCK MORT",value:stockMort.length,sub:"pièces sans vente",color:T.red}].map(s=>(
          <Card key={s.label} style={{flex:1,minWidth:140}}>
            <div style={{fontSize:11,color:T.muted,fontWeight:600,letterSpacing:"0.06em",marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:20,fontWeight:700,color:s.color}}>{s.value}</div>
            <div style={{fontSize:11,color:T.muted}}>{s.sub}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div style={{fontWeight:700,marginBottom:12}}>📦 Pièces sans aucune vente ({stockMort.length})</div>
        {stockMort.length===0&&<div style={{color:T.muted,fontSize:13}}>Excellent ! Toutes les pièces ont été vendues au moins une fois.</div>}
        {stockMort.map(p=>(
          <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              {(p.photos||[]).length>0&&<img src={p.photos[0]} alt="" style={{width:36,height:36,objectFit:"cover",borderRadius:4}}/>}
              <div><span className="mono" style={{fontSize:11,color:T.amber}}>{p.ref}</span><div style={{fontSize:13,fontWeight:600}}>{p.nom}</div><div style={{fontSize:11,color:T.muted}}>📍 {p.localisation}</div></div>
            </div>
            <div style={{textAlign:"right"}}><div style={{fontSize:13}}>{p.qte} unités</div><div style={{fontSize:11,color:T.red}}>{fmt(p.qte*+p.prix_achat)} immobilisé</div></div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── EMPLOYÉS ──────────────────────────────────────────────────────────────────
function Employes({token,employes,setEmployes}) {
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({nom:"",pin:"",role:"employe"});
  const save=async()=>{try{const e=await api("/api/employes","POST",form,token);setEmployes(prev=>[...prev,e]);setForm({nom:"",pin:"",role:"employe"});setModal(false);}catch(e){alert(e.message);}};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <PageHeader label="ADMINISTRATION" title="Employés" action={<Btn onClick={()=>setModal(true)}>+ Ajouter</Btn>}/>
      {employes.map(e=>(
        <Card key={e.id}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontWeight:700,fontSize:15}}>{e.nom}</div><div style={{fontSize:12,color:T.muted}}>PIN: ••••</div></div>
            <Badge color={e.role==="proprietaire"?T.amber:T.blue}>{e.role==="proprietaire"?"Propriétaire":"Employé"}</Badge>
          </div>
        </Card>
      ))}
      {modal&&<Modal title="Nouvel employé" onClose={()=>setModal(false)}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Input label="NOM COMPLET" value={form.nom} onChange={v=>setForm(f=>({...f,nom:v}))} placeholder="Marie Joseph"/>
          <Input label="CODE PIN (4 chiffres)" type="password" value={form.pin} onChange={v=>setForm(f=>({...f,pin:v}))} placeholder="****"/>
          <Sel label="RÔLE" value={form.role} onChange={v=>setForm(f=>({...f,role:v}))} options={[{value:"employe",label:"Employé"},{value:"proprietaire",label:"Propriétaire"}]}/>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn outline onClick={()=>setModal(false)}>Annuler</Btn><Btn onClick={save}>Créer l'employé</Btn></div>
        </div>
      </Modal>}
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({onLogin}) {
  const [pin,setPin]=useState("");
  const [erreur,setErreur]=useState("");
  const [loading,setLoading]=useState(false);
  const essayer=async()=>{
    setLoading(true);setErreur("");
    try{const d=await api("/api/auth/login","POST",{pin});onLogin(d.token,d.employe);}
    catch(e){setErreur("Code PIN incorrect");setPin("");}
    setLoading(false);
  };
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:340}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:40,marginBottom:8}}>🔧</div>
          <div style={{fontSize:26,fontWeight:800,letterSpacing:"-0.02em"}}>AutoParts</div>
          <div style={{color:T.muted,fontSize:13}}>Système de gestion · Haïti</div>
        </div>
        <Card>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Input label="CODE PIN" type="password" value={pin} onChange={setPin} placeholder="••••"/>
            {erreur&&<div style={{color:T.red,fontSize:12,textAlign:"center"}}>{erreur}</div>}
            <Btn onClick={essayer} disabled={loading} style={{width:"100%"}}>{loading?"Connexion…":"Se connecter"}</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── NAV ───────────────────────────────────────────────────────────────────────
const NAV=[
  {id:"dashboard",label:"Accueil",icon:"📊"},
  {id:"inventaire",label:"Inventaire",icon:"📦"},
  {id:"vente",label:"Vente",icon:"🛒"},
  {id:"ventes",label:"Historique",icon:"🧾"},
  {id:"demandes",label:"Demandes",icon:"📋"},
  {id:"fournisseurs",label:"Fournisseurs",icon:"🏭",pOnly:true},
  {id:"commandes",label:"Commandes",icon:"📬",pOnly:true},
  {id:"rapports",label:"Rapports",icon:"📈",pOnly:true},
  {id:"employes",label:"Employés",icon:"👤",pOnly:true},
];

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [token,setToken]=useState(()=>localStorage.getItem("ap_token"));
  const [user,setUser]=useState(null);
  const [page,setPage]=useState("dashboard");
  const [taux,setTaux]=useState(142);
  const [isOffline,setIsOffline]=useState(!navigator.onLine);
  const [queueLen,setQueueLen]=useState(getQueue().length);

  const [pieces,setPieces]=useState([]);
  const [ventes,setVentes]=useState([]);
  const [demandes,setDemandes]=useState([]);
  const [fournisseurs,setFournisseurs]=useState([]);
  const [commandes,setCommandes]=useState([]);
  const [employes,setEmployes]=useState([]);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    const on=()=>{setIsOffline(false);syncQueue();};
    const off=()=>setIsOffline(true);
    window.addEventListener("online",on);window.addEventListener("offline",off);
    return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off);};
  },[token]);

  const syncQueue=useCallback(async()=>{
    const q=getQueue();
    if(!q.length||!token) return;
    for(const item of q){try{await api(item.endpoint,item.method,item.body,token);}catch{}}
    clearQueue();setQueueLen(0);
  },[token]);

  useEffect(()=>{
    if(!token) return;
    api("/api/auth/me","GET",null,token).then(u=>setUser(u)).catch(()=>{localStorage.removeItem("ap_token");setToken(null);});
  },[token]);

  useEffect(()=>{
    if(!user||!token) return;
    setLoading(true);
    const calls=[
      api("/api/pieces","GET",null,token).then(setPieces),
      api("/api/ventes","GET",null,token).then(setVentes),
      api("/api/demandes","GET",null,token).then(setDemandes),
      api("/api/fournisseurs","GET",null,token).then(setFournisseurs),
    ];
    if(user.role==="proprietaire"){
      calls.push(api("/api/commandes","GET",null,token).then(setCommandes));
      calls.push(api("/api/employes","GET",null,token).then(setEmployes));
    }
    Promise.all(calls).finally(()=>setLoading(false));
  },[user,token]);

  const onLogin=(tok,emp)=>{localStorage.setItem("ap_token",tok);setToken(tok);setUser(emp);};
  const onLogout=()=>{localStorage.removeItem("ap_token");setToken(null);setUser(null);setPieces([]);setVentes([]);};

  const nav=NAV.filter(n=>!n.pOnly||user?.role==="proprietaire");

  if(!user) return <><style>{css}</style><Login onLogin={onLogin}/></>;

  return (
    <>
      <style>{css}</style>
      <OfflineBanner isOffline={isOffline} queueLen={queueLen}/>
      <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <div className="no-print" style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"10px 16px",position:"sticky",top:0,zIndex:50}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:900,margin:"0 auto",width:"100%"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>🔧</span>
              <div><div style={{fontWeight:800,fontSize:15,lineHeight:1}}>AutoParts</div><div style={{fontSize:10,color:T.muted}}>Haïti · HTG / USD</div></div>
            </div>
            {user.role==="proprietaire"&&<div style={{flex:1,margin:"0 16px",maxWidth:420}}><TauxWidget taux={taux} setTaux={setTaux} token={token}/></div>}
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:600}}>{user.nom}</div><div style={{fontSize:10,color:T.amber}}>{user.role==="proprietaire"?"Propriétaire":"Employé"}</div></div>
              <button onClick={onLogout} style={{background:"none",border:`1px solid ${T.border}`,color:T.muted,borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>Déco</button>
            </div>
          </div>
        </div>

        <div style={{flex:1,padding:16,maxWidth:900,width:"100%",margin:"0 auto"}}>
          {loading?<Spinner/>:<>
            {page==="dashboard"&&<Dashboard token={token} taux={taux} pieces={pieces} ventes={ventes} demandes={demandes} commandes={commandes}/>}
            {page==="inventaire"&&<Inventaire token={token} taux={taux} pieces={pieces} setPieces={setPieces} fournisseurs={fournisseurs}/>}
            {page==="vente"&&<NouvelleVente token={token} taux={taux} pieces={pieces} setPieces={setPieces} ventes={ventes} setVentes={setVentes} employe={user.nom} isOffline={isOffline}/>}
            {page==="ventes"&&<Ventes ventes={ventes} taux={taux}/>}
            {page==="demandes"&&<Demandes token={token} demandes={demandes} setDemandes={setDemandes}/>}
            {page==="fournisseurs"&&user.role==="proprietaire"&&<Fournisseurs token={token} fournisseurs={fournisseurs} setFournisseurs={setFournisseurs} pieces={pieces}/>}
            {page==="commandes"&&user.role==="proprietaire"&&<BonsCommande token={token} taux={taux} commandes={commandes} setCommandes={setCommandes} fournisseurs={fournisseurs} pieces={pieces}/>}
            {page==="rapports"&&user.role==="proprietaire"&&<Rapports ventes={ventes} pieces={pieces} taux={taux}/>}
            {page==="employes"&&user.role==="proprietaire"&&<Employes token={token} employes={employes} setEmployes={setEmployes}/>}
          </>}
        </div>

        <div className="no-print" style={{background:T.surface,borderTop:`1px solid ${T.border}`,display:"flex",position:"sticky",bottom:0,overflowX:"auto"}}>
          {nav.map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)} style={{flex:1,minWidth:52,padding:"8px 4px",background:"none",border:"none",cursor:"pointer",color:page===n.id?T.amber:T.muted,borderTop:page===n.id?`2px solid ${T.amber}`:"2px solid transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:2,transition:"color .15s"}}>
              <span style={{fontSize:17}}>{n.icon}</span>
              <span style={{fontSize:8,fontWeight:600,letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{n.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
