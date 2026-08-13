import { useState } from 'react'
import { entrarConGoogle } from '../lib/firebase'

export default function Entrar() {
  const [entrando, setEntrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function entrar() {
    setError(null)
    setEntrando(true)
    try {
      await entrarConGoogle()
    } catch (fallo) {
      const codigo = (fallo as { code?: string })?.code ?? ''
      setError(
        codigo === 'auth/network-request-failed'
          ? 'No hay internet. Conéctate y vuelve a intentar.'
          : codigo === 'auth/unauthorized-domain'
            ? 'Este dominio todavía no está autorizado en Firebase.'
            : 'No se pudo entrar. Intenta de nuevo en un momento.',
      )
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="zona-segura-arriba zona-segura-abajo flex min-h-full flex-col items-center justify-center gap-8 px-7 py-12">
      <div className="flex flex-col items-center gap-5 text-center">
        <div
          className="anim-gota h-24 w-24 rounded-[50%_50%_50%_0] bg-gradient-to-br from-[var(--color-agua-clara)] via-[var(--color-agua)] to-[var(--color-agua-honda)] shadow-[0_22px_50px_rgba(53,182,240,0.4)]"
        />
        <div>
          <h1 className="font-[family-name:var(--font-titulo)] text-3xl font-bold">
            Mascota de Agua
          </h1>
          <p className="mt-3 text-balance text-[15px] leading-relaxed text-[var(--color-texto-suave)]">
            Tu mascota es tu cuerpo. Cuando tomas agua, revive. Cuando no, te dice
            exactamente lo que está pasando por dentro.
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm">
        <button
          type="button"
          onClick={entrar}
          disabled={entrando}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 font-semibold text-[#1f1f1f] shadow-lg transition active:scale-[0.98] disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          {entrando ? 'Entrando...' : 'Entrar con Google'}
        </button>

        {error && (
          <p className="mt-4 rounded-2xl border border-[var(--color-peligro)]/40 bg-[var(--color-peligro)]/10 px-4 py-3 text-center text-sm text-[var(--color-peligro)]">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-xs leading-relaxed text-[var(--color-texto-suave)]/80">
          Tus datos son solo tuyos: nadie más puede verlos, ni siquiera otra persona
          que use la app. Las fotos de tus vasos se quedan guardadas en este teléfono
          y no se suben a ningún servidor.
        </p>
      </div>
    </div>
  )
}
