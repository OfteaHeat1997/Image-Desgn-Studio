export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">UniStudio</h1>
          <p className="text-zinc-400">Tu estudio de fotos con IA para e-commerce</p>
          <p className="text-lg mt-4 text-zinc-300">¿Qué quieres procesar hoy?</p>
        </div>

        {/* ----- Sección principal: los 3 pipelines completos ----- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <a href="/pipelines/lingerie" className="block p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-pink-500/50 transition-all">
            <div className="text-3xl mb-3">🩱</div>
            <h2 className="text-lg font-semibold mb-1">Lencería</h2>
            <p className="text-sm text-zinc-400">Bras, panties, shapewear, fajas — quita modelo, crea modelo IA, prueba virtual, video</p>
            <span className="inline-block mt-3 px-4 py-1.5 bg-pink-500/20 text-pink-400 rounded-full text-xs">Empezar →</span>
          </a>

          <a href="/pipelines/static-product" className="block p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all">
            <div className="text-3xl mb-3">🧴</div>
            <h2 className="text-lg font-semibold mb-1">Perfumes y Belleza</h2>
            <p className="text-sm text-zinc-400">Perfumes, cremas, skincare, maquillaje — fondo blanco + adaptativo + vertical 9:16</p>
            <span className="inline-block mt-3 px-4 py-1.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">Empezar →</span>
          </a>

          <a href="/pipelines/jewelry" className="block p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-yellow-500/50 transition-all">
            <div className="text-3xl mb-3">💎</div>
            <h2 className="text-lg font-semibold mb-1">Joyería</h2>
            <p className="text-sm text-zinc-400">Aretes, cadenas, anillos — estante + foto en modelo + video 360°</p>
            <span className="inline-block mt-3 px-4 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">Empezar →</span>
          </a>
        </div>

        {/* ----- Sección secundaria: utilities (no pipelines) -----
            Removido "Agente IA" porque es redundante para Unistyles —
            los 3 pipelines de arriba cubren todas las categorías que
            la marca vende (lencería + cosméticos + joyería). El módulo
            ai-agent sigue accesible desde "Módulos sueltos" abajo. */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3 text-zinc-400 uppercase tracking-wider">Más opciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <a href="/batch" className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 transition-all flex items-center gap-3">
              <span className="text-2xl">📦</span>
              <div>
                <h3 className="font-medium">Procesamiento Masivo</h3>
                <p className="text-xs text-zinc-500">50+ fotos a la vez</p>
              </div>
            </a>
            <a href="/editor" className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-green-500/50 transition-all flex items-center gap-3">
              <span className="text-2xl">✏️</span>
              <div>
                <h3 className="font-medium">Editar Foto</h3>
                <p className="text-xs text-zinc-500">Edición manual / retoques</p>
              </div>
            </a>
            <a href="/brand-kit" className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all flex items-center gap-3">
              <span className="text-2xl">🎨</span>
              <div>
                <h3 className="font-medium">Kit de Marca</h3>
                <p className="text-xs text-zinc-500">Logo, colores, marca de agua</p>
              </div>
            </a>
          </div>
        </div>

        {/* ----- Módulos sueltos (avanzado) — colapsado por default ----- */}
        <details className="mt-8 group">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-all">
              <span className="text-sm font-semibold text-zinc-300">📸 Módulos sueltos (avanzado)</span>
              <span className="text-xs text-zinc-500 group-open:hidden">Tocar para ver →</span>
              <span className="text-xs text-zinc-500 hidden group-open:inline">Ocultar ↓</span>
            </div>
          </summary>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
            <a href="/editor?module=bg-remove" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Quitar Fondo</span>
              <span className="text-[10px] text-zinc-500">Gratis / $0.01</span>
            </a>
            <a href="/editor?module=bg-generate" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Fondos con IA</span>
              <span className="text-[10px] text-zinc-500">$0.003 - $0.05</span>
            </a>
            <a href="/editor?module=enhance" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Mejorar Calidad</span>
              <span className="text-[10px] text-zinc-500">Gratis</span>
            </a>
            <a href="/editor?module=inpaint" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Borrar y Reemplazar</span>
              <span className="text-[10px] text-zinc-500">$0.03 - $0.05</span>
            </a>
            <a href="/editor?module=upscale" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Aumentar Resolución</span>
              <span className="text-[10px] text-zinc-500">$0.02 - $0.05</span>
            </a>
            <a href="/editor?module=tryon" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Prueba Virtual</span>
              <span className="text-[10px] text-zinc-500">$0.02 - $0.05</span>
            </a>
            <a href="/editor?module=model-create" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Crear Modelo IA</span>
              <span className="text-[10px] text-zinc-500">$0.055</span>
            </a>
            <a href="/editor?module=ghost-mannequin" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Maniquí Invisible</span>
              <span className="text-[10px] text-zinc-500">$0.05 - $0.08</span>
            </a>
            <a href="/editor?module=jewelry" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Joyería Virtual</span>
              <span className="text-[10px] text-zinc-500">$0.05</span>
            </a>
            <a href="/editor?module=video" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Estudio de Video</span>
              <span className="text-[10px] text-zinc-500">$0 - $0.35</span>
            </a>
            <a href="/editor?module=ad-create" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Crear Anuncios</span>
              <span className="text-[10px] text-zinc-500">$0.04 - $0.35</span>
            </a>
            <a href="/editor?module=shadows" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Sombras y Luces</span>
              <span className="text-[10px] text-zinc-500">Gratis / $0.04</span>
            </a>
            <a href="/editor?module=outpaint" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Extender Imagen</span>
              <span className="text-[10px] text-zinc-500">$0.05</span>
            </a>
            <a href="/editor?module=compliance" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Verificar</span>
              <span className="text-[10px] text-zinc-500">Gratis</span>
            </a>
            <a href="/editor?module=smart-editor" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Editor Avanzado</span>
              <span className="text-[10px] text-zinc-500">Gratis</span>
            </a>
            <a href="/editor?module=ai-prompt" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Director Creativo</span>
              <span className="text-[10px] text-zinc-500">Gratis</span>
            </a>
            <a href="/editor?module=ai-agent" className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600 text-sm transition-all">
              <span className="block font-medium">Agente IA</span>
              <span className="text-[10px] text-zinc-500">Genérico</span>
            </a>
          </div>
        </details>

        {/* Quick links */}
        <div className="flex justify-center gap-6 mt-10 mb-8 text-sm text-zinc-500">
          <a href="/gallery" className="hover:text-white">📁 Galería</a>
          <a href="/workflows" className="hover:text-white">📋 Workflows</a>
          <a href="/docs" className="hover:text-white">📖 Documentación</a>
        </div>
      </div>
    </div>
  );
}
