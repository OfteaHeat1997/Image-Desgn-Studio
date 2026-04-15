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

        {/* More links */}
        <div className="flex justify-center gap-6 mt-8 text-sm text-zinc-500">
          <a href="/gallery" className="hover:text-white">Galería</a>
          <a href="/brand-kit" className="hover:text-white">Kit de Marca</a>
          <a href="/batch" className="hover:text-white">Batch</a>
        </div>
      </div>
    </div>
  );
}
