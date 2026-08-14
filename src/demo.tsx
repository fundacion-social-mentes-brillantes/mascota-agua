// Banco de capturas para la propaganda.
//
// Monta las pantallas REALES de la app (los mismos componentes que usa la
// gente) con datos de ejemplo, para poder sacarles pantallazos sin que salga
// la informacion de nadie. No entra al paquete que se publica: Vite solo
// compila index.html.
//
// Se usa con ?pantalla=casa|cuerpo|registrar|icono
//
/* eslint-disable react-refresh/only-export-components -- es un punto de
   entrada, no un modulo de la app. */
import { createRoot } from 'react-dom/client'
import './index.css'
import Casa from './pantallas/Casa'
import MascotaViva from './componentes/MascotaViva'
import Cuerpo from './pantallas/Cuerpo'
import RegistrarAgua from './componentes/RegistrarAgua'
import { calcularEstadoCuerpo } from './lib/hidratacion'
import { describirCuerpo } from './lib/frases'
import { loDeSiempre } from './lib/sugerencias'
import type { Mascota, Perfil, Registro } from './lib/tipos'

const HOY = new Date()
const aLas = (h: number, m = 0) =>
  new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate(), h, m).getTime()

const perfil: Perfil = {
  nombre: 'María',
  edad: 34,
  sexo: 'mujer',
  pesoKg: 62,
  alturaCm: 160,
  actividad: 'moderada',
  clima: 'calor',
  altitudAlta: false,
  etapa: 'ninguna',
  condiciones: [],
  requiereMedico: false,
  horaDespertar: '06:00',
  horaDormir: '22:30',
  recordatoriosActivos: true,
  metaMl: 2250,
  creado: 0,
  actualizado: 0,
}

const mascota: Mascota = {
  nombre: 'Aguita',
  especie: 'gota',
  color: '#35b6f0',
  sombrero: null,
  accesorio: null,
  gotas: 145,
  xp: 40,
  nivel: 3,
  ultimaComida: 0,
  comprados: [],
}

const trago = (ml: number, bebida: string, hora: number, i: number): Registro => ({
  id: `d${i}`,
  ml,
  mlBruto: ml,
  bebida,
  hora,
  dia: 'demo',
  recipiente: 'vaso',
  verificacion: 'sin-foto',
  tieneFotoLocal: false,
})

// Un dia a medias: ya tomo algo, pero le falta. Es el estado que mas dice.
const registros: Registro[] = [
  trago(250, 'agua', aLas(7, 10), 1),
  trago(180, 'tinto', aLas(8, 30), 2),
  trago(250, 'agua', aLas(11, 0), 3),
  trago(315, 'gaseosa', aLas(13, 20), 4),
  trago(250, 'agua', aLas(15, 40), 5),
]

const base = calcularEstadoCuerpo(perfil, registros)
const estado = { ...base, loQuePasa: describirCuerpo(base) }

// Historial para los botones de "lo de siempre".
const historial: Registro[] = []
for (let d = 1; d <= 6; d++) {
  historial.push(trago(250, 'agua', aLas(9) - d * 86_400_000, 100 + d))
  historial.push(trago(180, 'tinto', aLas(7) - d * 86_400_000, 200 + d))
  historial.push(trago(500, 'agua', aLas(15) - d * 86_400_000, 300 + d))
}
const sugerencias = loDeSiempre(historial, aLas(10))

const pantalla = new URLSearchParams(location.search).get('pantalla') ?? 'casa'

function Demo() {
  // La mascota sola y contenta: es la cara de la app, la que va en el icono
  // que la gente ve en su celular. Se dibuja con el MISMO componente que usa
  // la app, no con un dibujo aparte que despues quede desactualizado.
  if (pantalla === 'icono') {
    return (
      <div
        style={{
          width: 1024,
          height: 1024,
          display: 'grid',
          placeItems: 'center',
          background: 'radial-gradient(circle at 50% 38%, #12395c 0%, #061426 62%, #04101d 100%)',
        }}
      >
        <MascotaViva
          especie="gota"
          color="#35b6f0"
          nivel="pleno"
          hidratacion={88}
          momento="meta-cumplida"
          sombrero={null}
          accesorio={null}
          tamano={880}
        />
      </div>
    )
  }
  if (pantalla === 'cuerpo') {
    return (
      <div className="min-h-full bg-[var(--color-fondo)]">
        <Cuerpo perfil={perfil} estado={estado} />
      </div>
    )
  }
  if (pantalla === 'registrar') {
    return (
      <div className="min-h-full bg-[var(--color-fondo)]">
        <RegistrarAgua
          uid="demo"
          perfil={perfil}
          mascota={mascota}
          registros={registros}
          alCerrar={() => {}}
        />
      </div>
    )
  }
  return (
    <div className="min-h-full bg-[var(--color-fondo)]">
      <Casa
        perfil={perfil}
        mascota={mascota}
        estado={estado}
        registros={registros}
        ayer={null}
        racha={4}
        uid="demo"
        sugerencias={sugerencias}
        alRegistrar={() => {}}
      />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Demo />)
