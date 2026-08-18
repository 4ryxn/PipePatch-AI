import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnalysisRequestError, analyze, type Analysis } from "./api";
import { completeAnalysis } from "./analysisFlow";
import { isReadableImage, validateImageFile } from "./imageValidation";
import "./style.css";

type View = "home" | "guidance" | "review" | "analysis";
const label = (category?: string): string => (category ?? "unknown_or_unsupported").replaceAll("_", " ");
const isBlocked = (result: Analysis): boolean => result.is_mock || !result.supported_case || result.damage_category !== "clean_transverse_cut";
const steps: Array<[View, string]> = [["guidance", "Photo"], ["review", "Review"], ["analysis", "Analysis"], ["analysis", "Next steps"]];

function App(): React.JSX.Element {
  const [view, setView] = useState<View>("home");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const active = useRef(0);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const clearImage = (): void => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setFile(null); };
  const reset = (next: View = "home"): void => { active.current += 1; abort.current?.abort(); clearImage(); setResult(null); setBusy(false); setChecking(false); setError(""); setView(next); };
  const choose = (next: File | null): void => {
    const selectionId = ++active.current;
    const validation = validateImageFile(next);
    if (!validation.valid || !next) { setError(validation.valid ? "Choose a readable image." : validation.message); return; }
    setChecking(true); setError("");
    void isReadableImage(next).then((readable) => {
      if (active.current !== selectionId) return;
      if (!readable) { setError("This image could not be read. Choose another JPG, PNG, or WebP image."); return; }
      clearImage(); setFile(next); setPreviewUrl(URL.createObjectURL(next)); setResult(null); setView("review");
    }).catch(() => { if (active.current === selectionId) setError("This image could not be read. Choose another image.");
    }).finally(() => { if (active.current === selectionId) setChecking(false); });
  };
  const upload = (): void => {
    if (!file || busy || checking) return;
    const id = ++active.current; const controller = new AbortController(); abort.current = controller; setBusy(true); setError("");
    void analyze(file, controller.signal).then((value) => {
      const transition = completeAnalysis(active.current, id, value);
      if (transition) { setResult(transition.result); setView(transition.view); }
    }).catch((reason: unknown) => {
      const cancelled = reason instanceof Error && reason.name === "AbortError";
      if (active.current === id && !cancelled) setError(reason instanceof AnalysisRequestError ? reason.message : "Could not reach the configured analysis service. Check the connection and retry.");
    }).finally(() => { if (active.current === id) setBusy(false); });
  };
  const openPicker = (camera = false): void => { if (checking || busy || !input.current) return; if (camera) input.current.capture = "environment"; else input.current.removeAttribute("capture"); input.current.click(); };
  const onDrop = (event: DragEvent<HTMLDivElement>): void => { event.preventDefault(); if (!checking && !busy) choose(event.dataTransfer.files[0] ?? null); };
  const progress = view !== "home" && <nav className="progress" aria-label="Inspection progress">{steps.map(([key, text], index) => <span key={`${text}-${index}`} className={view === key || (view === "analysis" && index < 3) ? "active" : ""}><i>{index + 1}</i>{text}</span>)}</nav>;

  return <main className="app-shell"><header className="topbar"><a className="brand" href="#top" onClick={(event) => { event.preventDefault(); reset(); }}><Mark/><span><b>PipePatch</b><small>FIELD SYSTEM</small></span></a><div className="topbar-status"><span className="inspection-status"><i/>Irrigation inspection</span><span className="safety-badge"><Shield/>Safety-bounded</span></div></header>{progress}{error && <div className="notice error" role="alert"><div><strong>Action needed</strong><span>{error}</span></div><button type="button" onClick={() => setError("")}>Dismiss</button></div>}
    {view === "home" ? <Home onStart={() => setView("guidance")}/> : null}
    {view === "guidance" && <section className="workspace"><WorkspaceHeader step="01" title="Photo intake" text="Capture enough context for a cautious visual observation."/><div className="intake-layout"><div className="capture-workspace" role="button" tabIndex={0} aria-label="Choose or drop a pipe photo" onDragOver={(event) => event.preventDefault()} onDrop={onDrop} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openPicker(); }} onClick={() => openPicker()}><UploadIllustration/><strong>{checking ? "Checking selected image…" : "Drop a field photo here"}</strong><span>{checking ? "Verifying that the browser can read it" : "or select a photo from this device"}</span><small>JPG · PNG · WebP &nbsp;|&nbsp; Max 8 MB &nbsp;|&nbsp; kept only in this session</small></div><aside className="capture-notes"><h3>Frame the inspection</h3><GuideItem number="01" title="Show both pipe ends" text="Leave room around the break, not just the damaged edge."/><GuideItem number="02" title="Include markings" text="Show readable pipe markings where visible."/><GuideItem number="03" title="Use the marker" text="Keep the complete 50 mm reference marker in the same plane."/><GuideItem number="04" title="Avoid shadows" text="Use steady, even light with no obstruction."/></aside></div><input ref={input} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => { choose(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }}/><div className="workspace-actions"><button className="primary" disabled={checking} onClick={() => openPicker(true)}><Camera/>Take photo</button><button className="secondary" disabled={checking} onClick={() => openPicker()}><Folder/>Choose image</button><button className="quiet" onClick={() => reset()}>Back</button></div></section>}
    {view === "review" && <section className="workspace review-workspace"><WorkspaceHeader step="02" title="Review capture" text="Confirm this is the photo you want to send for observation."/><div className="review-layout"><div className="image-frame">{previewUrl ? <img src={previewUrl} alt="Selected pipe inspection"/> : <div className="image-empty">No active image</div>}<span className="memory-chip">Temporary browser memory</span></div><aside className="review-side"><div className="file-card"><FileIcon/><div><strong>{file?.name ?? "No image selected"}</strong><span>{file ? formatBytes(file.size) : ""} · Original image unchanged</span></div></div><div className="review-check"><Shield/><p>The photo is sent only when you confirm. It is not stored by this web app after you replace or finish.</p></div><p className="review-note">The analysis is observational. It cannot authorize a repair or confirm hidden conditions.</p></aside></div>{busy && <div className="loading-row" role="status"><Spinner/><span>Sending the active image for analysis…</span></div>}<div className="workspace-actions"><button className="primary" disabled={!file || busy || checking} onClick={upload}>{busy ? "Analyzing…" : "Confirm & analyze"}</button>{busy && <button className="secondary" onClick={() => { abort.current?.abort(); active.current += 1; setBusy(false); }}>Cancel</button>}<button className="secondary" disabled={busy} onClick={() => reset("guidance")}>Replace photo</button><button className="quiet" disabled={busy} onClick={() => reset()}>End inspection</button></div></section>}
    {view === "analysis" && result && <AnalysisReport result={result} onRestart={() => reset("guidance")} onFinish={() => reset()}/>}<footer><span>PipePatch AI</span> provides observation-only information. Product labels, local requirements, and qualified professionals take priority.</footer></main>;
}

function Home({ onStart }: { onStart: () => void }): React.JSX.Element { return <><section className="hero-workspace" id="top"><div className="hero-copy"><p className="eyebrow">FIELD INSPECTION WORKSPACE</p><h1>Understand a damaged irrigation pipe before you call for help.</h1><p>Bring a clear field photo into one controlled inspection workspace. PipePatch reports visible observations and keeps uncertain or unsafe cases from advancing.</p><button className="primary hero-action" onClick={onStart}>Start an inspection <Arrow/></button><div className="hero-facts"><Fact icon={<Memory/>} title="Temporary photo" text="Held in this browser session only."/><Fact icon={<Eye/>} title="Observations only" text="AI never authorizes a repair."/><Fact icon={<Shield/>} title="Safe stop" text="Unsupported cases remain blocked."/></div></div><InspectionIllustration/></section><section className="process" aria-label="Three-step process"><ProcessStep number="01" title="Capture context" text="Take a clear photo of the pipe, break, surroundings, and reference marker."/><ProcessStep number="02" title="Review once" text="Confirm the active image before it is sent to your configured backend."/><ProcessStep number="03" title="Read safely" text="Review observations, uncertainties, safety flags, and the next safe action."/></section></>; }
function AnalysisReport({ result, onRestart, onFinish }: { result: Analysis; onRestart: () => void; onFinish: () => void }): React.JSX.Element { const blocked = isBlocked(result); const confidence = Math.max(0, Math.min(100, Math.round(result.confidence * 100))); return <section className="report"><WorkspaceHeader step="03" title="Observation report" text={result.is_mock ? "Demonstration result — not live analysis." : "A cautious visual observation of the confirmed photo."}/><div className="report-summary"><div><span className={`category-pill ${blocked ? "blocked" : "supported"}`}>{blocked ? "Guidance blocked" : "Observation received"}</span><h2>{label(result.damage_category)}</h2><p>{result.summary}</p></div><div className="confidence-meter" aria-label={`Confidence ${confidence}%`}><svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="16"/><circle className="meter-value" cx="21" cy="21" r="16" pathLength="100" strokeDasharray={`${confidence} 100`}/></svg><div><strong>{confidence}%</strong><span>confidence</span></div></div></div><div className="report-category"><span>Observed damage category</span><strong>{label(result.damage_category)}</strong><p>Confidence reflects the visual observation only. It does not confirm pipe size, material, schedule, or repair safety.</p></div>{blocked ? <div className="blocked-treatment"><div><Shield/><strong>DIY repair guidance is not available for this result.</strong></div><p>{result.next_action || "Retake a clearer photo or seek qualified local help."}</p></div> : <div className="safe-treatment"><div><Shield/><strong>This result remains observation-only.</strong></div><p>Additional confirmation is required before any controlled project workflow could proceed.</p></div>}<div className="report-grid"><ReportList title="Visible evidence" icon={<Eye/>} values={result.evidence}/><ReportList title="Unknowns to clarify" icon={<Question/>} values={result.unknowns}/></div><ReportList title="Safety flags" icon={<Shield/>} values={result.safety_flags}/><div className="next-action"><span>Recommended next action</span><strong>{result.next_action}</strong></div><div className="workspace-actions"><button className="primary" onClick={onRestart}>Inspect another photo</button><button className="secondary" onClick={onFinish}>Finish</button></div></section>; }
function WorkspaceHeader({ step, title, text }: { step: string; title: string; text: string }): React.JSX.Element { return <div className="workspace-header"><span>{step}</span><div><p className="eyebrow">PIPEPATCH INSPECTION</p><h2>{title}</h2><p>{text}</p></div></div>; }
function GuideItem({ number, title, text }: { number: string; title: string; text: string }): React.JSX.Element { return <div className="guide-item"><span>{number}</span><div><strong>{title}</strong><p>{text}</p></div></div>; }
function Fact({ icon, title, text }: { icon: React.JSX.Element; title: string; text: string }): React.JSX.Element { return <article>{icon}<div><strong>{title}</strong><p>{text}</p></div></article>; }
function ProcessStep({ number, title, text }: { number: string; title: string; text: string }): React.JSX.Element { return <article><span>{number}</span><h2>{title}</h2><p>{text}</p></article>; }
function ReportList({ title, icon, values }: { title: string; icon: React.JSX.Element; values: string[] }): React.JSX.Element { return <section className="report-list"><header>{icon}<strong>{title}</strong></header><ul>{values.length ? values.map((value) => <li key={value}>{value}</li>) : <li>No additional details were provided.</li>}</ul></section>; }
function formatBytes(bytes: number): string { return `${(bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`; }
function Mark(): React.JSX.Element { return <svg className="mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 7h22v18H5zM9 12h14M9 17h8M9 22h12"/><path d="M22 6v20"/></svg>; }
function Shield(): React.JSX.Element { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-2.9 8.2-7 10-4.1-1.8-7-5.4-7-10V6l7-3zM9 12l2 2 4-4"/></svg>; }
function Camera(): React.JSX.Element { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h4l1.5-2h5L16 8h4v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z"/></svg>; }
function Folder(): React.JSX.Element { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h7l2 2h9v10H3z"/></svg>; }
function Eye(): React.JSX.Element { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z"/></svg>; }
function Memory(): React.JSX.Element { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v3M12 4v3M17 4v3M7 17v3M12 17v3M17 17v3M4 7h3M4 12h3M4 17h3M17 7h3M17 12h3M17 17h3M8 8h8v8H8z"/></svg>; }
function Question(): React.JSX.Element { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 9a2.5 2.5 0 115 0c0 2.5-2.5 2.2-2.5 4.5M12 17h.01"/></svg>; }
function FileIcon(): React.JSX.Element { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h6"/></svg>; }
function Arrow(): React.JSX.Element { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M14 6l6 6-6 6"/></svg>; }
function Spinner(): React.JSX.Element { return <i className="spinner" aria-hidden="true"/>; }
function UploadIllustration(): React.JSX.Element { return <svg className="upload-illustration" viewBox="0 0 120 92" aria-hidden="true"><path d="M10 71h100M21 71V25h78v46M34 45l12-12 10 10 13-15 20 21"/><circle cx="44" cy="40" r="5"/><path d="M60 81V54m0 0l-9 9m9-9l9-9"/></svg>; }
function InspectionIllustration(): React.JSX.Element { return <div className="inspection-visual" aria-hidden="true"><svg viewBox="0 0 620 450"><path className="ground" d="M0 268c70-19 124 13 198-8 83-24 151 8 222-11 78-21 123 2 200-18v219H0z"/><path className="soil-line" d="M0 268c70-19 124 13 198-8 83-24 151 8 222-11 78-21 123 2 200-18"/><path className="pipe" d="M72 309h196l30-26m20 0l37 32h193"/><path className="pipe-inner" d="M72 325h202l29-25m18 0l31 25h196"/><path className="cut" d="M293 280l13 27m12-30l15 30"/><rect className="marker" x="410" y="134" width="92" height="92" rx="4"/><path className="marker-grid" d="M424 148h20v20h-20zm34 0h30v30h-30zm-34 34h30v30h-30zm44 10h20v20h-20z"/><path className="scan" d="M55 149h108M55 149v30M163 149v30M378 116h150M378 116v32M528 116v32"/><path className="measure" d="M410 245h92m-92-7v14m92-14v14"/><text x="426" y="265">50 mm reference</text><circle className="scan-dot" cx="303" cy="294" r="7"/></svg><div className="visual-label"><i/><span>FIELD VIEW<br/><b>REFERENCE IN FRAME</b></span></div></div>; }

createRoot(document.getElementById("root")!).render(<App/>);
