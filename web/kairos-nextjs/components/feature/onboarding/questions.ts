export const PHQ9: string[] = [
  "Poco interés o placer en hacer las cosas",
  "Sentirte decaído/a, deprimido/a o sin esperanza",
  "Problemas para dormir o dormir demasiado",
  "Sentirte cansado/a o con poca energía",
  "Falta de apetito o comer en exceso",
  "Sentirte mal contigo mismo/a o que eres un fracaso",
  "Dificultad para concentrarte en cosas como leer o ver TV",
  "Moverte o hablar tan lento que otros lo notan, o lo opuesto: estar inquieto/a",
  "Pensar que estarías mejor muerto/a o lastimarte de alguna manera",
];

export const GAD7: string[] = [
  "Sentirte nervioso/a, ansioso/a o muy tenso/a",
  "No poder parar o controlar tu preocupación",
  "Preocuparte demasiado por diferentes cosas",
  "Tener dificultad para relajarte",
  "Estar tan inquieto/a que es difícil quedarte sentado/a",
  "Irritarte o enojarte con facilidad",
  "Sentir miedo, como si algo terrible fuera a pasar",
];

export interface SurveyOption {
  value: number;
  label: string;
}

export const SURVEY_OPTIONS: SurveyOption[] = [
  { value: 0, label: "Para nada" },
  { value: 1, label: "Varios días" },
  { value: 2, label: "Más de la mitad de los días" },
  { value: 3, label: "Casi todos los días" },
];

/**
 * Pregunta de opción única no clínica (hábitos digitales / tiempo en pantalla).
 *
 * - `id`: clave que se envía al backend dentro del `responses` JSON.
 * - `text`: enunciado mostrado al usuario.
 * - `options`: lista de strings que el usuario puede elegir.
 */
export interface ChoiceQuestion {
  id: string;
  text: string;
  options: string[];
}

/**
 * Bloque "Hábitos digitales" — 5 preguntas de check-in inicial sobre sueño,
 * energía, concentración y rutina. NO es un test clínico; sirve para que los
 * agentes tengan contexto antes de ofrecer recomendaciones.
 */
export const HABITS_QUESTIONS: ChoiceQuestion[] = [
  {
    id: "bedtime",
    text: "¿A qué hora sueles acostarte entre semana?",
    options: [
      "Antes de las 10pm",
      "Entre 10pm y 12am",
      "Después de las 12am",
      "Varía mucho",
    ],
  },
  {
    id: "sleep_hours",
    text: "¿Cuántas horas duermes normalmente?",
    options: [
      "Menos de 5 horas",
      "Entre 5 y 6 horas",
      "Entre 6 y 8 horas",
      "Más de 8 horas",
    ],
  },
  {
    id: "energy",
    text: "¿Cómo describirías tu energía durante el día generalmente?",
    options: [
      "Alta — me siento activo la mayor parte del día",
      "Media — tengo momentos buenos y bajos",
      "Baja — me siento cansado con frecuencia",
      "Muy variable — depende mucho del día",
    ],
  },
  {
    id: "focus",
    text: "¿Con qué frecuencia sientes que no puedes concentrarte en lo que estás haciendo?",
    options: ["Casi nunca", "A veces", "Frecuentemente", "Casi siempre"],
  },
  {
    id: "meals",
    text: "¿Comes regularmente durante el día (desayuno, almuerzo, comida)?",
    options: [
      "Sí, con horarios bastante fijos",
      "Más o menos, me salto alguna comida",
      "No, como cuando puedo o cuando recuerdo",
    ],
  },
];

/**
 * Bloque "Tiempo en pantalla" — preguntas alternativas a subir una captura
 * del screen-time del sistema. Una de las preguntas (`top_apps`) usa input
 * libre, las otras opciones; ver `SCREEN_FREE_TEXT_IDS` abajo.
 */
export const SCREEN_QUESTIONS: ChoiceQuestion[] = [
  {
    id: "daily_hours",
    text: "¿Cuántas horas al día usas el teléfono aproximadamente?",
    options: [
      "Menos de 2 horas",
      "Entre 2 y 4 horas",
      "Entre 4 y 6 horas",
      "Más de 6 horas",
    ],
  },
  {
    id: "top_apps",
    text: "¿Cuáles son las 3 apps donde más tiempo pasas?",
    // Texto libre — `SCREEN_FREE_TEXT_IDS` marca este campo.
    options: [],
  },
  {
    id: "phone_in_bed",
    text: "¿Usas el teléfono en la cama antes de dormir?",
    options: ["Nunca", "A veces", "Casi siempre", "Siempre"],
  },
  {
    id: "phone_pickups",
    text: "¿Cuántas veces revisas el teléfono sin ninguna razón concreta durante el día?",
    options: ["Pocas veces", "Bastantes veces", "Constantemente"],
  },
  {
    id: "social_mood",
    text: "¿Cómo te sientes después de pasar mucho tiempo en redes sociales?",
    options: [
      "Igual que antes",
      "Más ansioso o inquieto",
      "Más triste o con el ánimo bajo",
      "Me comparo más con los demás",
      "Generalmente bien",
    ],
  },
];

export const SCREEN_FREE_TEXT_IDS: ReadonlySet<string> = new Set(["top_apps"]);

/**
 * Identificador único de cada bloque del onboarding. El orden de este array
 * define el orden en que se presentan los bloques al usuario, y coincide con
 * el `type` esperado por `POST /api/v1/surveys/{type}`.
 */
export type BlockKey = "phq9" | "gad7" | "habits" | "screen";

export interface BlockMeta {
  key: BlockKey;
  title: string;
  subtitle: string;
  questionsCount: number;
  estimatedMinutes: string;
  description: string;
}

/**
 * Metadatos de cada uno de los 4 bloques del onboarding. Sirven para
 * renderizar el "mapa de tests" (cuadrículas iniciales) y las pantallas de
 * transición entre bloques. NO contiene las preguntas en sí: esas viven en
 * sus constantes específicas (PHQ9, GAD7, HABITS_QUESTIONS, SCREEN_QUESTIONS).
 */
export const ONBOARDING_BLOCKS: BlockMeta[] = [
  {
    key: "phq9",
    title: "PHQ-9",
    subtitle: "Indicadores de ánimo",
    questionsCount: PHQ9.length,
    estimatedMinutes: "~2 min",
    description:
      "Para que los agentes entiendan tu estado emocional actual.",
  },
  {
    key: "gad7",
    title: "GAD-7",
    subtitle: "Indicadores de ansiedad",
    questionsCount: GAD7.length,
    estimatedMinutes: "~2 min",
    description:
      "Para que los agentes detecten señales de estrés y ansiedad.",
  },
  {
    key: "habits",
    title: "Hábitos digitales",
    subtitle: "Check-in inicial",
    questionsCount: HABITS_QUESTIONS.length,
    estimatedMinutes: "~1 min",
    description:
      "Para entender tus patrones de sueño, energía y rutinas.",
  },
  {
    key: "screen",
    title: "Tiempo en pantalla",
    subtitle: "Baseline de uso",
    questionsCount: SCREEN_QUESTIONS.length,
    estimatedMinutes: "Captura o 5 preguntas",
    description:
      "Para que los agentes tengan datos de tu uso digital actual.",
  },
];
