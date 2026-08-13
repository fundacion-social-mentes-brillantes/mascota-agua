// Las alarmas de agua.
//
// Cadencia: cada 90 minutos cuando el dia va bien, cada 60 si va justo y
// cada 45 si ya lleva mucho sin beber. Nunca entre la hora de dormir y la
// de despertar: una app de salud que despierta a la gente de madrugada esta
// haciendo justo lo contrario de lo que promete.
import { useEffect, useRef } from 'react'
import { esHoraDeDormir, minutosHastaElProximoAviso } from './hidratacion'
import type { EstadoCuerpo, Perfil } from './tipos'

const CLAVE_ULTIMO_AVISO = 'mascota-agua:ultimo-aviso'

export function avisosSoportados(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function estadoDeLosAvisos(): NotificationPermission | 'no-soportado' {
  if (!avisosSoportados()) return 'no-soportado'
  return Notification.permission
}

/** Hay que llamarla desde un boton: los navegadores no dejan pedirlo solo. */
export async function pedirPermisoAvisos(): Promise<NotificationPermission | 'no-soportado'> {
  if (!avisosSoportados()) return 'no-soportado'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

function leerUltimoAviso(): number {
  const guardado = window.localStorage.getItem(CLAVE_ULTIMO_AVISO)
  const valor = guardado ? Number.parseInt(guardado, 10) : 0
  return Number.isFinite(valor) ? valor : 0
}

function textoDelAviso(estado: EstadoCuerpo, nombre: string): { titulo: string; cuerpo: string } {
  const horas = Number.isFinite(estado.horasSinBeber) ? Math.floor(estado.horasSinBeber) : null
  if (estado.nivel === 'critico') {
    return {
      titulo: `${nombre} está en rojo`,
      cuerpo: horas
        ? `${horas} horas sin agua. Un vaso ahora, despacio.`
        : 'Hoy no has tomado agua todavía. Un vaso ahora.',
    }
  }
  if (estado.nivel === 'bajo') {
    return {
      titulo: `${nombre} está flojito`,
      cuerpo: `Vas en ${estado.totalHoyMl} ml de ${estado.metaMl}. Un vaso y volvemos al ritmo.`,
    }
  }
  return {
    titulo: 'Hora de agua',
    cuerpo: horas
      ? `${nombre} lleva ${horas} horas esperando. Vas en ${estado.totalHoyMl} ml de ${estado.metaMl}.`
      : `Vas en ${estado.totalHoyMl} ml de ${estado.metaMl}.`,
  }
}

/**
 * Revisa cada minuto si toca avisar. No usa temporizadores largos a
 * proposito: en celular el navegador los mata, y este se recupera solo cada
 * vez que la persona vuelve a abrir la app.
 */
export function useRecordatorios(
  perfil: Perfil | null,
  estado: EstadoCuerpo | null,
  nombreMascota: string,
) {
  // El estado se guarda en una referencia para que el temporizador de abajo
  // siempre lea el ultimo, sin tener que volver a crearse en cada cambio.
  const ultimoEstado = useRef<EstadoCuerpo | null>(null)
  useEffect(() => {
    ultimoEstado.current = estado
  }, [estado])

  useEffect(() => {
    if (!perfil?.recordatoriosActivos) return
    if (!avisosSoportados() || Notification.permission !== 'granted') return

    function revisar() {
      const actual = ultimoEstado.current
      if (!actual || !perfil) return
      if (esHoraDeDormir(perfil)) return
      // Ya cumplio la meta del dia: no molestamos mas.
      if (actual.totalHoyMl >= actual.metaMl) return
      if (actual.alertaExceso) return

      const espera = minutosHastaElProximoAviso(actual) * 60_000
      const ultimo = leerUltimoAviso()
      if (Date.now() - ultimo < espera) return
      // No avisa si acaba de tomar agua hace menos de una hora.
      if (Number.isFinite(actual.horasSinBeber) && actual.horasSinBeber < 1) return

      const { titulo, cuerpo } = textoDelAviso(actual, nombreMascota)
      try {
        new Notification(titulo, {
          body: cuerpo,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'mascota-agua-recordatorio',
        })
        window.localStorage.setItem(CLAVE_ULTIMO_AVISO, String(Date.now()))
      } catch {
        /* si el navegador no deja, no pasa nada */
      }
    }

    revisar()
    const reloj = window.setInterval(revisar, 60_000)
    return () => window.clearInterval(reloj)
  }, [perfil, nombreMascota])
}
