export default function Cargando({ texto }: { texto: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-5">
      <div className="anim-gota h-16 w-16 rounded-[50%_50%_50%_0] bg-gradient-to-br from-[var(--color-agua-clara)] to-[var(--color-agua-honda)]" />
      <p className="text-sm tracking-widest text-[var(--color-texto-suave)] uppercase">{texto}</p>
    </div>
  )
}
