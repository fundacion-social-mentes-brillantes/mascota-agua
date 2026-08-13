// Lo que hace el telefono cuando llega un aviso de la mascota.
//
// Este archivo se mete DENTRO del service worker que genera vite-plugin-pwa
// (ver importScripts en vite.config.ts). Corre aunque la app este cerrada:
// por eso el aviso puede llegar a las tres de la tarde sin que nadie haya
// abierto nada.

/* global self, clients */

self.addEventListener('push', (evento) => {
  let datos = {}
  try {
    datos = evento.data ? evento.data.json() : {}
  } catch {
    datos = { cuerpo: evento.data ? evento.data.text() : '' }
  }

  const titulo = datos.titulo || 'Tu mascota'
  const opciones = {
    body: datos.cuerpo || 'Tengo sed.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // Un solo aviso a la vez: el nuevo reemplaza al viejo en vez de
    // amontonarse cinco notificaciones iguales.
    tag: 'mascota-agua',
    renotify: true,
    // Vibracion corta, como un toquecito. No es una alarma de incendio.
    vibrate: [90, 60, 90],
    data: { url: datos.url || '/' },
    actions: [{ action: 'tome', title: 'Ya tomé agua' }],
  }

  evento.waitUntil(self.registration.showNotification(titulo, opciones))
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  // Si tocó "Ya tomé agua", la app abre directo en el registro.
  const destino = evento.action === 'tome' ? '/?registrar=1' : evento.notification.data?.url || '/'

  evento.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      // Si la app ya está abierta, se trae al frente en vez de abrir otra.
      for (const ventana of ventanas) {
        if ('focus' in ventana) {
          ventana.navigate?.(destino)
          return ventana.focus()
        }
      }
      return clients.openWindow(destino)
    }),
  )
})
