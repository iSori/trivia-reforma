# Trivia de la Reforma

Juego de preguntas sobre la Reforma protestante: personajes, momentos históricos, doctrinas, la post-Reforma y la Reforma en España. Tiene 189 preguntas en dos dificultades, un modo individual que funciona sin conexión y un modo en grupo tipo Kahoot.

- **Modo individual:** funciona en cuanto subes los archivos a GitHub Pages. No necesita Firebase.
- **Modo en grupo:** necesita un proyecto de Firebase (gratuito) para sincronizar los móviles.

---

## 1. Publicar la web en GitHub Pages

1. Crea una cuenta en [github.com](https://github.com) si no tienes una.
2. Pulsa **New repository**. Ponle un nombre, por ejemplo `trivia-reforma`, márcalo como **Public** y créalo.
3. En el repositorio vacío, pulsa **uploading an existing file**. Arrastra **todo el contenido** de esta carpeta (no la carpeta en sí): `index.html`, `styles.css`, `manifest.webmanifest`, `sw.js`, `database.rules.json`, `.nojekyll` y las carpetas `js` e `icons`. Pulsa **Commit changes**.
   - El archivo `.nojekyll` está oculto en muchos sistemas. Si no lo ves, no pasa nada: el juego funciona sin él.
4. Ve a **Settings → Pages**. En **Source** elige **Deploy from a branch**, en **Branch** elige `main` y la carpeta `/ (root)`, y pulsa **Save**.
5. Espera uno o dos minutos. Tu juego estará en:
   `https://TU-USUARIO.github.io/trivia-reforma/`

Ya puedes jugar en modo individual.

## 2. Crear el proyecto de Firebase (para el modo en grupo)

1. Entra en [console.firebase.google.com](https://console.firebase.google.com) con una cuenta de Google y pulsa **Crear un proyecto**. Ponle un nombre, por ejemplo `trivia-reforma`. Puedes desactivar Google Analytics: el juego no lo usa.
2. **Activa el inicio de sesión anónimo.** En el menú, ve a **Compilación → Authentication → Comenzar → Sign-in method**, elige **Anónimo**, actívalo y guarda. Así los jugadores entran sin registrarse.
3. **Autoriza tu web.** En **Authentication → Configuración → Dominios autorizados**, pulsa **Agregar dominio** y escribe `TU-USUARIO.github.io` (sin `https://` ni el nombre del repositorio).
4. **Crea la base de datos.** Ve a **Compilación → Realtime Database → Crear base de datos**. Elige la ubicación **Bélgica (europe-west1)**, que es la más cercana a España, y empieza en **modo bloqueado**.
5. **Pega las reglas de seguridad.** En la base de datos, abre la pestaña **Reglas**, borra lo que haya, pega el contenido del archivo `database.rules.json` y pulsa **Publicar**.
6. **Registra la app web.** Ve a **Configuración del proyecto** (rueda dentada) → **General** → **Tus apps** → icono `</>`. Ponle un nombre, **no** marques Firebase Hosting y pulsa **Registrar app**. Verás un bloque `const firebaseConfig = { ... }`.

> Crea la base de datos (paso 4) **antes** de copiar la configuración (paso 6). Si no, faltará la línea `databaseURL`. Si ya la copiaste antes, vuelve a la misma pantalla y cópiala de nuevo.

## 3. Conectar el juego con Firebase

1. En GitHub, abre `js/firebase-config.js` y pulsa el lápiz para editarlo.
2. Rellena cada campo con los valores de tu `firebaseConfig`. Debe quedar parecido a esto:

   ```js
   export const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "trivia-reforma.firebaseapp.com",
     databaseURL: "https://trivia-reforma-default-rtdb.europe-west1.firebasedatabase.app",
     projectId: "trivia-reforma",
     storageBucket: "trivia-reforma.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

3. Pulsa **Commit changes**. En uno o dos minutos la web estará actualizada.

Estos datos no son secretos: son públicos en cualquier web que use Firebase. Lo que protege la base de datos son las reglas del paso 2.5.

## 4. Probar una partida en grupo

1. En un ordenador, abre la web, elige categoría y dificultad y pulsa **Crear partida**. Aparece un código de cuatro letras.
2. En un móvil, abre la misma dirección, pulsa **Unirme con código** y escribe el código y un nombre.
3. Cuando aparezca el jugador en la pantalla del anfitrión, pulsa **Empezar**.

Si alguien sale de la pantalla, bloquea el móvil o recarga la página, al volver a abrir la web entra solo en la partida, con su puntuación y su respuesta. Mientras está fuera, el anfitrión lo ve como «sin conexión» y no se le espera para revelar la respuesta. Si quien sale es el anfitrión, los jugadores ven un aviso y la partida sigue cuando vuelve. La partida solo se borra cuando el anfitrión pulsa **Cancelar** o **Terminar y volver al inicio**.

## 5. Instalarla en Android

Abre la web en Chrome, toca el menú **⋮** y elige **Instalar aplicación** (o **Añadir a pantalla de inicio**). Se abrirá a pantalla completa, como una app, y el modo individual funcionará sin conexión.

## 6. Hacer cambios más adelante

- **Preguntas:** están en `js/preguntas.js`. Cada pregunta es una línea con este formato:
  `["categoría", "dificultad", "año", "pregunta", "respuesta correcta", ["incorrecta 1", "incorrecta 2", "incorrecta 3"], "explicación"]`
  - Categorías: `per` (Personajes), `mom` (Momentos históricos), `doc` (Doctrinas), `post` (Post-Reforma), `esp` (España y la Reforma).
  - Dificultad: `n` (normal) o `d` (difícil).
- **Tiempo por pregunta en grupo:** cambia `DUR` al principio de `js/app.js` (en milisegundos; 20000 = 20 segundos).
- **Cada vez que publiques cambios**, abre `sw.js` y sube el número de `VERSION` (por ejemplo, de `v1` a `v2`). Así los móviles que tienen el juego instalado descargan la versión nueva.

## Límites y privacidad

- El plan gratuito de Firebase (Spark) admite un número limitado de conexiones simultáneas a la base de datos, unas 100 según sus condiciones actuales. Es suficiente para grupos normales; consulta la página de precios de Firebase si piensas usarlo con mucha gente a la vez.
- El juego solo guarda en Firebase el nombre que escribe cada jugador y sus respuestas mientras dura la partida. Todo se borra cuando el anfitrión la cierra. En el propio móvil se guarda la partida en curso durante un máximo de 12 horas, para poder volver a ella. No usa cookies ni estadísticas.
- Si un anfitrión abandona una partida sin cerrarla, queda guardada en Firebase. Se borra sola cuando ese anfitrión crea otra partida desde el mismo dispositivo. Si alguna vez quieres limpiar a mano, en **Realtime Database → Datos** puedes borrar la carpeta `games`; no afecta al juego.
- Las respuestas correctas están en el código de la página, así que alguien con conocimientos técnicos podría consultarlas. Para una partida entre amigos no es un problema.
