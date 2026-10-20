// Entirely fictional dataset: the great houses of Westeros as companies, their members as
// partners and administrators, following the family hierarchy. Nothing here is real data.
import type {
  LinkRelation,
  Network,
  NetworkEntity,
  NetworkLink,
  NetworkSize,
  RegistrationStatus,
} from './graph'
import { computeConflicts } from './graph'

const LIST = {
  redWedding: 'Casamento Vermelho',
  crown: 'Impedidos pela Coroa',
  pirates: 'Piratas das Ilhas de Ferro',
  warCrimes: 'Crimes de guerra',
  exiles: 'Exilados de Westeros',
}

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const digitsFor = (id: string, count: number) => {
  const rnd = mulberry32(hash(id))
  return Array.from({ length: count }, () => Math.floor(rnd() * 10)).join('')
}
const cnpjFor = (id: string) => {
  const d = digitsFor(id, 10)
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/0001-${d.slice(8, 10)}`
}
const cpfFor = (id: string) => {
  const d = digitsFor(id, 6)
  return `***.${d.slice(0, 3)}.${d.slice(3, 6)}-**`
}

interface Builder {
  entities: NetworkEntity[]
  links: NetworkLink[]
  house: (
    id: string,
    name: string,
    role: NetworkEntity['role'],
    options?: { status?: RegistrationStatus; lists?: string[] },
  ) => string
  person: (
    id: string,
    name: string,
    options?: { title?: string; pep?: boolean; lists?: string[] },
  ) => string
  link: (from: string, to: string, relation: LinkRelation, share?: number, active?: boolean) => void
}

function createBuilder(): Builder {
  const entities: NetworkEntity[] = []
  const links: NetworkLink[] = []
  const known = new Set<string>()

  const house: Builder['house'] = (id, name, role, options = {}) => {
    if (known.has(id)) return id
    known.add(id)
    entities.push({
      id,
      kind: 'company',
      name,
      document: cnpjFor(id),
      role,
      registrationStatus: options.status ?? 'Ativa',
      restrictedLists: options.lists ?? [],
      pep: false,
    })
    return id
  }

  const person: Builder['person'] = (id, name, options = {}) => {
    if (known.has(id)) return id
    known.add(id)
    const entity: NetworkEntity = {
      id,
      kind: 'person',
      name,
      document: cpfFor(id),
      role: 'other',
      restrictedLists: options.lists ?? [],
      pep: options.pep ?? false,
    }
    if (options.title) entity.title = options.title
    entities.push(entity)
    return id
  }

  const link: Builder['link'] = (from, to, relation, share, active = true) => {
    const entry: NetworkLink = { id: `${from}->${to}`, from, to, relation, active }
    if (share !== undefined) entry.share = share
    links.push(entry)
  }

  return { entities, links, house, person, link }
}

function greatHouses(b: Builder) {
  const { house, person, link } = b

  // ---- Our own house -------------------------------------------------------------------------
  const stark = house('stark', 'Casa Stark de Winterfell S.A.', 'own')
  link(stark, person('eddard', 'Eddard Stark', { title: 'Lorde de Winterfell', pep: true }), 'administrator', 35)
  link(stark, person('catelyn', 'Catelyn Tully Stark', { title: 'Senhora de Winterfell' }), 'partner', 15)
  link(stark, person('robb', 'Robb Stark', { title: 'Rei do Norte' }), 'partner', 12)
  link(stark, person('sansa', 'Sansa Stark'), 'partner', 10)
  link(stark, person('arya', 'Arya Stark'), 'partner', 8)
  link(stark, person('bran', 'Brandon Stark'), 'partner', 8)
  link(stark, person('rickon', 'Rickon Stark'), 'partner', 6)
  link(stark, person('jon', 'Jon Snow', { title: 'Lorde Comandante da Patrulha da Noite' }), 'partner', 6, false)
  link(stark, person('benjen', 'Benjen Stark', { title: 'Primeiro Patrulheiro' }), 'partner', undefined, false)
  link(stark, person('theon', 'Theon Greyjoy', { title: 'Pupilo de Winterfell' }), 'administrator', undefined, false)

  const karstark = house('karstark', 'Casa Karstark de Karhold Ltda.', 'other')
  link(stark, karstark, 'related', 20)
  link(karstark, person('rickard-k', 'Rickard Karstark'), 'administrator', 60, false)
  link(karstark, person('alys-k', 'Alys Karstark'), 'partner', 40)

  const umber = house('umber', 'Casa Umber de Último Lar Ltda.', 'other')
  link(stark, umber, 'related', 15)
  link(umber, person('greatjon', 'Jon Umber, o Grande'), 'administrator', 70)
  link(umber, person('smalljon', 'Jon Umber, o Pequeno'), 'partner', 30, false)

  const reed = house('reed', 'Casa Reed de Guardamar ME', 'other')
  link(stark, reed, 'related', 10)
  link(reed, person('howland', 'Howland Reed'), 'administrator', 60)
  link(reed, person('meera', 'Meera Reed'), 'partner', 20)
  link(reed, person('jojen', 'Jojen Reed'), 'partner', 20, false)

  const mormont = house('mormont', 'Casa Mormont da Ilha dos Ursos ME', 'other')
  link(stark, mormont, 'related', 10)
  link(mormont, person('jeor', 'Jeor Mormont', { title: 'Velho Urso' }), 'administrator', 40, false)
  link(mormont, person('lyanna-m', 'Lyanna Mormont', { title: 'Senhora da Ilha dos Ursos' }), 'administrator', 30)
  link(mormont, person('jorah', 'Jorah Mormont', { lists: [LIST.exiles] }), 'partner', 20, false)
  link(mormont, person('maege', 'Maege Mormont'), 'partner', 10)

  // ---- Analysed houses -----------------------------------------------------------------------
  const lannister = house('lannister', 'Casa Lannister de Rochedo Casterly Holding', 'analyzed')
  link(lannister, person('tywin', 'Tywin Lannister', { title: 'Mão do Rei', pep: true }), 'administrator', 40)
  link(lannister, person('cersei', 'Cersei Lannister', { title: 'Rainha Regente', pep: true }), 'partner', 20)
  link(lannister, person('jaime', 'Jaime Lannister', { title: 'Comandante da Guarda Real' }), 'partner', 15)
  link(lannister, person('tyrion', 'Tyrion Lannister', { title: 'Mão do Rei em exercício', lists: [LIST.crown] }), 'partner', 15)
  link(lannister, person('kevan', 'Kevan Lannister'), 'partner', 10)
  link(lannister, 'sansa', 'partner', 5, false)

  const clegane = house('clegane', 'Casa Clegane Serviços ME', 'other')
  link(lannister, clegane, 'related', 25)
  link(clegane, person('gregor', 'Gregor Clegane', { title: 'A Montanha', lists: [LIST.warCrimes] }), 'administrator', 70)
  link(clegane, person('sandor', 'Sandor Clegane', { title: 'O Cão de Caça' }), 'partner', 30, false)

  const baratheon = house('baratheon', 'Casa Baratheon de Ponta Tempestade S.A.', 'analyzed')
  link(baratheon, person('robert', 'Robert Baratheon', { title: 'Rei dos Sete Reinos', pep: true }), 'administrator', 40, false)
  link(baratheon, person('stannis', 'Stannis Baratheon', { title: 'Senhor de Pedra do Dragão', pep: true }), 'partner', 20)
  link(baratheon, person('renly', 'Renly Baratheon', { title: 'Mestre das Leis' }), 'partner', 15, false)
  link(baratheon, 'cersei', 'partner', 15)
  link(baratheon, person('joffrey', 'Joffrey Baratheon', { title: 'Rei' }), 'partner', 5, false)
  link(baratheon, person('tommen', 'Tommen Baratheon', { title: 'Rei' }), 'partner', 5)
  link(baratheon, person('myrcella', 'Myrcella Baratheon'), 'partner', 5)
  link(baratheon, 'eddard', 'administrator', undefined, false)
  link(baratheon, person('margaery', 'Margaery Tyrell', { title: 'Rainha' }), 'partner', 5)

  const tyrell = house('tyrell', 'Casa Tyrell de Jardim de Cima Ltda.', 'analyzed')
  link(tyrell, person('olenna', 'Olenna Tyrell', { title: 'Rainha dos Espinhos' }), 'administrator', 35)
  link(tyrell, person('mace', 'Mace Tyrell', { title: 'Mestre da Moeda', pep: true }), 'partner', 25)
  link(tyrell, 'margaery', 'partner', 20)
  link(tyrell, person('loras', 'Loras Tyrell', { title: 'Cavaleiro das Flores' }), 'partner', 20)

  const tarly = house('tarly', 'Casa Tarly de Monte Chifre Ltda.', 'other')
  link(tyrell, tarly, 'related', 30)
  link(tarly, person('randyll', 'Randyll Tarly'), 'administrator', 60)
  link(tarly, person('samwell', 'Samwell Tarly', { title: 'Irmão da Patrulha da Noite' }), 'partner', 20, false)
  link(tarly, person('dickon', 'Dickon Tarly'), 'partner', 20)

  const redwyne = house('redwyne', 'Casa Redwyne da Árvore Participações', 'other')
  link(tyrell, redwyne, 'related', 20)
  link(redwyne, person('paxter', 'Paxter Redwyne', { title: 'Lorde da Árvore' }), 'administrator', 70)
  link(redwyne, 'olenna', 'partner', 30)

  const bolton = house('bolton', 'Casa Bolton do Forte do Pavor Ltda.', 'analyzed', {
    status: 'Baixada',
    lists: [LIST.redWedding],
  })
  link(bolton, person('roose', 'Roose Bolton', { title: 'Guardião do Norte', lists: [LIST.redWedding] }), 'administrator', 60)
  link(bolton, person('ramsay', 'Ramsay Bolton', { lists: [LIST.warCrimes] }), 'partner', 30)
  link(bolton, 'sansa', 'partner', 10, false)

  const frey = house('frey', 'Casa Frey das Gêmeas EIRELI', 'analyzed', { lists: [LIST.redWedding] })
  link(frey, person('walder', 'Walder Frey', { title: 'Lorde da Travessia', lists: [LIST.redWedding] }), 'administrator', 50)
  link(frey, person('stevron', 'Stevron Frey'), 'partner', 10, false)
  link(frey, person('lothar', 'Lothar Frey', { lists: [LIST.redWedding] }), 'partner', 10)
  link(frey, person('walder-rivers', 'Walder Rivers'), 'partner', 5)
  link(frey, person('roslin', 'Roslin Frey'), 'partner', 10)
  link(frey, 'robb', 'partner', undefined, false)

  const tully = house('tully', 'Casa Tully de Correrrio S.A.', 'analyzed')
  link(tully, person('hoster', 'Hoster Tully', { title: 'Lorde de Correrrio' }), 'administrator', 40, false)
  link(tully, person('edmure', 'Edmure Tully', { title: 'Lorde de Correrrio' }), 'administrator', 30)
  link(tully, person('brynden', 'Brynden Tully', { title: 'O Peixe Negro' }), 'partner', 15)
  link(tully, 'catelyn', 'partner', 10)
  link(tully, person('lysa', 'Lysa Tully Arryn', { title: 'Senhora do Vale' }), 'partner', 5)
  link(tully, 'roslin', 'partner', 5)

  const greyjoy = house('greyjoy', 'Casa Greyjoy de Pyke Ltda.', 'analyzed')
  link(greyjoy, person('balon', 'Balon Greyjoy', { title: 'Rei das Ilhas de Ferro' }), 'administrator', 40, false)
  link(greyjoy, person('euron', 'Euron Greyjoy', { title: 'Olho de Corvo', lists: [LIST.pirates] }), 'administrator', 30)
  link(greyjoy, person('asha', 'Asha Greyjoy'), 'partner', 20)
  link(greyjoy, 'theon', 'partner', 10)
  link(greyjoy, person('victarion', 'Victarion Greyjoy', { title: 'Lorde Capitão da Frota de Ferro' }), 'partner', 10)

  const targaryen = house('targaryen', 'Casa Targaryen de Pedra do Dragão Participações', 'analyzed')
  link(targaryen, person('daenerys', 'Daenerys Targaryen', { title: 'Mãe dos Dragões', pep: true }), 'administrator', 50)
  link(targaryen, person('viserys', 'Viserys Targaryen', { title: 'O Rei Mendigo' }), 'partner', 20, false)
  link(targaryen, 'jon', 'partner', 30)
  link(targaryen, 'jorah', 'administrator', undefined)

  // ---- Other houses in the web ---------------------------------------------------------------
  const arryn = house('arryn', 'Casa Arryn do Ninho da Águia S.A.', 'other')
  link(arryn, person('jon-arryn', 'Jon Arryn', { title: 'Mão do Rei', pep: true }), 'administrator', 40, false)
  link(arryn, 'lysa', 'partner', 30)
  link(arryn, person('robin', 'Robin Arryn', { title: 'Lorde do Ninho da Águia' }), 'partner', 20)
  link(arryn, person('baelish', 'Petyr Baelish', { title: 'Mestre da Moeda', pep: true, lists: [LIST.crown] }), 'administrator', 10)

  const martell = house('martell', 'Casa Martell de Lançassolar S.A.', 'other')
  link(martell, person('doran', 'Doran Martell', { title: 'Príncipe de Dorne' }), 'administrator', 50)
  link(martell, person('oberyn', 'Oberyn Martell', { title: 'A Víbora Vermelha' }), 'partner', 20, false)
  link(martell, person('ellaria', 'Ellaria Sand'), 'partner', 10)
  link(martell, person('trystane', 'Trystane Martell'), 'partner', 10)
  link(martell, 'myrcella', 'partner', 10)

  const ironBank = house('iron-bank', 'Banco de Ferro de Braavos S.A.', 'other')
  link(ironBank, person('tycho', 'Tycho Nestoris'), 'administrator', 100)
  link(ironBank, lannister, 'related')
  link(ironBank, baratheon, 'related')

  return { stark, lannister, baratheon, tyrell, bolton, frey, tully, greyjoy, targaryen, arryn, martell }
}

const VASSALS: Record<string, string[]> = {
  stark: ['Glover', 'Manderly', 'Cerwyn', 'Hornwood', 'Tallhart', 'Dustin', 'Ryswell', 'Flint', 'Locke'],
  lannister: ['Marbrand', 'Lefford', 'Crakehall', 'Swyft', 'Brax', 'Westerling', 'Banefort', 'Payne', 'Serrett'],
  baratheon: ['Estermont', 'Tarth', 'Selmy', 'Dondarrion', 'Caron', 'Swann', 'Penrose', 'Connington'],
  tyrell: ['Hightower', 'Florent', 'Rowan', 'Oakheart', 'Fossoway', 'Caswell', 'Ashford', 'Merryweather'],
  tully: ['Blackwood', 'Bracken', 'Mallister', 'Piper', 'Vance', 'Darry', 'Whent', 'Mooton'],
  arryn: ['Royce', 'Waynwood', 'Corbray', 'Hunter', 'Belmore', 'Redfort', 'Templeton'],
  greyjoy: ['Harlaw', 'Drumm', 'Goodbrother', 'Botley', 'Blacktyde', 'Wynch'],
  martell: ['Dayne', 'Yronwood', 'Fowler', 'Uller', 'Toland', 'Jordayne'],
  targaryen: ['Velaryon', 'Celtigar', 'Massey', 'Bar Emmon'],
}

const FIRST_NAMES = [
  'Benfred', 'Wylis', 'Cley', 'Halys', 'Leobald', 'Barbrey', 'Roger', 'Robett', 'Addam', 'Damon',
  'Harys', 'Gawen', 'Baelor', 'Alester', 'Mathis', 'Arys', 'Lorent', 'Eldon', 'Brienne', 'Barristan',
  'Beric', 'Bryce', 'Ronnet', 'Tytos', 'Jonos', 'Jason', 'Clement', 'Karyl', 'Raymun', 'Shella',
  'Yohn', 'Anya', 'Lyn', 'Eon', 'Benedar', 'Horton', 'Rodrik', 'Dunstan', 'Gorold', 'Sawane',
  'Edric', 'Anders', 'Franklyn', 'Harmen', 'Valena', 'Monford', 'Ardrian', 'Justin', 'Duram', 'Selwyn',
  'Galbart', 'Wyman', 'Medger', 'Helman', 'Willam', 'Mariya', 'Desmond', 'Gilwood', 'Leyton', 'Jeyne',
]
const SUFFIXES = ['Ltda.', 'S.A.', 'ME', 'EIRELI', 'Participações']
const TITLES = ['Lorde', 'Lady', 'Sor', 'Herdeiro', 'Herdeira', 'Castelão', 'Meistre da casa']

function vassalHouses(b: Builder, lieges: Record<string, string>) {
  const { house, person, link } = b
  const rnd = mulberry32(1337)
  const pick = <T,>(list: T[]): T => list[Math.floor(rnd() * list.length)] as T
  const between = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1))
  const chance = (p: number) => rnd() < p
  const people: string[] = []
  const houses: string[] = []

  for (const [liegeKey, names] of Object.entries(VASSALS)) {
    const liege = lieges[liegeKey]
    if (!liege) continue
    for (const family of names) {
      const id = `v-${family.toLowerCase().replace(/\s+/g, '-')}`
      const restricted = chance(0.07)
      const vassal = house(id, `Casa ${family} ${pick(SUFFIXES)}`, 'other', {
        status: chance(0.9) ? 'Ativa' : 'Baixada',
        lists: restricted ? [pick([LIST.crown, LIST.warCrimes, LIST.exiles])] : [],
      })
      houses.push(vassal)
      link(liege, vassal, 'related', between(5, 20), chance(0.9))
      const members = between(1, 3)
      for (let m = 0; m < members; m++) {
        const title = m === 0 ? pick(['Lorde', 'Lady']) : pick(TITLES)
        const memberId = `${id}-${m}`
        const member = person(memberId, `${pick(FIRST_NAMES)} ${family}`, {
          title: `${title} da Casa ${family}`,
          pep: chance(0.05),
          lists: chance(0.05) ? [pick([LIST.crown, LIST.exiles])] : [],
        })
        people.push(member)
        link(vassal, member, m === 0 ? 'administrator' : 'partner', between(10, 60), chance(0.92))
      }
    }
  }

  // Marriages and fosterings between vassal houses, so the web is a network rather than a forest.
  for (let i = 0; i < 18; i++) {
    const from = pick(houses)
    const to = pick(people)
    if (to.startsWith(from)) continue
    link(from, to, 'partner', between(5, 25), chance(0.85))
  }
}

export function buildNetwork(size: NetworkSize): Network {
  const builder = createBuilder()
  const lieges = greatHouses(builder)
  if (size === 'big') vassalHouses(builder, lieges)

  const network: Network = {
    entities: builder.entities,
    links: builder.links,
    ownId: lieges.stark,
    centralId: lieges.lannister,
    conflictIds: new Set(),
  }
  network.conflictIds = computeConflicts(network)
  return network
}
