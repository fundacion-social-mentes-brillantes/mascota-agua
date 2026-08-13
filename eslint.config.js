import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist', 'dev-dist', 'api']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      // Version "flat": la otra sigue el formato viejo y ESLint 10 la rechaza.
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    // El 3D funciona al reves que React: dentro del bucle de animacion uno
    // MUEVE los objetos de la escena en vez de volver a pintar todo sesenta
    // veces por segundo. Eso es lo correcto en Three.js y es justo lo que
    // estas reglas prohiben. Se apagan solo aqui, no en el resto de la app.
    files: ['src/componentes/Mascota3D.tsx', 'src/componentes/criaturas.ts'],
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
