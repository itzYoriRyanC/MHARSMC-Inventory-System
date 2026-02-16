// src/services/reportsExport.js
// ✅ Export helpers moved out of Reports.jsx (cleaner)

export function exportCSV(filename, rows) {
  const escape = (v) => {
    const s = String(v ?? "");
    if (/[,"\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export function exportPDF(title, htmlTable) {
  // ✅ Print-to-PDF (no libs)
  const win = window.open("", "_blank", "width=1000,height=700");
  if (!win) return alert("Popup blocked. Allow popups to export PDF.");

  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { margin: 0 0 12px; }
          p { margin: 0 0 16px; opacity: .75; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f6f2; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        ${htmlTable}
      </body>
    </html>
  `);

  win.document.close();
  win.focus();
  win.print();
}
