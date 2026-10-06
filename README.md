# 🎭 Impostor - Juego Multijugador

Una aplicación web multijugador en tiempo real para jugar al juego del Impostor con amigos. Los jugadores se unen a salas mediante enlaces compartibles, reciben palabras secretas (o son designados como impostores), y luego discuten por turnos para descubrir quién es el impostor.

## 🎮 Características

- ✅ **Multijugador en tiempo real** con Socket.io
- ✅ **Salas compartibles** mediante códigos o enlaces de WhatsApp
- ✅ **Mecánica de deslizar** para revelar la palabra (asegura privacidad)
- ✅ **Chat por turnos** con orden aleatorio
- ✅ **Sistema de amigos** dentro de las salas
- ✅ **Configuración flexible** (número de impostores, pistas opcionales)
- ✅ **Diseño moderno y responsive** con animaciones suaves
- ✅ **Diccionario variado** con 68+ palabras de diferentes categorías

## 📋 Requisitos

- Node.js v14 o superior
- NPM (incluido con Node.js)
- Navegador web moderno (Chrome, Firefox, Safari, Edge)

## 🚀 Instalación

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

## ▶️ Iniciar el Servidor

```bash
npm start
```

El servidor se iniciará en el puerto 3000. Verás un mensaje como este:

```
===========================================
🎮 SERVIDOR DEL JUEGO DEL IMPOSTOR 🎮
===========================================

✅ Servidor iniciado en el puerto 3000

📱 Accede desde este dispositivo:
   http://localhost:3000

📱 Accede desde otros dispositivos en la misma red:
   http://<TU_IP_LOCAL>:3000

💡 Tip: Para encontrar tu IP local:
   Windows: ipconfig
   Mac/Linux: ifconfig o ip addr

===========================================
```

## 🎯 Cómo Jugar

### 1. Crear o Unirse a una Sala

- **Opción A - Crear sala:**
  1. Ingresa tu nombre
  2. Haz clic en "Crear Sala"
  3. Comparte el código o enlace con tus amigos

- **Opción B - Unirse a sala:**
  1. Ingresa tu nombre
  2. Haz clic en "Unirse a Sala"
  3. Introduce el código de 6 caracteres

### 2. Configurar la Partida (Solo Host)

- **Número de impostores:** 1-3 impostores
- **Pista para impostor:** Activar/desactivar
  - Si está activa, el impostor recibe una palabra de pista relacionada (difícil)
  - La pista NO revela la palabra exacta

### 3. Revelar la Palabra

- Cuando el juego comience, verás una pantalla con instrucciones
- **Desliza hacia arriba** para revelar tu palabra
- Asegúrate de que nadie más esté mirando
- **Impostores** verán "ERES EL IMPOSTOR" en lugar de una palabra
- Haz clic en "Estoy Listo" cuando hayas visto tu palabra

### 4. Discusión

- El chat funciona **por turnos**
- El orden es **aleatorio** y decidido por la app
- Cada jugador escribe su palabra o una frase relacionada
- Los impostores deben intentar pasar desapercibidos

### 5. Descubrir al Impostor

- Después de que todos hayan escrito, discutan quién es el impostor
- Comparen las palabras y busquen inconsistencias
- ¡Voten para eliminar al impostor!

## 🌐 Jugar desde Múltiples Dispositivos

### Red Local (Mismo WiFi)

1. Inicia el servidor en un dispositivo (computadora)
2. Encuentra tu IP local:
   - **Windows:** Abre CMD y escribe `ipconfig`
     - Busca "IPv4 Address" (ejemplo: 192.168.1.100)
   - **Mac/Linux:** Abre Terminal y escribe `ifconfig` o `ip addr`
     - Busca "inet" (ejemplo: 192.168.1.100)
3. En otros dispositivos, abre el navegador y ve a:
   ```
   http://TU_IP_LOCAL:3000
   ```
   (Ejemplo: `http://192.168.1.100:3000`)

### Compartir Enlace

- Usa el botón **"Compartir"** en la sala de espera
- Se copiará un enlace que incluye el código de sala
- Compártelo por WhatsApp, Telegram, etc.
- Tus amigos solo necesitan hacer clic en el enlace

## 🎨 Categorías de Palabras

El juego incluye palabras de las siguientes categorías:

- 🐾 **Animales:** Elefante, Pingüino, Cocodrilo, Mariposa, Delfín, etc.
- 📦 **Objetos:** Paraguas, Reloj, Espejo, Llave, Brújula, etc.
- 👷 **Profesiones:** Astronauta, Arqueólogo, Panadero, Fotógrafo, etc.
- 🗺️ **Lugares:** Volcán, Faro, Pirámide, Acuario, Catedral, etc.
- 🍕 **Alimentos:** Paella, Sushi, Croissant, Tacos, Espagueti, etc.
- 🏃 **Actividades:** Escalada, Origami, Meditación, Surf, Yoga, etc.
- 🧠 **Conceptos:** Gravedad, Sombra, Eco, Magnetismo, Evolución, etc.

## 🔧 Solución de Problemas

### El servidor no inicia
- Verifica que Node.js esté instalado: `node --version`
- Asegúrate de haber ejecutado `npm install`
- Verifica que el puerto 3000 no esté en uso

### No puedo conectarme desde otro dispositivo
- Verifica que ambos dispositivos estén en la misma red WiFi
- Desactiva el firewall temporalmente para probar
- Asegúrate de usar la IP local correcta (no 127.0.0.1)

### La mecánica de deslizar no funciona
- Asegúrate de estar usando un navegador moderno
- En móvil, desliza con el dedo
- En desktop, haz clic y arrastra hacia arriba

### El juego no inicia
- Se necesitan al menos **3 jugadores**
- El número de impostores debe ser menor al número de jugadores
- Solo el **host** puede iniciar el juego

## 📱 Compatibilidad

- ✅ Chrome (Desktop y Mobile)
- ✅ Firefox (Desktop y Mobile)
- ✅ Safari (Desktop y Mobile)
- ✅ Edge
- ✅ Opera

## 🎭 Reglas del Juego

1. **Para los jugadores normales:**
   - Recibes una palabra específica
   - Debes describir o mencionar la palabra en el chat
   - Intenta no dar demasiada información para descubrir al impostor

2. **Para el impostor:**
   - No sabes cuál es la palabra correcta
   - Opcionalmente recibes una pista de una palabra
   - Debes intentar pasar desapercibido
   - Escucha lo que dicen los demás e intenta imitar

3. **Objetivo:**
   - **Jugadores normales:** Descubrir quién es el impostor
   - **Impostor:** No ser descubierto y adivinar la palabra

## 📄 Licencia

Este proyecto es de código abierto y está disponible para uso personal y educativo.

---

¡Diviértete jugando! 🎉

---

## 💶 Multas (nueva app)

En la carpeta [`multas/`](multas/) vive una app independiente para gestionar las multas de equipos deportivos
(React + Tailwind + Supabase). Instrucciones en [`multas/README.md`](multas/README.md).
