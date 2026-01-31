export type Difficulty = 'facile' | 'moyen' | 'difficile';

export interface WordPair {
  civil: string;
  imposter: string;
  difficulty: Difficulty;
  category: string;
}

const RAW_DATA = [
  // Nourriture
  { cat: "Nourriture", civil: "Pizza", imposter: "Tarte", diff: "facile" },
  { cat: "Nourriture", civil: "Sushi", imposter: "Maki", diff: "moyen" },
  { cat: "Nourriture", civil: "Croissant", imposter: "Pain au chocolat", diff: "facile" },
  { cat: "Nourriture", civil: "Burger", imposter: "Sandwich", diff: "facile" },
  { cat: "Nourriture", civil: "Salade", imposter: "Soupe", diff: "moyen" },
  { cat: "Nourriture", civil: "Chocolat", imposter: "Caramel", diff: "moyen" },
  { cat: "Nourriture", civil: "Fromage", imposter: "Beurre", diff: "moyen" },
  { cat: "Nourriture", civil: "Pates", imposter: "Riz", diff: "facile" },
  { cat: "Nourriture", civil: "Glace", imposter: "Sorbet", diff: "difficile" },
  { cat: "Nourriture", civil: "Pomme", imposter: "Poire", diff: "facile" },
  { cat: "Nourriture", civil: "Banane", imposter: "Plantain", diff: "difficile" },
  { cat: "Nourriture", civil: "Fraise", imposter: "Framboise", diff: "moyen" },
  { cat: "Nourriture", civil: "Orange", imposter: "Mandarine", diff: "moyen" },
  { cat: "Nourriture", civil: "Citron", imposter: "Lime", diff: "moyen" },
  { cat: "Nourriture", civil: "Tomate", imposter: "Poivron", diff: "moyen" },
  { cat: "Nourriture", civil: "Concombre", imposter: "Courgette", diff: "moyen" },
  { cat: "Nourriture", civil: "Oignon", imposter: "Ail", diff: "moyen" },
  { cat: "Nourriture", civil: "Pomme de terre", imposter: "Patate douce", diff: "moyen" },
  { cat: "Nourriture", civil: "Riz", imposter: "Quinoa", diff: "difficile" },
  { cat: "Nourriture", civil: "Pates", imposter: "Nouilles", diff: "facile" },
  { cat: "Nourriture", civil: "Cafe", imposter: "The", diff: "facile" },
  { cat: "Nourriture", civil: "Vin", imposter: "Champagne", diff: "moyen" },
  { cat: "Nourriture", civil: "Biere", imposter: "Cidre", diff: "moyen" },
  { cat: "Nourriture", civil: "Kebab", imposter: "Taco", diff: "moyen" },
  { cat: "Nourriture", civil: "Frites", imposter: "Chips", diff: "facile" },
  { cat: "Nourriture", civil: "Coca", imposter: "Pepsi", diff: "facile" },
  
  // Animaux
  { cat: "Animaux", civil: "Chien", imposter: "Loup", diff: "facile" },
  { cat: "Animaux", civil: "Chat", imposter: "Lynx", diff: "moyen" },
  { cat: "Animaux", civil: "Dauphin", imposter: "Requin", diff: "facile" },
  { cat: "Animaux", civil: "Aigle", imposter: "Faucon", diff: "difficile" },
  { cat: "Animaux", civil: "Lion", imposter: "Tigre", diff: "facile" },
  { cat: "Animaux", civil: "Ours", imposter: "Panda", diff: "moyen" },
  { cat: "Animaux", civil: "Serpent", imposter: "Lezard", diff: "moyen" },
  { cat: "Animaux", civil: "Cheval", imposter: "Ane", diff: "moyen" },
  { cat: "Animaux", civil: "Poule", imposter: "Canard", diff: "facile" },
  { cat: "Animaux", civil: "Mouche", imposter: "Moustique", diff: "moyen" },
  { cat: "Animaux", civil: "Abeille", imposter: "Guepe", diff: "moyen" },
  { cat: "Animaux", civil: "Papillon", imposter: "Mite", diff: "difficile" },
  { cat: "Animaux", civil: "Singe", imposter: "Gorille", diff: "moyen" },
  
  // Lieux
  { cat: "Lieux", civil: "Plage", imposter: "Piscine", diff: "moyen" },
  { cat: "Lieux", civil: "Montagne", imposter: "Colline", diff: "facile" },
  { cat: "Lieux", civil: "Ecole", imposter: "Universite", diff: "facile" },
  { cat: "Lieux", civil: "Restaurant", imposter: "Cafe", diff: "facile" },
  { cat: "Lieux", civil: "Cinema", imposter: "Theatre", diff: "facile" },
  { cat: "Lieux", civil: "Maison", imposter: "Appartement", diff: "facile" },
  { cat: "Lieux", civil: "Hotel", imposter: "Motel", diff: "moyen" },
  { cat: "Lieux", civil: "Forets", imposter: "Jungle", diff: "moyen" },
  { cat: "Lieux", civil: "Desert", imposter: "Savane", diff: "moyen" },
  
  // Objets
  { cat: "Objets", civil: "Telephone", imposter: "Tablette", diff: "facile" },
  { cat: "Objets", civil: "Chaise", imposter: "Fauteuil", diff: "facile" },
  { cat: "Objets", civil: "Table", imposter: "Bureau", diff: "facile" },
  { cat: "Objets", civil: "Stylo", imposter: "Crayon", diff: "facile" },
  { cat: "Objets", civil: "Fourchette", imposter: "Cuillere", diff: "facile" },
  { cat: "Objets", civil: "Verre", imposter: "Tasse", diff: "facile" },
  { cat: "Objets", civil: "Lampe", imposter: "Bougie", diff: "moyen" },
  { cat: "Objets", civil: "Miroir", imposter: "Vitre", diff: "difficile" },
  
  // Metiers
  { cat: "Metiers", civil: "Medecin", imposter: "Infirmier", diff: "moyen" },
  { cat: "Metiers", civil: "Policier", imposter: "Gendarme", diff: "moyen" },
  { cat: "Metiers", civil: "Pompier", imposter: "Ambulancier", diff: "moyen" },
  { cat: "Metiers", civil: "Boulanger", imposter: "Patissier", diff: "moyen" },
  { cat: "Metiers", civil: "Coiffeur", imposter: "Barbier", diff: "moyen" },
  { cat: "Metiers", civil: "Acteur", imposter: "Comedien", diff: "facile" },
  { cat: "Metiers", civil: "Chanteur", imposter: "Musicien", diff: "facile" },
  
  // Sports
  { cat: "Sports", civil: "Football", imposter: "Rugby", diff: "facile" },
  { cat: "Sports", civil: "Tennis", imposter: "Badminton", diff: "moyen" },
  { cat: "Sports", civil: "Basket", imposter: "Handball", diff: "moyen" },
  { cat: "Sports", civil: "Ski", imposter: "Snowboard", diff: "facile" },
  { cat: "Sports", civil: "Course", imposter: "Marche", diff: "moyen" },
  { cat: "Sports", civil: "Natation", imposter: "Plongee", diff: "moyen" },
  
  // Technologie
  { cat: "Technologie", civil: "Ordinateur", imposter: "Tablette", diff: "facile" },
  { cat: "Technologie", civil: "Wifi", imposter: "Bluetooth", diff: "moyen" },
  { cat: "Technologie", civil: "Email", imposter: "SMS", diff: "moyen" },
  { cat: "Technologie", civil: "Facebook", imposter: "Instagram", diff: "facile" },
  { cat: "Technologie", civil: "Windows", imposter: "Mac", diff: "facile" },
  { cat: "Technologie", civil: "iPhone", imposter: "Android", diff: "facile" },

  // Corps Humain
  { cat: "Corps Humain", civil: "Main", imposter: "Pied", diff: "facile" },
  { cat: "Corps Humain", civil: "Oeil", imposter: "Oreille", diff: "moyen" },
  { cat: "Corps Humain", civil: "Bouche", imposter: "Nez", diff: "moyen" },
  { cat: "Corps Humain", civil: "Bras", imposter: "Jambe", diff: "facile" },
  { cat: "Corps Humain", civil: "Cheveux", imposter: "Poils", diff: "moyen" },
  
  // Cinema
  { cat: "Cinema", civil: "Film", imposter: "Serie", diff: "facile" },
  { cat: "Cinema", civil: "Acteur", imposter: "Figurant", diff: "difficile" },
  { cat: "Cinema", civil: "Comedie", imposter: "Drame", diff: "moyen" },
  { cat: "Cinema", civil: "Horreur", imposter: "Thriller", diff: "moyen" },
  
  // Couleurs
  { cat: "Couleurs", civil: "Rouge", imposter: "Orange", diff: "facile" },
  { cat: "Couleurs", civil: "Bleu", imposter: "Vert", diff: "facile" },
  { cat: "Couleurs", civil: "Noir", imposter: "Gris", diff: "facile" },
  { cat: "Couleurs", civil: "Jaune", imposter: "Or", diff: "moyen" },
  
  // Sentiments
  { cat: "Sentiments", civil: "Joie", imposter: "Bonheur", diff: "facile" },
  { cat: "Sentiments", civil: "Peur", imposter: "Angoisse", diff: "moyen" },
  { cat: "Sentiments", civil: "Colere", imposter: "Haine", diff: "moyen" },
  { cat: "Sentiments", civil: "Amour", imposter: "Amitie", diff: "moyen" },
  
  // Temps
  { cat: "Temps", civil: "Jour", imposter: "Nuit", diff: "facile" },
  { cat: "Temps", civil: "Matin", imposter: "Soir", diff: "facile" },
  { cat: "Temps", civil: "Hier", imposter: "Demain", diff: "facile" },
  { cat: "Temps", civil: "Minute", imposter: "Seconde", diff: "moyen" },
];

export const WORD_DATABASE: WordPair[] = RAW_DATA.map(d => ({
  civil: d.civil,
  imposter: d.imposter,
  difficulty: d.diff as Difficulty,
  category: d.cat
}));

export const CATEGORIES = Array.from(new Set(WORD_DATABASE.map(w => w.category)));

export function getRandomWordPair(excludeWords: string[] = []): WordPair {
  // Filter out recently used words if possible
  let available = WORD_DATABASE.filter(w => !excludeWords.includes(w.civil) && !excludeWords.includes(w.imposter));
  
  if (available.length === 0) {
    available = WORD_DATABASE;
  }
  
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}
