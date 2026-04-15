export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">UniStudio</h1>
          <p className="text-zinc-400">Tu estudio de fotos con IA para e-commerce</p>
          <p className="text-lg mt-4 text-zinc-300">¿Qué quieres hacer?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Card 1 */}
          <a href="/editor?agent=modelo" className="block p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-pink-500/50 transition-all">
            <div className="text-3xl mb-3">👗</div>
            <h2 className="text-lg font-semibold mb-1">Cambiar Modelo de mi Ropa</h2>
            <p className="text-sm text-zinc-400">Sube tu foto de lencería o ropa con modelo → elige nueva modelo → ¡Listo!</p>
            <span className="inline-block mt-3 px-4 py-1.5 bg-pink-500/20 text-pink-400 rounded-full text-xs">Empezar →</span>
          </a>

          {/* Card 2 */}
          <a href="/editor?agent=ecommerce" className="block p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all">
            <div className="text-3xl mb-3">🧴</div>
            <h2 className="text-lg font-semibold mb-1">Fotos de Perfumes y Belleza</h2>
            <p className="text-sm text-zinc-400">Fotos profesionales de perfumes, cremas, y cuidado personal con fondos de lujo</p>
            <span className="inline-block mt-3 px-4 py-1.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">Empezar →</span>
          </a>

          {/* Card 3 */}
          <a href="/editor?agent=catalogo" className="block p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-yellow-500/50 transition-all">
            <div className="text-3xl mb-3">💎</div>
            <h2 className="text-lg font-semibold mb-1">Fotos de Joyería</h2>
            <p className="text-sm text-zinc-400">Exhibidores, fondos de lujo, y fotos profesionales de tu joyería</p>
            <span className="inline-block mt-3 px-4 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">Empezar →</span>
          </a>

          {/* Card 4 */}
          <a href="/batch" className="block p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 transition-all">
            <div className="text-3xl mb-3">📦</div>
            <h2 className="text-lg font-semibold mb-1">Procesar Muchas Fotos</h2>
            <p className="text-sm text-zinc-400">Sube 50+ fotos y aplica el mismo proceso a todas de una vez</p>
            <span className="inline-block mt-3 px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-xs">Ir al Batch →</span>
          </a>
        </div>

        {/* Editor link */}
        <a href="/editor" className="block p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-green-500/50 transition-all text-center">
          <span className="text-xl mr-2">✏️</span>
          <span className="font-medium">Editar una Foto Manualmente</span>
          <span className="text-sm text-zinc-400 ml-2">— Todas las herramientas disponibles</span>
        </a>

        {/* AI Agents Section */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">🤖 Automatización con IA</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a href="/editor?module=ai-agent" className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-violet-500/50 transition-all">
              <h3 className="font-medium">Agente IA</h3>
              <p className="text-xs text-zinc-500">El AI decide los pasos y ejecuta todo automáticamente</p>
            </a>
            <a href="/batch" className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 transition-all">
              <h3 className="font-medium">Procesamiento Masivo</h3>
              <p className="text-xs text-zinc-500">Procesa 50+ imágenes con un pipeline configurable</p>
            </a>
            <a href="/catalog-pipeline" className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 transition-all">
              <h3 className="font-medium">Pipeline de Catálogo</h3>
              <p className="text-xs text-zinc-500">Genera catálogo completo de una referencia</p>
            </a>
            <a href="/brand-kit" className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all">
              <h3 className="font-medium">Kit de Marca</h3>
              <p className="text-xs text-zinc-500">Tu logo, colores, y marca de agua</p>
            </a>
          </div>
        </div>

        {/* All Modules Section */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">📸 Todos los Módulos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
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
          </div>
        </div>

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
