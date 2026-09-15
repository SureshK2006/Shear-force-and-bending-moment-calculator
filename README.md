# SFD & BMD Calculator

Professional civil-engineering web app for **shear force diagrams (SFD)** and **bending moment diagrams (BMD)**.

## Run locally

```bash
npm install
npm run dev
```

Open the printed local URL (Vite default is `http://localhost:5173`).

## Verify the calculation engine

```bash
npm run test:engine
```

Textbook cases covered include simply-supported point loads and UDLs, cantilevers, overhanging beams, applied couples, and a propped cantilever.

## Units

Internal analysis is always SI (`m`, `kN`, `kN/m`, `kN·m`). The UI can display US customary units (`ft`, `kip`, `kip/ft`, `kip·ft`).

## Sign convention

- Downward loads are positive.
- Clockwise applied moments are positive.
- Upward reactions are positive.
- Positive shear: left face pushed upward.
- Sagging bending moment is positive; hogging is negative.

## Project layout

- `src/engine/analysis.js` — reusable reaction / SFD / BMD engine
- `src/components/` — dashboard UI, beam drawing, and Recharts diagrams
- `src/engine/examples.js` — textbook demo beams

  ## Project Contributors
  - Suresh Kumar
  - Sourav Kumar Rai
