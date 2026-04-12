"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          backgroundColor: "#09090B",
          color: "#E4E4E7",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          margin: 0,
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <h1 style={{ color: "#C5A47E", fontSize: "1.5rem", marginBottom: 8 }}>
            Algo salio mal
          </h1>
          <p style={{ color: "#71717A", fontSize: "0.875rem", marginBottom: 24 }}>
            {error.message || "Error inesperado en la aplicacion."}
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: "#C5A47E",
              color: "#09090B",
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
