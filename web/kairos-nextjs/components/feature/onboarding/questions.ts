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
