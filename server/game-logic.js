// game-logic.js - Lógica del juego del Impostor

// Diccionario de palabras con categorías variadas
const WORD_DICTIONARY = [
  // Animales
  { word: "Elefante", hint: "trompa" },
  { word: "Pingüino", hint: "hielo" },
  { word: "Cocodrilo", hint: "reptil" },
  { word: "Mariposa", hint: "metamorfosis" },
  { word: "Delfín", hint: "cetáceo" },
  { word: "Murciélago", hint: "ecolocalización" },
  { word: "Camaleón", hint: "camuflaje" },
  { word: "Pulpo", hint: "tentáculos" },
  
  // Objetos
  { word: "Paraguas", hint: "lluvia" },
  { word: "Reloj", hint: "tiempo" },
  { word: "Espejo", hint: "reflejo" },
  { word: "Llave", hint: "cerradura" },
  { word: "Brújula", hint: "norte" },
  { word: "Ancla", hint: "barco" },
  { word: "Telescopio", hint: "estrellas" },
  { word: "Imán", hint: "atracción" },
  
  // Profesiones
  { word: "Astronauta", hint: "espacio" },
  { word: "Arqueólogo", hint: "ruinas" },
  { word: "Panadero", hint: "horno" },
  { word: "Bibliotecario", hint: "silencio" },
  { word: "Fotógrafo", hint: "lente" },
  { word: "Buzo", hint: "oxígeno" },
  { word: "Malabarista", hint: "equilibrio" },
  { word: "Veterinario", hint: "animales" },
  
  // Lugares
  { word: "Volcán", hint: "magma" },
  { word: "Faro", hint: "costa" },
  { word: "Pirámide", hint: "Egipto" },
  { word: "Acuario", hint: "peces" },
  { word: "Catedral", hint: "gótico" },
  { word: "Observatorio", hint: "astronomía" },
  { word: "Monasterio", hint: "monjes" },
  { word: "Oasis", hint: "desierto" },
  
  // Alimentos
  { word: "Paella", hint: "arroz" },
  { word: "Sushi", hint: "Japón" },
  { word: "Croissant", hint: "Francia" },
  { word: "Tacos", hint: "México" },
  { word: "Espagueti", hint: "Italia" },
  { word: "Hummus", hint: "garbanzo" },
  { word: "Crepe", hint: "delgado" },
  { word: "Fondue", hint: "queso" },
  
  // Actividades
  { word: "Escalada", hint: "montaña" },
  { word: "Origami", hint: "papel" },
  { word: "Meditación", hint: "calma" },
  { word: "Jardinería", hint: "plantas" },
  { word: "Cerámica", hint: "arcilla" },
  { word: "Surf", hint: "olas" },
  { word: "Yoga", hint: "postura" },
  { word: "Esgrima", hint: "espada" },
  
  // Conceptos
  { word: "Gravedad", hint: "caída" },
  { word: "Sombra", hint: "luz" },
  { word: "Eco", hint: "sonido" },
  { word: "Magnetismo", hint: "polo" },
  { word: "Evolución", hint: "adaptación" },
  { word: "Arcoíris", hint: "espectro" },
  { word: "Eclipse", hint: "luna" },
  { word: "Aurora", hint: "boreal" },
  
  // Más variedad
  { word: "Glaciar", hint: "frío" },
  { word: "Cascada", hint: "caída" },
  { word: "Geiser", hint: "vapor" },
  { word: "Laberinto", hint: "camino" },
  { word: "Péndulo", hint: "oscilación" },
  { word: "Prisma", hint: "refracción" },
  { word: "Tornado", hint: "remolino" },
  { word: "Constelación", hint: "estrella" }
];

/**
 * Selecciona una palabra aleatoria del diccionario
 */
function getRandomWord() {
  return WORD_DICTIONARY[Math.floor(Math.random() * WORD_DICTIONARY.length)];
}

/**
 * Selecciona impostores aleatorios
 * @param {Array} players - Array de jugadores
 * @param {number} impostorCount - Número de impostores
 * @returns {Array} - Array de IDs de impostores
 */
function selectImpostors(players, impostorCount) {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, impostorCount).map(p => p.id);
}

/**
 * Genera orden aleatorio de turnos
 * @param {Array} players - Array de jugadores
 * @returns {Array} - Array de jugadores en orden aleatorio
 */
function generateTurnOrder(players) {
  return [...players].sort(() => Math.random() - 0.5);
}

/**
 * Asigna palabras a jugadores
 * @param {Array} players - Array de jugadores
 * @param {Array} impostorIds - IDs de los impostores
 * @param {boolean} includeHint - Si se debe incluir pista para impostores
 * @returns {Object} - Objeto con asignaciones
 */
function assignWords(players, impostorIds, includeHint) {
  const wordData = getRandomWord();
  const assignments = {};
  
  players.forEach(player => {
    if (impostorIds.includes(player.id)) {
      assignments[player.id] = {
        isImpostor: true,
        word: null,
        hint: includeHint ? wordData.hint : null
      };
    } else {
      assignments[player.id] = {
        isImpostor: false,
        word: wordData.word,
        hint: null
      };
    }
  });
  
  return {
    assignments,
    correctWord: wordData.word
  };
}

/**
 * Inicializa una nueva partida
 * @param {Array} players - Array de jugadores
 * @param {Object} config - Configuración { impostorCount, includeHint }
 * @returns {Object} - Estado del juego
 */
function initializeGame(players, config) {
  const impostorIds = selectImpostors(players, config.impostorCount);
  const turnOrder = generateTurnOrder(players);
  const { assignments, correctWord } = assignWords(players, impostorIds, config.includeHint);
  
  return {
    impostorIds,
    turnOrder,
    assignments,
    correctWord,
    currentTurnIndex: 0,
    chatMessages: []
  };
}

module.exports = {
  getRandomWord,
  selectImpostors,
  generateTurnOrder,
  assignWords,
  initializeGame,
  WORD_DICTIONARY
};
