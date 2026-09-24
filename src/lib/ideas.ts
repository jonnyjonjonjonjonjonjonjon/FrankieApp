import type { LibraryItem } from '../types'
import { preferMulberry, type MulberryEntry } from './symbolImages'

/**
 * "Try something new" (backlog item 16): foods and activities Frankie doesn't
 * have yet, to nudge her past the defaults. Curated, so every idea is a real
 * food or activity with a clear Mulberry picture and the right shelf (the
 * Mulberry index alone has no categories and many non-food words). Every
 * symbol here exists in public/symbols/mulberry/.
 */

export type IdeaKind = 'food' | 'activity'

export interface Idea {
  kind: IdeaKind
  category: string
  name: string
  /** A Mulberry symbol ("mb:<name>"). */
  symbol: string
}

/** The Try tile and its screen (OpenMoji sparkles). */
export const TRY_SYMBOL = '✨'

/** Most ideas a Find shows from the whole Mulberry set ("More pictures"). */
export const MAX_MORE = 24
/**
 * "More pictures" searches the whole Mulberry set only from this many letters:
 * one or two letters match hundreds of words (letters, tools, body words) that
 * aren't foods or activities. The curated ideas still match from one letter.
 */
export const MORE_MIN_LETTERS = 3
/**
 * Mulberry words never offered as a new food or activity: anatomy and
 * personal care, illness, harm and death, and a few that aren't hers to add.
 * Matched against whole words of the label ("dead plant" is left out too).
 */
const BLOCKED = new Set([
  'penis', 'vagina', 'breast', 'bottom', 'bra', 'knickers', 'pants', 'nappy', 'tampon', 'sanitary', 'toilet', 'toilets',
  'vomit', 'sick', 'blood', 'scar', 'skull', 'skeleton', 'ghost', 'scary',
  'kill', 'killer', 'dead', 'die', 'fight', 'hit', 'punch', 'kick', 'shoot', 'steal', 'arrest', 'angry', 'sad',
  'drunk', 'cigarette', 'smoke', 'smoking',
])
/** Letters, numbers and shapes: school words, not things to eat or do. */
const NOT_IDEAS = new Set([
  'lower', 'upper', 'case', 'letter', 'alphabet',
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'twenty', 'thirty', 'forty', 'fifty', 'hundred', 'thousand', 'half', 'third', 'thirds', 'quarter', 'quarters', 'percent', 'dot', 'dots',
  'circle', 'square', 'triangle', 'oval', 'pentagon', 'hexagon', 'hexagonal', 'octagon', 'rectangle', 'diamond', 'prism', 'pyramid', 'shape', 'shapes',
])

const shelf = (kind: IdeaKind, category: string, list: [string, string][]): Idea[] =>
  list.map(([name, mb]) => ({ kind, category, name, symbol: `mb:${mb}` }))

export const IDEAS: Idea[] = [
  ...shelf('food', 'breakfast', [
    ['Croissant', 'croissant'],
    ['Pancakes', 'pancakes'],
    ['Bacon', 'bacon'],
    ['Boiled egg', 'egg_boiled'],
    ['Scrambled eggs', 'eggs_scrambled'],
    ['Fry up', 'fried_breakfast'],
    ['Roll', 'bread_roll'],
    ['Yogurt', 'yogurt'],
    ['Egg on toast', 'egg_on_toast'],
    ['Cheese on toast', 'cheese_on_toast_melted'],
  ]),
  ...shelf('food', 'lunch', [
    ['Cheese sandwich', 'sandwich_cheese'],
    ['Ham sandwich', 'sandwich_ham'],
    ['Tomato soup', 'soup_tomato'],
    ['Salad', 'salad'],
    ['Macaroni cheese', 'macaroni_cheese'],
    ['Pot noodle', 'pot_noodle'],
    ['Sausage roll', 'sausage_roll'],
    ['Noodles', 'noodles'],
    ['Toastie', 'sandwich_toasted'],
  ]),
  ...shelf('food', 'dinner', [
    ['Burger', 'hamburger'],
    ['Nuggets', 'chicken_nuggets'],
    ['Kebab', 'kebab'],
    ['Rice', 'rice'],
    ['Meatballs', 'meatballs_and_spaghetti'],
    ['Steak', 'steak'],
    ['Fish fingers', 'frozen_fish_fingers'],
    ['Pie', 'pie_meat'],
    ['Chicken', 'chicken'],
    ['Carrots', 'carrot'],
    ['Broccoli', 'broccoli'],
    ['Peas', 'peas'],
    ['Sweetcorn', 'sweetcorn'],
  ]),
  ...shelf('food', 'fruit', [
    ['Apple', 'apple'],
    ['Banana', 'banana'],
    ['Grapes', 'grapes'],
    ['Orange', 'orange'],
    ['Strawberries', 'strawberry'],
    ['Melon', 'watermelon'],
    ['Pineapple', 'pineapple'],
    ['Pear', 'pear'],
    ['Peach', 'peach'],
    ['Mango', 'mango'],
  ]),
  ...shelf('food', 'treats', [
    ['Crisps', 'crisps'],
    ['Jelly', 'jelly'],
    ['Apple pie', 'pie_apple'],
    ['Doughnut', 'doughnut'],
    ['Cupcake', 'cake_cup_cake'],
    ['Ice lolly', 'ice_lolly'],
    ['Cookie', 'biscuit_chocolate_chip'],
    ['Mince pie', 'mince_pie'],
    ['Sweets', 'sweet'],
  ]),
  ...shelf('food', 'drinks', [
    ['Coffee', 'coffee'],
    ['Hot chocolate', 'hot_chocolate'],
    ['Milk', 'milk'],
    ['Milkshake', 'milkshake'],
    ['Lemonade', 'lemonade'],
    ['Squash', 'orange_squash'],
    ['Apple juice', 'apple_juice'],
  ]),
  ...shelf('activity', 'home', [
    ['TV', 'flatscreen_tv'],
    ['Cooking', 'cook-to'],
    ['Baking', 'bake-to'],
    ['Cleaning', 'broom'],
    ['Washing', 'laundry_basket'],
    ['Jigsaw', 'jigsaw_puzzle'],
    ['Reading', 'read_book-to'],
    ['Garden', 'back_garden'],
    ['Washing up', 'wash_up-to'],
  ]),
  ...shelf('activity', 'out', [
    ['Café', 'cafe'],
    ['Bank', 'bank'],
    ['Theme park', 'theme_park'],
    ['Beach', 'beach'],
    ['Picnic', 'picnic'],
    ['Church', 'church'],
  ]),
  ...shelf('activity', 'active', [
    ['Bike ride', 'bicycle'],
    ['Dancing', 'dance-to'],
    ['Horse riding', 'ride_horse-to'],
    ['Bowling', 'bowling'],
    ['Football', 'football'],
    ['Tennis', 'tennis'],
    ['Trampoline', 'trampoline'],
    ['Dog walk', 'walk_dog-to'],
    ['Exercise', 'exercise-to'],
  ]),
  ...shelf('activity', 'fun', [
    ['Music', 'music'],
    ['Singing', 'sing-to'],
    ['Games', 'computer_game'],
    ['Cards', 'playing_cards'],
    ['Painting', 'paint-to'],
    ['Colouring', 'colouring_book'],
    ['Crafts', 'craft_table'],
    ['Bubbles', 'bubbles'],
  ]),
  ...shelf('activity', 'friends', [
    ['Phone call', 'telephone_handset'],
    ['Video call', 'mobile_phone_video'],
    ['Visit', 'visit-to'],
    ['Party', 'party_popper'],
  ]),
  ...shelf('activity', 'relax', [
    ['Bath', 'bath'],
    ['Bubble bath', 'bubble_bath'],
    ['Nails', 'nail_polish'],
    ['Haircut', 'haircut'],
    ['Hand cream', 'hand_cream'],
    ['Rest', 'relax-to'],
  ]),
]

const nameKey = (s: string) => s.toLowerCase().replace(/\s+/g, '')
const labelWords = (label: string) => label.toLowerCase().split(/[\s_-]+/).filter(Boolean)

/** A Mulberry picture fit to offer as a new idea: a real word (3+ letters), not a letter, number, shape or blocked word. */
export function suitable(label: string): boolean {
  const words = labelWords(label)
  if (cleanLabel(label).length < 3 || /\d/.test(cleanLabel(label))) return false
  return !words.some(w => BLOCKED.has(w) || NOT_IDEAS.has(w))
}

/**
 * What she already has of a kind, INCLUDING removed words (what the family
 * took out isn't suggested again): names, and symbols normalised to Mulberry
 * (seeds and older words store emoji, ideas use "mb:" names).
 */
function haves(kind: IdeaKind, items: LibraryItem[]) {
  const names = new Set<string>()
  const symbols = new Set<string>()
  for (const i of items) {
    if (i.kind !== kind) continue
    names.add(nameKey(i.name))
    if (i.symbol) symbols.add(preferMulberry(i.symbol))
  }
  return (name: string, symbol: string) => names.has(nameKey(name)) || symbols.has(symbol)
}

/** Ideas not already in her list, for one shelf (or all of the kind's). */
export function freshIdeas(kind: IdeaKind, items: LibraryItem[], category?: string | null): Idea[] {
  const has = haves(kind, items)
  return IDEAS.filter(i => i.kind === kind && (!category || i.category === category) && !has(i.name, i.symbol))
}

/** A Mulberry label as a word for her tile: no "to" or number suffixes, first letter capital. */
export function cleanLabel(label: string): string {
  const w = label
    .replace(/_/g, ' ')
    .replace(/-to\b/g, '')
    .replace(/\s+(\d+[a-z]?|[a-z]?\d+[a-z]?)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  return w.charAt(0).toUpperCase() + w.slice(1)
}

/** Find: matching ideas first, then any other Mulberry picture she doesn't have ("More pictures"). */
export function findIdeas(
  kind: IdeaKind,
  items: LibraryItem[],
  q: string,
  mulberry: MulberryEntry[],
  category: string,
): { ideas: Idea[]; more: Idea[] } {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return { ideas: [], more: [] }
  const has = haves(kind, items)
  const matches = (label: string) => {
    const parts = labelWords(label)
    return words.every(w => parts.some(p => p.startsWith(w)))
  }
  const ideas = IDEAS.filter(i => i.kind === kind && matches(i.name) && !has(i.name, i.symbol))
  if (words.join('').length < MORE_MIN_LETTERS) return { ideas, more: [] }
  // A picture that is one of the ideas shows as that idea (its own word and shelf).
  const bySymbol = new Map(IDEAS.filter(i => i.kind === kind).map(i => [i.symbol, i]))
  const seenWords = new Set(ideas.map(i => nameKey(i.name)))
  const more: Idea[] = []
  const scored = mulberry
    .filter(m => matches(m.label) && suitable(m.label))
    // Whole-word matches first, then the shortest names (the plainest pictures).
    .map(m => ({ m, score: (words.every(w => labelWords(m.label).includes(w)) ? 0 : 1000) + m.label.length }))
    .sort((a, b) => a.score - b.score)
  for (const { m } of scored) {
    if (more.length >= MAX_MORE) break
    const symbol = `mb:${m.id}`
    const idea = bySymbol.get(symbol)
    if (idea) {
      if (!ideas.includes(idea) && !has(idea.name, idea.symbol)) ideas.push(idea)
      continue
    }
    const name = cleanLabel(m.label)
    if (!name || has(name, symbol) || seenWords.has(nameKey(name))) continue
    seenWords.add(nameKey(name))
    more.push({ kind, category, name, symbol })
  }
  return { ideas, more }
}
