/**
 * Culture Inference from Last Names
 * Only returns a culture when 70%+ confident
 * Returns null when uncertain
 */

const SURNAME_PATTERNS: Record<string, string[]> = {
  'portuguese': [
    'silva', 'santos', 'oliveira', 'souza', 'rodrigues', 'ferreira', 'alves',
    'pereira', 'lima', 'gomes', 'costa', 'ribeiro', 'martins', 'carvalho',
    'almeida', 'lopes', 'soares', 'fernandes', 'vieira', 'barbosa', 'rocha',
    'dias', 'nascimento', 'andrade', 'moreira', 'nunes', 'marques', 'machado',
    'mendes', 'freitas', 'cardoso', 'ramos', 'goncalves', 'santana', 'teixeira',
    'pinto', 'correia', 'fonseca', 'cabral', 'couto', 'da costa', 'da silva',
    'de souza', 'ferrao', 'camara', 'camalo',
  ],
  'italian': [
    'rossi', 'russo', 'ferrari', 'esposito', 'bianchi', 'romano', 'colombo',
    'ricci', 'marino', 'greco', 'bruno', 'gallo', 'conti', 'de luca',
    'giordano', 'mancini', 'rizzo', 'lombardi', 'moretti', 'barbieri', 'fontana',
    'santoro', 'mariani', 'rinaldi', 'caruso', 'ferrara', 'galli', 'martini',
    'leone', 'longo', 'gentile', 'martinelli', 'vitale', 'lombardo', 'serra',
    'coppola', 'de santis', 'damico', 'orlando', 'pellegrini', 'cinello',
    'azzarelli', 'augruso',
  ],
  'greek': [
    'papadopoulos', 'papadakis', 'papandreou', 'antonopoulos', 'georgiou',
    'nikolaou', 'christodoulou', 'konstantinou', 'dimitriou', 'ioannou',
    'petrou', 'vassiliou', 'alexiou', 'stavrou', 'michaelidis', 'andreou',
    'loizou', 'charalambous', 'kyriakou', 'panayiotou', 'economou', 'kazantzis',
    'dritsas', 'papadimitriou', 'theodorou', 'christoforou', 'hadjis',
  ],
  'vietnamese': [
    'nguyen', 'tran', 'le', 'pham', 'hoang', 'huynh', 'phan', 'vu', 'vo',
    'dang', 'bui', 'do', 'ho', 'ngo', 'duong', 'ly', 'truong', 'dinh',
  ],
  'chinese': [
    'wang', 'li', 'zhang', 'liu', 'chen', 'yang', 'huang', 'zhao', 'wu',
    'zhou', 'xu', 'sun', 'ma', 'zhu', 'hu', 'guo', 'he', 'lin', 'luo',
    'gao', 'zheng', 'liang', 'xie', 'tang', 'feng', 'dai', 'han',
    'cao', 'deng', 'xiao', 'cheng', 'wei', 'su', 'lu', 'jiang', 'cai',
    'jia', 'ding', 'yu', 'shen', 'ren', 'yao', 'zhong', 'tan',
    'fan', 'jin', 'tao', 'wan', 'qi', 'ang', 'bo',
  ],
  'filipino': [
    'santos', 'reyes', 'cruz', 'bautista', 'ocampo', 'garcia', 'mendoza',
    'torres', 'tomas', 'andrada', 'aquino', 'gonzales',
    'dela cruz', 'delos santos', 'delos reyes', 'icban', 'manalo', 'pangilinan',
  ],
  'south asian': [
    'patel', 'singh', 'sharma', 'kumar', 'gupta', 'shah', 'mehta', 'joshi',
    'verma', 'rao', 'reddy', 'nair', 'menon', 'pillai', 'iyer', 'iyengar',
    'ramlal', 'seedheeyan', 'ramkissoon', 'doobay', 'doodnath', 'doorgakant',
    'khan', 'ali', 'hussain', 'ahmed', 'chowdhury', 'rahman', 'begum',
    'das', 'roy', 'sen', 'dutta', 'bose', 'mukherjee', 'banerjee', 'chatterjee',
    'pereira', 'fernandes', 'dsouza', 'gomes', 'rodrigues',
    'kaur', 'desai', 'jain', 'krishnan', 'arul', 'rajan', 'subramaniam',
    'venkatesh', 'srinivasan', 'ramesh',
  ],
  'irish': [
    'murphy', 'kelly', 'sullivan', 'walsh', 'obrien', 'byrne',
    'ryan', 'oconnor', 'oreilly', 'doyle', 'mccarthy', 'gallagher', 'doherty',
    'kennedy', 'lynch', 'quinn', 'mclaughlin', 'carroll',
    'connolly', 'daly', 'connell', 'dunne', 'brennan', 'burke',
    'collins', 'farrell', 'fitzgerald', 'maguire', 'mcdonald', 'bannon',
  ],
  'ukrainian': [
    'shevchenko', 'bondarenko', 'kovalenko', 'tkachenko', 'kravchenko',
    'oleksenko', 'marchenko', 'melnyk', 'shevchuk', 'polishchuk', 'kovalchuk',
    'savchenko', 'rudenko', 'lysenko', 'moroz', 'pavlenko', 'petrenko',
    'chudyk', 'kozak', 'boyko', 'koval', 'ponomarenko', 'fedorenko',
  ],
  'croatian': [
    'horvat', 'babic', 'maric', 'juric', 'novak', 'kovac', 'knezevic',
    'markovic', 'petrovic', 'jovanovic', 'nikolic', 'pavlovic', 'tomic',
    'popovic', 'stefanovic', 'ivanovic', 'lukic', 'simic', 'duic',
  ],
  'spanish': [
    'garcia', 'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez',
    'perez', 'sanchez', 'ramirez', 'flores', 'rivera', 'gomez',
    'diaz', 'morales', 'jimenez', 'ruiz', 'alvarez', 'romero', 'gutierrez',
    'ortiz', 'castillo', 'vargas', 'chavez', 'aviles',
  ],
  'french canadian': [
    'tremblay', 'gagnon', 'cote', 'bouchard', 'gauthier', 'morin',
    'lavoie', 'fortin', 'gagne', 'ouellet', 'pelletier', 'belanger', 'levesque',
    'bergeron', 'leblanc', 'paquette', 'girard', 'simard', 'boucher', 'caron',
    'beaulieu', 'cloutier', 'dube', 'poirier', 'fillion', 'marcotte',
  ],
  'scottish': [
    'macdonald', 'mackenzie', 'macleod', 'mclean', 'fraser', 'duncan', 'ferguson',
    'dingwall', 'grant', 'ross', 'stewart', 'thomson', 'robertson', 'paterson',
    'morrison', 'hamilton', 'graham', 'kerr', 'scott',
  ],
  'middle eastern': [
    'mohamed', 'mohammed', 'ahmad', 'ahmed', 'hassan', 'hussein',
    'ibrahim', 'khalil', 'said', 'omar', 'abdel', 'abdallah',
    'mansour', 'youssef', 'nasser', 'saleh', 'farah', 'haddad', 'khoury',
    'eskander', 'elchaer',
  ],
};

export function inferCultureFromLastName(lastName: string | null): string | null {
  if (!lastName) return null;

  const normalized = lastName.toLowerCase().trim().replace(/[^a-z\s]/g, '');

  for (const [culture, surnames] of Object.entries(SURNAME_PATTERNS)) {
    for (const surname of surnames) {
      if (normalized === surname) return culture;
      if (normalized.startsWith(surname + ' ') || normalized.endsWith(' ' + surname)) return culture;
      if (surname.includes('-') && normalized.includes(surname.replace('-', ''))) return culture;
    }
  }

  return null;
}

export function inferCultureFromCouple(
  brideLastName: string | null,
  groomLastName: string | null,
): string | null {
  return inferCultureFromLastName(brideLastName) || inferCultureFromLastName(groomLastName);
}
