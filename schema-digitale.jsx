import { useState, useCallback } from "react";

const PROMPTS = {
  idraulico: `Sei un tecnico idraulico esperto. Analizza lo schema idraulico disegnato a mano.
Trasformalo in un report strutturato. Rispondi SOLO in JSON valido, nessun testo, nessun backtick.
{ "tipo_impianto":"", "locali":[{"nome":"","elementi":[{"tipo":"","descrizione":"","note":""}]}],
"tubazioni":[{"tratto":"","materiale":"","diametro":"","funzione":""}],
"componenti_principali":[{"nome":"","posizione":"","specifiche":"","note":""}],
"schema_flusso":"", "note_tecniche":[], "avvertenze":[], "leggibilita":"buona|parziale|scarsa" }`,
  elettricista: `Sei un elettricista qualificato. Analizza lo schema elettrico disegnato a mano.
Trasformalo in un report strutturato. Rispondi SOLO in JSON valido, nessun testo, nessun backtick.
{ "tipo_impianto":"", "tensione_sistema":"",
"locali":[{"nome":"","elementi":[{"tipo":"","descrizione":"","circuito":"","note":""}]}],
"quadro_elettrico":{"posizione":"","interruttori":[{"circuito":"","tipo":"","amperaggio":"","note":""}]},
"cavi":[{"tratto":"","sezione":"","colore":"","funzione":""}],
"componenti_principali":[{"nome":"","posizione":"","specifiche":"","note":""}],
"note_tecniche":[], "avvertenze":[], "leggibilita":"buona|parziale|scarsa" }`
};

const DEMO = {
  idraulico: {
    tipo_impianto: "Impianto idraulico sanitario residenziale",
    locali: [
      { nome: "Bagno principale", elementi: [
        { tipo: "WC", descrizione: "Cassetta a zaino, scarico a parete", note: "Valvola intercettazione presente" },
        { tipo: "Lavabo", descrizione: "Colonna acqua calda e fredda 15mm", note: "" },
        { tipo: "Doccia", descrizione: "Piatto 80x80, miscelatore esterno", note: "Sifone Ø50" }
      ]},
      { nome: "Cucina", elementi: [
        { tipo: "Lavello", descrizione: "Doppia vasca, scarico Ø50", note: "" },
        { tipo: "Attacco lavatrice", descrizione: "Acqua fredda Ø12, scarico Ø40", note: "Valvola a sfera" }
      ]}
    ],
    tubazioni: [
      { tratto: "Colonna montante", materiale: "Multistrato", diametro: "Ø26", funzione: "Adduzione acqua fredda" },
      { tratto: "Distribuzione bagno", materiale: "Multistrato", diametro: "Ø16", funzione: "Fredda e calda sanitaria" },
      { tratto: "Scarico principale", materiale: "PVC", diametro: "Ø110", funzione: "Scarico acque nere" }
    ],
    componenti_principali: [
      { nome: "Scaldabagno elettrico", posizione: "Bagno, parete nord", specifiche: "80L - 1500W - ErP C", note: "Installato 2021" },
      { nome: "Contatore acqua", posizione: "Ingresso edificio", specifiche: "DN15 - 1,5 m3/h", note: "" }
    ],
    schema_flusso: "Contatore -> Colonna montante Ø26 -> Appartamento -> Distribuzione Ø16 -> Utenze",
    note_tecniche: ["Pressione rete: 3 bar al contatore", "Giunti a pressare su tutto l'impianto", "Valvola di non ritorno prima dello scaldabagno"],
    avvertenze: ["Verificare tenuta giunto sotto lavello cucina - traccia di umidita sul muro"],
    leggibilita: "buona"
  },
  elettricista: {
    tipo_impianto: "Impianto elettrico civile appartamento",
    tensione_sistema: "230V monofase",
    locali: [
      { nome: "Soggiorno", elementi: [
        { tipo: "Prese", descrizione: "4 prese 16A", circuito: "C3 - Prese soggiorno", note: "" },
        { tipo: "Punto luce", descrizione: "Plafoniera centrale", circuito: "C1 - Luci", note: "" }
      ]},
      { nome: "Bagno", elementi: [
        { tipo: "Presa rasoi", descrizione: "1 presa IP44", circuito: "C5 - Bagno", note: "Zona 2 - diff. 10mA" },
        { tipo: "Punto luce", descrizione: "Applique parete IP44", circuito: "C1 - Luci", note: "" }
      ]}
    ],
    quadro_elettrico: {
      posizione: "Ingresso appartamento h=160cm",
      interruttori: [
        { circuito: "C1 - Illuminazione", tipo: "Magnetotermico", amperaggio: "10A", note: "" },
        { circuito: "C2 - Prese cucina", tipo: "Magnetotermico + Diff. 30mA", amperaggio: "16A", note: "" },
        { circuito: "C3 - Prese soggiorno", tipo: "Magnetotermico", amperaggio: "16A", note: "" },
        { circuito: "C5 - Bagno", tipo: "Magnetotermico + Diff. 10mA", amperaggio: "10A", note: "" }
      ]
    },
    cavi: [
      { tratto: "Linea principale", sezione: "6mm2", colore: "Grigio", funzione: "Alimentazione quadro" },
      { tratto: "Circuiti luce", sezione: "1,5mm2", colore: "Grigio", funzione: "Illuminazione" },
      { tratto: "Circuiti prese", sezione: "2,5mm2", colore: "Grigio", funzione: "Prese" }
    ],
    componenti_principali: [
      { nome: "Quadro elettrico", posizione: "Ingresso, parete est", specifiche: "12 moduli DIN - IP40", note: "" },
      { nome: "Interruttore generale", posizione: "Quadro, pos. 1", specifiche: "32A bipolare", note: "" }
    ],
    note_tecniche: ["Impianto a norma CEI 64-8", "Messa a terra presente - Rt = 18 Ohm"],
    avvertenze: ["Nessuna presa con messa a terra in camera da letto - da integrare"],
    leggibilita: "buona"
  }
};

const toBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = () => rej(new Error("Lettura fallita"));
  r.readAsDataURL(file);
});

const isPDF = (f) => f && f.type === "application/pdf";
const isImage = (f) => f && f.type && f.type.startsWith("image/");

const CFG = {
  idraulico: { label: "Idraulico", icon: "🔧", color: "#0369a1", bg: "#e0f2fe", light: "#f0f9ff", dark: "#0c4a6e" },
  elettricista: { label: "Elettricista", icon: "⚡", color: "#d97706", bg: "#fef3c7", light: "#fffbeb", dark: "#92400e" }
};

function EditableText({ value, onChange, placeholder, multiline, style }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const ph = placeholder || "—";
  const commit = () => { onChange(draft); setEditing(false); };
  if (editing) {
    const s = { border: "2px solid #0369a1", borderRadius: 8, padding: "6px 8px", fontSize: 13, fontFamily: "inherit", background: "#f0f9ff", outline: "none", width: "100%", boxSizing: "border-box", resize: "vertical", ...(style || {}) };
    return multiline
      ? <textarea value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} autoFocus rows={3} style={s} onKeyDown={e => e.key === "Escape" && setEditing(false)} />
      : <input value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} autoFocus style={s} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }} />;
  }
  return (
    <span onClick={() => { setDraft(value || ""); setEditing(true); }} title="Tocca per modificare"
      style={{ cursor: "pointer", borderRadius: 6, padding: "2px 4px", display: "inline-block", minWidth: 40, color: value ? "inherit" : "#94a3b8", borderBottom: "1px dashed #cbd5e1", ...(style || {}) }}>
      {value || ph} <span style={{ fontSize: 10, opacity: 0.4 }}>✏️</span>
    </span>
  );
}

export default function App() {
  const [profilo, setProfilo] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [notesTecnico, setNotesTecnico] = useState("");
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);
  const c = profilo ? CFG[profilo] : CFG.idraulico;

  const update = useCallback((path, value) => {
    setResult(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        cur = isNaN(parseInt(k)) ? cur[k] : cur[parseInt(k)];
      }
      const last = keys[keys.length - 1];
      if (isNaN(parseInt(last))) cur[last] = value; else cur[parseInt(last)] = value;
      return next;
    });
    setSaved(false);
  }, []);

  const addToList = (pathStr, template) => {
    setResult(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let cur = next;
      for (const k of pathStr.split(".")) cur = isNaN(parseInt(k)) ? cur[k] : cur[parseInt(k)];
      cur.push(template);
      return next;
    });
    setSaved(false);
  };

  const removeFromList = (pathStr, idx) => {
    setResult(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let cur = next;
      for (const k of pathStr.split(".")) cur = isNaN(parseInt(k)) ? cur[k] : cur[parseInt(k)];
      cur.splice(idx, 1);
      return next;
    });
    setSaved(false);
  };

  const handleFile = (f) => {
    if (!f) return;
    if (!isPDF(f) && !isImage(f)) { setError("Carica un'immagine (JPG, PNG) o un PDF."); return; }
    setFile(f); setError(null); setResult(null);
    setPreview(isImage(f) ? URL.createObjectURL(f) : null);
  };

  const caricaDemo = () => {
    setResult(DEMO[profilo]);
    setNotesTecnico("");
    setStep(3);
    setSaved(false);
  };

  const analizza = async () => {
    if (!file || !profilo) return;
    setLoading(true); setError(null);
    try {
      const base64 = await toBase64(file);
      const contentParts = isImage(file)
        ? [{ type: "image", source: { type: "base64", media_type: file.type, data: base64 } }, { type: "text", text: "Analizza questo schema e restituisci il JSON." }]
        : [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }, { type: "text", text: "Analizza lo schema in questo PDF e restituisci il JSON." }];
     const res = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 3000, system: PROMPTS[profilo], messages: [{ role: "user", content: contentParts }] })
      });
      const data = await res.json();
      const raw = (data.content || []).map(i => i.text || "").join("");
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setResult(parsed); setNotesTecnico(""); setStep(3); setSaved(false);
    } catch (e) {
      setError("Errore nell'analisi. Verifica che il file sia leggibile e riprova.");
    }
    setLoading(false);
  };

  const reset = () => {
    setFile(null); setPreview(null); setResult(null);
    setError(null); setStep(1); setProfilo(null); setSaved(false); setNotesTecnico("");
  };

  // STEP 1
  if (step === 1) return (
    <Shell>
      <Header title="SchemaDigitale" sub="Digitalizza il tuo schema in un clic" />
      <div style={{ padding: "32px 20px" }}>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: 14, marginBottom: 28 }}>Sei un…</p>
        {Object.entries(CFG).map(([key, v]) => (
          <button key={key} onClick={() => { setProfilo(key); setStep(2); }}
            style={{ width: "100%", padding: "22px 20px", borderRadius: 18, border: "2px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, textAlign: "left", marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", fontFamily: "inherit" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = v.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: v.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{v.icon}</div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 18, color: "#1e293b" }}>{v.label}</p>
              <p style={{ margin: "3px 0 0", fontSize: 13, color: "#64748b" }}>{key === "idraulico" ? "Schemi acqua, scarichi, sanitari" : "Schemi elettrici, quadri, cavi"}</p>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 22, color: "#cbd5e1" }}>›</span>
          </button>
        ))}
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#94a3b8" }}>Funziona con foto dal telefono o PDF scansionati</p>
      </div>
    </Shell>
  );

  // STEP 2
  if (step === 2) return (
    <Shell>
      <Header title={c.icon + " " + c.label} sub="Carica il tuo schema" onBack={() => { setStep(1); setProfilo(null); }} />
      <div style={{ padding: "24px 20px" }}>

        {/* NOTA SANDBOX */}
        <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 12, padding: "12px 14px", marginBottom: 20, fontSize: 13, color: "#713f12", lineHeight: 1.5 }}>
          <strong>Nota:</strong> il caricamento file non e disponibile nell anteprima di Claude. Usa il pulsante demo per testare l app. Su Vercel funzionera tutto normalmente.
        </div>

        {/* DEMO BUTTON */}
        <button onClick={caricaDemo}
          style={{ width: "100%", padding: "18px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, " + c.dark + ", " + c.color + ")", color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer", marginBottom: 20, boxShadow: "0 4px 16px " + c.color + "55", fontFamily: "inherit" }}>
          Prova con schema di esempio
        </button>

        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginBottom: 20 }}>— In produzione, carica la foto qui sotto —</div>

        {/* FILE INPUT visibile */}
        {!file ? (
          <label style={{ display: "block", padding: "28px 20px", borderRadius: 18, border: "2px dashed " + c.color + "66", background: "#f8fafc", textAlign: "center", marginBottom: 16, boxSizing: "border-box", cursor: "pointer" }}>
            <input type="file" accept="image/*,application/pdf" onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} style={{ display: "block", margin: "0 auto 12px", fontSize: 13 }} />
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Foto JPG/PNG o PDF scansionato</p>
          </label>
        ) : (
          <div>
            {preview && <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 14, border: "2px solid #e2e8f0", maxHeight: 260 }}><img src={preview} alt="schema" style={{ width: "100%", objectFit: "contain", maxHeight: 256 }} /></div>}
            {!preview && <div style={{ borderRadius: 16, padding: "20px", background: "#f8fafc", border: "2px solid #e2e8f0", marginBottom: 14, textAlign: "center" }}>
              <div style={{ fontSize: 36 }}>📄</div>
              <p style={{ margin: "8px 0 0", fontWeight: 600, color: "#334155", fontSize: 14 }}>{file.name}</p>
            </div>}
            <button onClick={() => { setFile(null); setPreview(null); }} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontSize: 13, cursor: "pointer", marginBottom: 12, fontFamily: "inherit" }}>Cambia file</button>
            <button onClick={analizza} disabled={loading}
              style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", background: loading ? "#cbd5e1" : "linear-gradient(135deg, " + c.dark + ", " + c.color + ")", color: "white", fontWeight: 800, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {loading ? "Analisi in corso..." : "Digitalizza schema"}
            </button>
          </div>
        )}

        {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px", marginTop: 14, color: "#991b1b", fontSize: 13 }}>{error}</div>}
      </div>
    </Shell>
  );

  // STEP 3
  if (step === 3 && result) {
    const r = result;
    const X = ({ onClick }) => <button onClick={onClick} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 14, padding: "0 4px", fontFamily: "inherit" }}>x</button>;
    const AddBtn = ({ onClick, label, color, light }) => <button onClick={onClick} style={{ fontSize: 13, color: color, background: light, border: "1px dashed " + color, borderRadius: 10, padding: "7px 14px", cursor: "pointer", width: "100%", marginTop: 6, fontFamily: "inherit" }}>+ {label}</button>;

    return (
      <Shell>
        <Header title="Schema Digitalizzato" sub={r.tipo_impianto || ("Impianto " + profilo)} onBack={() => setStep(2)} />
        <div style={{ padding: "16px 16px 130px" }}>

          {r.leggibilita && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: r.leggibilita === "buona" ? "#f0fdf4" : "#fffbeb", border: "1px solid " + (r.leggibilita === "buona" ? "#86efac" : "#fde68a") }}>
              <span>{r.leggibilita === "buona" ? "ok" : "attenzione"}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: r.leggibilita === "buona" ? "#166534" : "#78350f" }}>Leggibilita: {r.leggibilita}</span>
            </div>
          )}

          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#0369a1" }}>
            Tocca qualsiasi campo per modificarlo.
          </div>

          {/* Generali */}
          <Card title="Informazioni generali" icon="📋">
            <FRow label="Tipo impianto"><EditableText value={r.tipo_impianto} onChange={v => update("tipo_impianto", v)} placeholder="es. Impianto idraulico sanitario" /></FRow>
            {r.tensione_sistema !== undefined && <FRow label="Tensione"><EditableText value={r.tensione_sistema} onChange={v => update("tensione_sistema", v)} placeholder="es. 230V" /></FRow>}
            {r.schema_flusso && <FRow label="Schema flusso"><EditableText value={r.schema_flusso} onChange={v => update("schema_flusso", v)} multiline /></FRow>}
          </Card>

          {/* Locali */}
          {r.locali && r.locali.length > 0 && (
            <Card title="Locali" icon="🏠">
              {r.locali.map((locale, li) => (
                <div key={li} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, display: "inline-block" }} />
                    <EditableText value={locale.nome} onChange={v => update("locali." + li + ".nome", v)} placeholder={"Locale " + (li+1)} style={{ fontWeight: 700, fontSize: 14, color: c.dark }} />
                    <X onClick={() => removeFromList("locali", li)} />
                  </div>
                  {(locale.elementi || []).map((el, ei) => (
                    <div key={ei} style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 10, marginBottom: 6, borderLeft: "3px solid " + c.color }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <EditableText value={el.tipo} onChange={v => update("locali." + li + ".elementi." + ei + ".tipo", v)} placeholder="Tipo" style={{ fontWeight: 600, fontSize: 13 }} />
                        <X onClick={() => removeFromList("locali." + li + ".elementi", ei)} />
                      </div>
                      <div style={{ marginTop: 4 }}><EditableText value={el.descrizione} onChange={v => update("locali." + li + ".elementi." + ei + ".descrizione", v)} placeholder="Descrizione..." style={{ fontSize: 12, color: "#64748b" }} /></div>
                      {el.circuito !== undefined && <div style={{ marginTop: 3 }}><span style={{ fontSize: 11, color: "#94a3b8" }}>Circuito: </span><EditableText value={el.circuito} onChange={v => update("locali." + li + ".elementi." + ei + ".circuito", v)} placeholder="—" style={{ fontSize: 12 }} /></div>}
                      <div style={{ marginTop: 3 }}><span style={{ fontSize: 11, color: "#94a3b8" }}>Note: </span><EditableText value={el.note} onChange={v => update("locali." + li + ".elementi." + ei + ".note", v)} placeholder="Aggiungi nota..." style={{ fontSize: 12, fontStyle: "italic" }} /></div>
                    </div>
                  ))}
                  <AddBtn onClick={() => addToList("locali." + li + ".elementi", { tipo: "", descrizione: "", note: "" })} label="Aggiungi elemento" color={c.color} light={c.light} />
                </div>
              ))}
              <AddBtn onClick={() => addToList("locali", { nome: "", elementi: [] })} label="Aggiungi locale" color={c.color} light={c.light} />
            </Card>
          )}

          {/* Tubazioni */}
          {r.tubazioni !== undefined && (
            <Card title="Tubazioni" icon="🔵">
              {(r.tubazioni || []).map((t, i) => (
                <div key={i} style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 10, marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <EditableText value={t.tratto} onChange={v => update("tubazioni." + i + ".tratto", v)} placeholder="Tratto" style={{ fontWeight: 600, fontSize: 13 }} />
                    <X onClick={() => removeFromList("tubazioni", i)} />
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                    {[["Materiale","materiale"],["Diametro","diametro"],["Funzione","funzione"]].map(([lbl,key]) => (
                      <div key={key}><span style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>{lbl}</span><EditableText value={t[key]} onChange={v => update("tubazioni." + i + "." + key, v)} placeholder="—" style={{ fontSize: 12 }} /></div>
                    ))}
                  </div>
                </div>
              ))}
              <AddBtn onClick={() => addToList("tubazioni", { tratto: "", materiale: "", diametro: "", funzione: "" })} label="Aggiungi tubazione" color={c.color} light={c.light} />
            </Card>
          )}

          {/* Cavi */}
          {r.cavi !== undefined && (
            <Card title="Cavi" icon="🔌">
              {(r.cavi || []).map((t, i) => (
                <div key={i} style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 10, marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <EditableText value={t.tratto} onChange={v => update("cavi." + i + ".tratto", v)} placeholder="Tratto" style={{ fontWeight: 600, fontSize: 13 }} />
                    <X onClick={() => removeFromList("cavi", i)} />
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                    {[["Sezione","sezione"],["Colore","colore"],["Funzione","funzione"]].map(([lbl,key]) => (
                      <div key={key}><span style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>{lbl}</span><EditableText value={t[key]} onChange={v => update("cavi." + i + "." + key, v)} placeholder="—" style={{ fontSize: 12 }} /></div>
                    ))}
                  </div>
                </div>
              ))}
              <AddBtn onClick={() => addToList("cavi", { tratto: "", sezione: "", colore: "", funzione: "" })} label="Aggiungi cavo" color={c.color} light={c.light} />
            </Card>
          )}

          {/* Quadro */}
          {r.quadro_elettrico && (
            <Card title="Quadro elettrico" icon="🗂️">
              <FRow label="Posizione"><EditableText value={r.quadro_elettrico.posizione} onChange={v => update("quadro_elettrico.posizione", v)} placeholder="es. Ingresso" /></FRow>
              {(r.quadro_elettrico.interruttori || []).map((int, i) => (
                <div key={i} style={{ padding: "10px 12px", background: "#fafafa", borderRadius: 10, marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <EditableText value={int.circuito} onChange={v => update("quadro_elettrico.interruttori." + i + ".circuito", v)} placeholder={"Circuito " + (i+1)} style={{ fontWeight: 600, fontSize: 13 }} />
                    <X onClick={() => removeFromList("quadro_elettrico.interruttori", i)} />
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                    {[["Tipo","tipo"],["Amperaggio","amperaggio"]].map(([lbl,key]) => (
                      <div key={key}><span style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>{lbl}</span><EditableText value={int[key]} onChange={v => update("quadro_elettrico.interruttori." + i + "." + key, v)} placeholder="—" style={{ fontSize: 12 }} /></div>
                    ))}
                  </div>
                </div>
              ))}
              <AddBtn onClick={() => addToList("quadro_elettrico.interruttori", { circuito: "", tipo: "", amperaggio: "", note: "" })} label="Aggiungi interruttore" color={c.color} light={c.light} />
            </Card>
          )}

          {/* Componenti */}
          {r.componenti_principali !== undefined && (
            <Card title="Componenti" icon="⚙️">
              {(r.componenti_principali || []).map((comp, i) => (
                <div key={i} style={{ padding: "12px 14px", background: c.bg, borderRadius: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <EditableText value={comp.nome} onChange={v => update("componenti_principali." + i + ".nome", v)} placeholder="Nome" style={{ fontWeight: 700, fontSize: 13, color: c.dark }} />
                    <X onClick={() => removeFromList("componenti_principali", i)} />
                  </div>
                  {[["Posizione","posizione"],["Specifiche","specifiche"]].map(([lbl,key]) => (
                    <div key={key} style={{ marginTop: 4 }}><span style={{ fontSize: 10, color: c.color }}>{lbl}: </span><EditableText value={comp[key]} onChange={v => update("componenti_principali." + i + "." + key, v)} placeholder="—" style={{ fontSize: 12 }} /></div>
                  ))}
                </div>
              ))}
              <AddBtn onClick={() => addToList("componenti_principali", { nome: "", posizione: "", specifiche: "", note: "" })} label="Aggiungi componente" color={c.color} light={c.light} />
            </Card>
          )}

          {/* Note tecniche */}
          <Card title="Note tecniche" icon="📝">
            {(r.note_tecniche || []).map((n, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ color: c.color, flexShrink: 0, marginTop: 2 }}>•</span>
                <div style={{ flex: 1 }}><EditableText value={n} onChange={v => update("note_tecniche." + i, v)} placeholder="nota..." multiline style={{ fontSize: 13, width: "100%" }} /></div>
                <X onClick={() => removeFromList("note_tecniche", i)} />
              </div>
            ))}
            <AddBtn onClick={() => addToList("note_tecniche", "")} label="Aggiungi nota" color={c.color} light={c.light} />
          </Card>

          {/* Avvertenze */}
          {(r.avvertenze || []).length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
              <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#991b1b", fontSize: 13 }}>Avvertenze</p>
              {r.avvertenze.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 4 }}>
                  <span style={{ color: "#ef4444", flexShrink: 0 }}>•</span>
                  <div style={{ flex: 1 }}><EditableText value={a} onChange={v => update("avvertenze." + i, v)} placeholder="avvertenza..." style={{ fontSize: 13, color: "#7f1d1d" }} /></div>
                  <X onClick={() => removeFromList("avvertenze", i)} />
                </div>
              ))}
            </div>
          )}

          {/* Note tecnico */}
          <div style={{ background: "white", borderRadius: 16, padding: "16px", marginBottom: 14, border: "2px solid " + c.color, boxShadow: "0 2px 12px " + c.color + "22" }}>
            <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: 14, color: c.dark }}>Note del tecnico</p>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>Aggiungi osservazioni o correzioni non rilevate dallo schema.</p>
            <textarea value={notesTecnico} onChange={e => { setNotesTecnico(e.target.value); setSaved(false); }}
              placeholder="Es: Il contatore e all esterno. Tratto in bagno tubi rame. Rilevata perdita al giunto sotto il lavandino..."
              rows={5} style={{ width: "100%", border: "1.5px solid " + c.color + "88", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", background: c.light, color: "#1e293b", boxSizing: "border-box", lineHeight: 1.6 }} />
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "white", borderTop: "1px solid #e2e8f0", padding: "12px 16px", display: "flex", gap: 10, zIndex: 20, boxSizing: "border-box" }}>
          <button onClick={() => setSaved(true)} style={{ flex: 2, padding: "13px", borderRadius: 12, border: "none", background: saved ? "#16a34a" : "linear-gradient(135deg, " + c.dark + ", " + c.color + ")", color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "background 0.3s" }}>
            {saved ? "Salvato" : "Salva correzioni"}
          </button>
          <button onClick={() => window.print()} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1.5px solid " + c.color, background: c.light, color: c.dark, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            Stampa
          </button>
          <button onClick={reset} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            Nuovo
          </button>
        </div>
      </Shell>
    );
  }

  return null;
}

function Shell({ children }) {
  return <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#f1f5f9", minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>{children}</div>;
}

function Header({ title, sub, onBack }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #1e293b, #334155)", padding: "18px 20px 22px", color: "white", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {onBack && <button onClick={onBack} style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", color: "white", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "inherit" }}>‹</button>}
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{title}</h1>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.65, marginTop: 1 }}>{sub}</p>
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon, children }) {
  return (
    <div style={{ background: "white", borderRadius: 16, padding: "16px", marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 14, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}><span>{icon}</span>{title}</p>
      {children}
    </div>
  );
}

function FRow({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>{label}</span>
      {children}
    </div>
  );
}
