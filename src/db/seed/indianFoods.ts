import type { Food, Serving } from '../types'

/** Bump when this list changes; missing ids get added on next launch (user edits are never overwritten). */
export const FOOD_SEED_VERSION = 1

/**
 * Common Indian foods, per 100 g as eaten (cooked dishes as typically prepared at home).
 * Values are APPROXIMATE, compiled from IFCT 2017 / NIN (ICMR) reference tables and standard
 * home recipes; oil, ghee and recipe variation change real numbers a lot. Every food is editable.
 *
 * Household measures: katori (small bowl) ≈ 150 g of a cooked dish, plate of rice ≈ 250 g,
 * glass ≈ 250 ml, tsp ≈ 5 g, tbsp ≈ 15 g, handful ≈ 30 g.
 */
type Row = [
  id: string,
  name: string,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  servings: [label: string, grams: number][],
  aliases?: string[],
]

const KATORI: [string, number] = ['katori', 150]

const rows: Row[] = [
  // Breads
  ['roti', 'Roti / Chapati', 264, 9, 50, 2.4, [['roti', 40]], ['chapati', 'phulka', 'fulka']],
  ['roti-ghee', 'Roti with ghee', 310, 8.5, 47, 8.5, [['roti', 45]], ['chapati ghee']],
  ['paratha', 'Paratha (plain)', 326, 7, 45, 13, [['paratha', 80]], ['parantha']],
  ['aloo-paratha', 'Aloo paratha', 230, 5.5, 33, 8.5, [['paratha', 120]], ['alu parantha']],
  ['paneer-paratha', 'Paneer paratha', 250, 9, 30, 10.5, [['paratha', 120]]],
  ['methi-thepla', 'Methi thepla', 300, 8, 42, 11, [['thepla', 40]], ['thepla']],
  ['puri', 'Puri', 352, 7, 45, 16, [['puri', 25]], ['poori']],
  ['bhatura', 'Bhatura', 363, 7.5, 45, 17, [['bhatura', 80]], ['bhature']],
  ['naan', 'Naan (plain)', 286, 9, 50, 5.5, [['naan', 90]]],
  ['butter-naan', 'Butter naan', 330, 8.5, 48, 11.5, [['naan', 100]]],
  ['jowar-roti', 'Jowar roti / bhakri', 230, 6.5, 46, 2.2, [['roti', 50]], ['bhakri', 'jolada rotti']],
  ['bajra-roti', 'Bajra roti', 257, 7, 47, 4.5, [['roti', 50]], ['bajre ki roti']],
  ['white-bread', 'Bread (white)', 261, 9, 49, 3.2, [['slice', 25]], ['sandwich bread']],
  ['brown-bread', 'Bread (brown / whole wheat)', 250, 10, 45, 3.4, [['slice', 28]], ['atta bread']],
  ['pav', 'Pav (bun)', 273, 8.5, 50, 4.3, [['pav', 40]], ['bun']],

  // Rice & grains
  ['rice', 'Rice (white, cooked)', 126, 2.7, 28, 0.3, [KATORI, ['plate', 250]], ['chawal', 'steamed rice', 'bhaat']],
  ['brown-rice', 'Brown rice (cooked)', 122, 2.7, 25.6, 1, [KATORI, ['plate', 250]]],
  ['jeera-rice', 'Jeera rice', 160, 3, 28, 4, [KATORI, ['plate', 250]]],
  ['veg-pulao', 'Veg pulao', 150, 3.3, 24, 4.5, [KATORI, ['plate', 250]], ['pulav']],
  ['curd-rice', 'Curd rice', 120, 3.5, 18, 3.8, [KATORI, ['plate', 250]], ['thayir sadam', 'dahi chawal']],
  ['lemon-rice', 'Lemon rice', 178, 3, 29, 5.5, [KATORI, ['plate', 250]], ['chitranna']],
  ['khichdi', 'Moong dal khichdi', 125, 4.5, 20, 3, [KATORI, ['plate', 300]], ['khichri']],
  ['chicken-biryani', 'Chicken biryani', 192, 9, 22, 7.5, [['plate', 300], KATORI]],
  ['mutton-biryani', 'Mutton biryani', 210, 10, 21, 9.5, [['plate', 300], KATORI]],
  ['egg-biryani', 'Egg biryani', 181, 7.5, 23, 6.5, [['plate', 300], KATORI]],
  ['veg-biryani', 'Veg biryani', 161, 4, 25, 5, [['plate', 300], KATORI]],
  ['oats-dry', 'Oats (dry)', 379, 13, 66, 7, [['½ cup', 40]], ['rolled oats', 'oatmeal']],
  ['oats-milk', 'Oats porridge (with milk)', 111, 4.5, 16, 3.2, [['bowl', 250]], ['daliya']],
  ['sabudana-khichdi', 'Sabudana khichdi', 192, 2.5, 32, 6, [KATORI, ['plate', 250]]],

  // Dals & legumes
  ['toor-dal', 'Dal (toor / arhar)', 108, 6.5, 15, 2.5, [KATORI], ['arhar dal', 'tuvar dal', 'plain dal']],
  ['moong-dal', 'Moong dal', 106, 7, 15, 2, [KATORI]],
  ['masoor-dal', 'Masoor dal', 110, 7.5, 15, 2.3, [KATORI], ['red lentil']],
  ['dal-fry', 'Dal fry / tadka', 131, 6.5, 14, 5.5, [KATORI], ['dal tadka']],
  ['dal-makhani', 'Dal makhani', 152, 6, 13, 8.5, [KATORI]],
  ['sambar', 'Sambar', 71, 3.3, 9.5, 2.2, [KATORI]],
  ['rasam', 'Rasam', 36, 1.2, 5, 1.2, [KATORI]],
  ['rajma', 'Rajma curry', 120, 6, 15, 4, [KATORI], ['kidney beans']],
  ['chole', 'Chole / chana masala', 150, 6.5, 18, 5.8, [KATORI], ['chana masala', 'chickpea curry']],
  ['kala-chana', 'Kala chana (boiled)', 167, 8.9, 27, 2.6, [['katori', 100]], ['black chickpeas']],
  ['sprouts', 'Moong sprouts', 97, 7, 15, 1, [['katori', 100]], ['sprouted moong']],
  ['kadhi', 'Kadhi (with pakora)', 109, 3.5, 9, 6.5, [KATORI], ['kadhi pakora']],
  ['soya-chunks', 'Soya chunks (dry)', 345, 52, 33, 0.5, [['handful', 25], ['katori', 50]], ['nutrela', 'meal maker']],
  ['soya-curry', 'Soya chunks curry', 121, 11, 9, 4.5, [KATORI]],

  // South Indian & breakfast
  ['idli', 'Idli', 143, 4.5, 30, 0.5, [['idli', 40]], ['idly']],
  ['dosa', 'Dosa (plain)', 191, 4, 28, 7, [['dosa', 80]], ['dosai']],
  ['masala-dosa', 'Masala dosa', 205, 4, 28, 8.5, [['dosa', 160]]],
  ['uttapam', 'Uttapam', 169, 4.5, 26, 5.2, [['uttapam', 120]], ['uthappam']],
  ['medu-vada', 'Medu vada', 258, 8, 25, 14, [['vada', 40]], ['vadai', 'urad vada']],
  ['upma', 'Upma (rava)', 141, 3.5, 20, 5.2, [KATORI, ['plate', 250]], ['uppittu']],
  ['poha', 'Poha', 159, 3, 25, 5.2, [KATORI, ['plate', 200]], ['kanda poha', 'aval']],
  ['pongal', 'Ven pongal', 140, 4, 19, 5.3, [KATORI]],
  ['appam', 'Appam', 170, 3, 32, 3.3, [['appam', 60]]],
  ['besan-chilla', 'Besan chilla', 210, 9, 22, 9.5, [['chilla', 70]], ['cheela', 'pudla']],
  ['dhokla', 'Dhokla', 162, 6, 22, 5.5, [['piece', 30]], ['khaman']],
  ['coconut-chutney', 'Coconut chutney', 182, 2.5, 7, 16, [['tbsp', 15], ['small katori', 50]]],

  // Vegetables & paneer dishes
  ['aloo-gobi', 'Aloo gobi', 101, 2.5, 11, 5.2, [KATORI]],
  ['bhindi', 'Bhindi masala', 109, 2.5, 9, 7, [KATORI], ['okra', 'bhindi fry']],
  ['aloo-sabzi', 'Aloo sabzi', 120, 2, 15, 5.8, [KATORI], ['potato curry', 'batata bhaji']],
  ['mixed-veg', 'Mixed veg curry', 91, 2.5, 9, 5, [KATORI], ['sabzi']],
  ['baingan-bharta', 'Baingan bharta', 92, 2, 8, 5.8, [KATORI], ['brinjal']],
  ['cabbage-sabzi', 'Cabbage sabzi', 71, 1.8, 6.5, 4.2, [KATORI], ['patta gobi']],
  ['lauki', 'Lauki sabzi', 56, 1, 5, 3.5, [KATORI], ['bottle gourd', 'dudhi']],
  ['sarson-saag', 'Sarson ka saag', 90, 3, 6, 6, [KATORI], ['saag']],
  ['palak-paneer', 'Palak paneer', 143, 7, 5, 10.5, [KATORI]],
  ['paneer-butter-masala', 'Paneer butter masala', 231, 8, 8, 18.5, [KATORI], ['paneer makhani']],
  ['kadai-paneer', 'Kadai paneer', 191, 8, 7, 14.5, [KATORI]],
  ['matar-paneer', 'Matar paneer', 172, 7, 9, 12, [KATORI]],
  ['paneer-bhurji', 'Paneer bhurji', 230, 13, 5, 17.5, [['katori', 100]]],
  ['paneer-tikka', 'Paneer tikka', 251, 15, 6, 18.5, [['piece', 25]]],

  // Dairy & drinks
  ['paneer', 'Paneer', 265, 18.3, 1.2, 20.8, [['cube', 20], ['katori', 100]], ['cottage cheese']],
  ['curd', 'Curd / dahi', 61, 3.1, 4.5, 3.4, [KATORI], ['dahi', 'yogurt', 'yoghurt']],
  ['hung-curd', 'Hung curd / Greek yogurt', 74, 10, 4, 2, [['katori', 100]], ['greek yogurt']],
  ['raita', 'Cucumber raita', 54, 2.8, 4.5, 2.8, [KATORI]],
  ['milk-toned', 'Milk (toned)', 59, 3.2, 4.7, 3, [['glass', 250]], ['doodh']],
  ['milk-full', 'Milk (full cream)', 90, 3.2, 4.7, 6.5, [['glass', 250]]],
  ['chaas', 'Buttermilk / chaas', 20, 1.2, 2, 0.8, [['glass', 250]], ['chhaas', 'mattha', 'majjige']],
  ['lassi', 'Sweet lassi', 80, 2.8, 13, 1.9, [['glass', 250]]],
  ['chai', 'Masala chai (milk, sugar)', 59, 1.8, 8.5, 2, [['cup', 150]], ['tea', 'chaha']],
  ['coffee', 'Filter coffee (milk, sugar)', 59, 1.8, 8, 2.2, [['cup', 150]], ['kaapi']],
  ['coconut-water', 'Coconut water', 19, 0.7, 3.7, 0.2, [['glass', 250]], ['nariyal pani']],
  ['ghee', 'Ghee', 898, 0, 0, 99.8, [['tsp', 5], ['tbsp', 14]]],
  ['butter', 'Butter', 730, 0.9, 0.1, 81, [['tsp', 5], ['tbsp', 14]], ['makhan']],
  ['whey', 'Whey protein (generic)', 398, 78, 8, 6, [['scoop', 32]], ['protein powder']],

  // Eggs, chicken, fish, mutton
  ['egg-boiled', 'Egg (boiled)', 150, 12.6, 1.1, 10.6, [['egg', 50]], ['anda', 'boiled egg']],
  ['egg-white', 'Egg white (boiled)', 49, 11, 0.7, 0.2, [['white', 33]]],
  ['omelette', 'Omelette (2 eggs)', 192, 11, 2, 15.5, [['omelette', 120]], ['omlet', 'anda omelette']],
  ['egg-bhurji', 'Egg bhurji', 200, 11, 3, 16, [['katori', 100]], ['anda bhurji']],
  ['egg-curry', 'Egg curry', 149, 7.5, 5, 11, [KATORI], ['anda curry']],
  ['chicken-breast', 'Chicken breast (grilled)', 165, 31, 0, 4.6, [['piece', 150], ['100 g', 100]]],
  ['chicken-curry', 'Chicken curry', 149, 13, 4, 9, [KATORI], ['murgh curry']],
  ['butter-chicken', 'Butter chicken', 211, 13, 6, 15, [KATORI], ['murgh makhani']],
  ['tandoori-chicken', 'Tandoori chicken', 162, 25, 3, 5.5, [['leg piece', 120]]],
  ['chicken-tikka', 'Chicken tikka', 151, 24, 3, 4.8, [['piece', 25]]],
  ['fish-curry', 'Fish curry', 132, 13, 3, 7.5, [KATORI], ['machli']],
  ['fish-fry', 'Fish fry', 221, 20, 6, 13, [['piece', 80]]],
  ['mutton-curry', 'Mutton curry', 202, 15, 4, 14, [KATORI], ['gosht']],
  ['chicken-roll', 'Chicken kathi roll', 230, 11, 25, 9.5, [['roll', 200]], ['frankie', 'shawarma']],

  // Snacks & street food
  ['samosa', 'Samosa', 310, 5, 32, 18, [['samosa', 60]]],
  ['pakora', 'Pakora / bhaji', 289, 7, 27, 17, [['piece', 20]], ['pakoda', 'bhajji']],
  ['kachori', 'Kachori', 377, 7, 40, 21, [['kachori', 50]]],
  ['vada-pav', 'Vada pav', 200, 5, 28, 7.5, [['vada pav', 150]]],
  ['pav-bhaji', 'Pav bhaji', 180, 4, 24, 7.5, [['plate', 350]]],
  ['pani-puri', 'Pani puri', 179, 3.5, 30, 5, [['6 pieces', 100]], ['golgappa', 'puchka']],
  ['bhel-puri', 'Bhel puri', 171, 4.5, 28, 4.5, [['plate', 150]]],
  ['veg-momos', 'Momos (veg, steamed)', 161, 5, 25, 4.5, [['piece', 25]]],
  ['chicken-momos', 'Momos (chicken, steamed)', 178, 9, 22, 6, [['piece', 25]]],
  ['veg-sandwich', 'Veg sandwich', 189, 5.5, 27, 6.5, [['sandwich', 150]]],
  ['instant-noodles', 'Instant noodles (prepared)', 148, 3.5, 20, 6, [['packet', 200]], ['maggi']],
  ['roasted-chana', 'Roasted chana', 369, 22.5, 58, 5.2, [['handful', 30]], ['bhuna chana']],
  ['peanuts', 'Peanuts (roasted)', 590, 25, 16, 49, [['handful', 30]], ['moongphali', 'groundnut']],
  ['almonds', 'Almonds', 574, 21, 10, 50, [['10 almonds', 12]], ['badam']],
  ['cashews', 'Cashews', 588, 18, 30, 44, [['10 cashews', 15]], ['kaju']],
  ['makhana', 'Makhana (roasted)', 348, 9.7, 77, 0.1, [['katori', 25]], ['fox nuts', 'lotus seeds']],
  ['namkeen', 'Namkeen / bhujia', 543, 12, 45, 35, [['handful', 30]], ['mixture', 'sev']],
  ['marie-biscuit', 'Marie biscuit', 436, 7, 75, 12, [['biscuit', 6]], ['biscuit']],
  ['papad', 'Papad (roasted)', 371, 26, 60, 3, [['papad', 12]], ['papadum']],
  ['peanut-butter', 'Peanut butter', 606, 25, 14, 50, [['tbsp', 16]]],

  // Fruit
  ['banana', 'Banana', 87, 1.1, 20.5, 0.3, [['banana', 118]], ['kela']],
  ['apple', 'Apple', 51, 0.3, 12, 0.2, [['apple', 180]], ['seb']],
  ['mango', 'Mango', 61, 0.8, 13.5, 0.4, [['cup', 165]], ['aam']],
  ['papaya', 'Papaya', 43, 0.5, 9.5, 0.3, [KATORI], ['papita']],
  ['orange', 'Orange', 45, 0.9, 10, 0.1, [['orange', 130]], ['santra']],
  ['guava', 'Guava', 55, 2.6, 9, 1, [['guava', 100]], ['amrood', 'peru']],
  ['watermelon', 'Watermelon', 32, 0.6, 7, 0.2, [['cup', 150]], ['tarbooz']],
  ['grapes', 'Grapes', 71, 0.7, 16.5, 0.2, [['cup', 150]], ['angoor']],
  ['pomegranate', 'Pomegranate', 78, 1.7, 14.7, 1.2, [['katori', 100]], ['anar']],

  // Sweets & extras
  ['gulab-jamun', 'Gulab jamun', 322, 4.5, 50, 11.5, [['piece', 40]]],
  ['jalebi', 'Jalebi', 392, 3, 60, 15.5, [['piece', 25]]],
  ['rasgulla', 'Rasgulla', 191, 4, 38, 2.5, [['piece', 50]], ['rosogolla']],
  ['kheer', 'Kheer (rice)', 140, 3.8, 20, 5, [KATORI], ['payasam']],
  ['besan-ladoo', 'Besan ladoo', 488, 9, 50, 28, [['ladoo', 30]], ['laddu']],
  ['sooji-halwa', 'Sooji halwa', 322, 3.5, 42, 15.5, [['katori', 100]], ['sheera', 'kesari']],
  ['sugar', 'Sugar', 399, 0, 99.8, 0, [['tsp', 5]], ['cheeni', 'shakkar']],
  ['jaggery', 'Jaggery', 383, 0.4, 95, 0.1, [['piece', 10]], ['gud', 'gur']],
  ['honey', 'Honey', 320, 0.3, 80, 0, [['tbsp', 21]], ['shahad']],
  ['pickle', 'Pickle (mango, in oil)', 201, 1.5, 6, 19, [['tbsp', 15]], ['achar', 'achaar']],
  ['salad', 'Salad (cucumber, tomato, onion)', 21, 0.9, 3.8, 0.2, [['katori', 100]], ['kachumber']],
]

const toServings = (list: [string, number][]): Serving[] => list.map(([label, grams]) => ({ label, grams }))

export const SEED_FOODS: Food[] = rows.map(([id, name, kcal, protein, carbs, fat, servings, aliases]) => ({
  id: `in-${id}`,
  name,
  per100g: { kcal, protein, carbs, fat },
  servings: toServings(servings),
  source: 'local',
  approximate: true,
  aliases,
  updatedAt: 0,
}))
