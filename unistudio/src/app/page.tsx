import { COPY } from "@/lib/design/copy";
import { AudioButton } from "@/components/ui/AudioButton";

/**
 * Dashboard / Home page.
 *
 * Diseño basado en research de Photoroom, Claid y Pebblely (los 3 líderes
 * de AI product photography para e-commerce). Patrones aplicados:
 *
 *  1. Mobile-first — los 3 pipelines son cards grandes en columna en mobile,
 *     row en desktop. Photoroom domina mobile y eso es donde la usuaria
 *     hace testing.
 *  2. Outcome > proceso — la descripción dice qué SALE, no qué pasa
 *     ("Estante de lujo + foto en modelo + video 360°" en vez de
 *     "Aretes, cadenas, anillos — estante + foto en modelo + video 360°").
 *  3. Design tokens — usa el oro premium del brand (--accent #D4B48A)
 *     en lugar de colores random tipo pink/amber/yellow. Inspirado en
 *     Claid (single-brand color) en vez de Photoroom (multi-color).
 *  4. Jerarquía visual — la sección principal son los pipelines, todo lo
 *     demás (utilities, módulos sueltos) es claramente secundario.
 *  5. Texto centralizado — todas las strings desde lib/design/copy.ts
 *     para que la usuaria pueda iterar UX text sin tocar JSX.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface text-heading">
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <header className="text-center mb-10 md:mb-14">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gradient">
            {COPY.app.name}
          </h1>
          <p className="text-muted text-sm md:text-base">{COPY.app.tagline}</p>
          <p className="mt-6 text-lg md:text-xl text-heading font-medium">
            {COPY.dashboard.title}
          </p>
          <p className="mt-1 text-sm text-muted">{COPY.dashboard.subtitle}</p>
          <div className="mt-3 flex justify-center">
            <AudioButton
              variant="inline"
              text={`${COPY.app.name}. ${COPY.app.tagline}. ${COPY.dashboard.title}. ${COPY.dashboard.subtitle}. Tienes tres pipelines: lencería para bras y panties, perfumes y belleza para cremas y maquillaje, y joyería para anillos y aretes.`}
            />
          </div>
        </header>

        {/* ── Sección principal: 3 pipelines ──────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-10">
          <PipelineCard
            href="/pipelines/lingerie"
            data={COPY.pipelines.lingerie}
          />
          <PipelineCard
            href="/pipelines/static-product"
            data={COPY.pipelines.beauty}
          />
          <PipelineCard
            href="/pipelines/jewelry"
            data={COPY.pipelines.jewelry}
          />
        </section>

        {/* ── Utilities ──────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold mb-3 text-muted uppercase tracking-wider">
            Más opciones
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
            <UtilityCard href="/batch" data={COPY.utilities.batch} />
            <UtilityCard href="/editor" data={COPY.utilities.editor} />
            <UtilityCard href="/brand-kit" data={COPY.utilities.brandKit} />
          </div>
        </section>

        {/* ── Módulos sueltos (avanzado) ─────────────────────────── */}
        <details className="mb-8 group">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-light border border-[var(--border-default)] hover:border-[var(--accent-muted)] transition-default">
              <span className="text-sm font-semibold text-body">
                📸 Módulos sueltos (avanzado)
              </span>
              <span className="text-xs text-muted group-open:hidden">Ver →</span>
              <span className="text-xs text-muted hidden group-open:inline">Ocultar ↓</span>
            </div>
          </summary>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            <ModuleLink
              href="/editor?module=bg-remove" name="Quitar fondo" cost="$0.01"
              description="Borra el fondo de tu foto y deja solo el producto sobre transparente. Ideal para listados."
            />
            <ModuleLink
              href="/editor?module=bg-generate" name="Fondos con IA" cost="$0.003 - $0.05"
              description="Genera un fondo nuevo con inteligencia artificial. Mármol, playa, gradient o lo que quieras."
            />
            <ModuleLink
              href="/editor?module=enhance" name="Mejorar calidad" cost="Gratis"
              description="Ajusta brillo, contraste y nitidez automáticamente para que la foto se vea profesional."
            />
            <ModuleLink
              href="/editor?module=inpaint" name="Borrar y reemplazar" cost="$0.03 - $0.05"
              description="Selecciona una zona de la foto y la IA la reemplaza por algo distinto. Perfecto para borrar manchas o cambiar detalles."
            />
            <ModuleLink
              href="/editor?module=upscale" name="Aumentar resolución" cost="$0.02 - $0.05"
              description="Duplica o cuadruplica la resolución sin perder detalle. Para imprimir o zoom de catálogo."
            />
            <ModuleLink
              href="/editor?module=tryon" name="Prueba virtual" cost="$0.02 - $0.05"
              description="Viste una modelo IA con tu prenda real. La modelo no existe pero la prenda es tuya."
            />
            <ModuleLink
              href="/editor?module=model-create" name="Crear modelo IA" cost="$0.055"
              description="Genera una persona con licencia libre que puedes reusar en todas las fotos del mismo producto."
            />
            <ModuleLink
              href="/editor?module=ghost-mannequin" name="Maniquí invisible" cost="$0.05 - $0.08"
              description="Quita la modelo o el maniquí y deja la prenda flotando estilo producto 3D."
            />
            <ModuleLink
              href="/editor?module=jewelry" name="Joyería virtual" cost="$0.05"
              description="Coloca un anillo, arete o cadena en una modelo IA. Ideal para mostrar la pieza puesta."
            />
            <ModuleLink
              href="/editor?module=video" name="Estudio de video" cost="$0 - $0.35"
              description="Crea videos cortos a partir de tus fotos. Para Reels, Stories, TikTok."
            />
            <ModuleLink
              href="/editor?module=ad-create" name="Crear anuncios" cost="$0.04 - $0.35"
              description="Diseña anuncios listos para Meta o Google con tus productos y tu marca."
            />
            <ModuleLink
              href="/editor?module=shadows" name="Sombras y luces" cost="$0.04"
              description="Agrega sombras profesionales debajo del producto para que se vea natural en cualquier fondo."
            />
            <ModuleLink
              href="/editor?module=outpaint" name="Extender imagen" cost="$0.05"
              description="Amplía la foto más allá de los bordes. La IA inventa el resto de la escena de forma coherente."
            />
            <ModuleLink
              href="/editor?module=compliance" name="Verificar" cost="Gratis"
              description="Revisa que tu foto cumpla las reglas de Amazon, MercadoLibre y otros marketplaces."
            />
            <ModuleLink
              href="/editor?module=smart-editor" name="Editor avanzado" cost="Gratis"
              description="Editor visual con todas las herramientas para retoques manuales detallados."
            />
            <ModuleLink
              href="/editor?module=ai-prompt" name="Director creativo" cost="Gratis"
              description="Conversa con la IA para que te ayude a escribir prompts y crear imágenes desde cero."
            />
            <ModuleLink
              href="/editor?module=ai-agent"
              name="Agente IA"
              cost="Para producto fuera de las 3 categorías"
              description="Para productos que no encajan en lencería, perfumes o joyería. La IA lee la foto y decide qué pasos correr automáticamente."
              wide
            />
          </div>
        </details>

        {/* ── Quick links ────────────────────────────────────────── */}
        <nav className="flex justify-center gap-8 mt-10 mb-6 text-sm text-muted">
          <a href="/gallery" className="hover:text-[var(--accent)] transition-default">📁 Galería</a>
          <a href="/workflows" className="hover:text-[var(--accent)] transition-default">📋 Workflows</a>
          <a href="/docs" className="hover:text-[var(--accent)] transition-default">📖 Docs</a>
        </nav>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                              */
/* -------------------------------------------------------------------------- */

interface PipelineCardData {
  title: string;
  icon: string;
  tagline: string;
  benefit: string;
  cta: string;
  video: string;
}

function PipelineCard({ href, data }: { href: string; data: PipelineCardData }) {
  return (
    <a
      href={href}
      className="group block rounded-xl bg-surface-light border border-[var(--border-default)] hover:border-[var(--accent)] hover:bg-surface-elevated transition-default overflow-hidden"
    >
      {/* Video preview — autoplay muted loop, muestra qué hace el pipeline */}
      <div className="relative aspect-video bg-surface-elevated overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-default"
        >
          <source src={data.video} type="video/mp4" />
        </video>
        {/* Overlay gradient para que el icono se lea */}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,12,14,0.95)] via-[rgba(12,12,14,0.3)] to-transparent" />
        <span className="absolute top-3 left-3 text-3xl drop-shadow-lg">{data.icon}</span>
      </div>
      <div className="p-4 md:p-5">
        <h3 className="text-lg md:text-xl font-bold mb-1 text-heading">{data.title}</h3>
        <p className="text-xs text-muted mb-2">{data.tagline}</p>
        <p className="text-sm text-body leading-snug">{data.benefit}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--accent-dim)] text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--bg-primary)] transition-default">
            {data.cta}
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
          <div onClick={(e) => e.preventDefault()}>
            <AudioButton text={`${data.title}. ${data.tagline}. ${data.benefit}`} size="sm" />
          </div>
        </div>
      </div>
    </a>
  );
}

interface UtilityCardData {
  title: string;
  icon: string;
  benefit: string;
  video: string;
}

function UtilityCard({ href, data }: { href: string; data: UtilityCardData }) {
  return (
    <a
      href={href}
      className="group block rounded-lg bg-surface-light border border-[var(--border-default)] hover:border-[var(--accent-muted)] transition-default overflow-hidden"
    >
      {/* Mini-video preview en utility cards */}
      <div className="relative aspect-[16/9] bg-surface-elevated overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-default"
        >
          <source src={data.video} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,12,14,0.85)] to-transparent" />
        <span className="absolute top-2 left-2 text-xl drop-shadow">{data.icon}</span>
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <h3 className="font-medium text-sm text-heading truncate">{data.title}</h3>
          <p className="text-xs text-muted truncate">{data.benefit}</p>
        </div>
        <div onClick={(e) => e.preventDefault()} className="shrink-0">
          <AudioButton text={`${data.title}. ${data.benefit}`} size="sm" />
        </div>
      </div>
    </a>
  );
}

function ModuleLink({
  href,
  name,
  cost,
  description,
  wide,
}: {
  href: string;
  name: string;
  cost: string;
  description?: string;
  wide?: boolean;
}) {
  // Texto que se lee cuando la usuaria toca 🔊. Si hay description (más
  // explicativa) la usamos, sino combinamos el nombre + costo.
  const audioText = description
    ? `${name}. ${description}. Costo: ${cost}.`
    : `${name}. Costo: ${cost}.`;
  return (
    <div
      className={`relative ${wide ? "col-span-2 md:col-span-4" : ""}`}
    >
      <a
        href={href}
        className="block p-2.5 pr-9 rounded-lg bg-surface-light/40 border border-[var(--border-subtle)] hover:border-[var(--accent-muted)] text-sm transition-default"
      >
        <span className="block font-medium text-body">{name}</span>
        <span className="block text-[10px] text-muted leading-tight">{cost}</span>
      </a>
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
        <AudioButton text={audioText} size="sm" />
      </div>
    </div>
  );
}
