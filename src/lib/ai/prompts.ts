/** Prompts and JSON response schemas for Gemini (structured output). */

export const MEAL_PROMPT = `You are a nutritionist who specialises in Indian home-cooked, restaurant and street food.
Identify every distinct food or drink in this photo and estimate how much is there.

For each item:
- name: the common name used in India, e.g. "Roti", "Dal tadka", "Jeera rice", "Idli", "Masala dosa", "Paneer butter masala", "Curd".
- portionLabel: the household unit for ONE of "quantity". Use Indian units:
  roti / chapati / phulka / paratha / puri / naan / idli / dosa / vada / samosa / pakora / egg → count pieces with that word as the unit (e.g. "roti", "idli");
  dal, sabzi, curry, sambar, rasam, curd, raita, kheer, rice, khichdi, poha, upma → "katori" (1 katori ≈ 150 g cooked) or "plate" for rice/biryani (≈ 250–300 g);
  drinks → "glass" (≈ 250 ml) or "cup" (≈ 150 ml); anything else → "piece" or "serving".
- quantity: how many of that unit are visible (count pieces; estimate how full bowls are, e.g. 0.5 or 1.5 katori).
- grams: estimated total weight of the whole quantity. Typical weights: roti 40 g, paratha 80 g, puri 25 g, idli 40 g, plain dosa 80 g, masala dosa 160 g, medu vada 40 g, samosa 60 g, boiled egg 50 g.
- kcal, protein, carbs, fat: totals (grams of macronutrient) for the whole quantity, as typically cooked at home with oil or ghee. Prefer IFCT 2017 / NIN (ICMR) values.
- confidence: 0 to 1 — how sure you are about both what it is and how much.
- box: tight bounding box around the item as [ymin, xmin, ymax, xmax], normalized to 0–1000.

List each distinct item once (e.g. 3 rotis → one item with quantity 3). Ignore plates, cutlery, packaging and garnish.
If there is no food in the photo, return {"items": []}.`

export const MEAL_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          portionLabel: { type: 'string', description: 'Household unit for one of quantity, e.g. roti, katori, idli' },
          quantity: { type: 'number' },
          grams: { type: 'number', description: 'Total grams for the whole quantity' },
          kcal: { type: 'number' },
          protein: { type: 'number' },
          carbs: { type: 'number' },
          fat: { type: 'number' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          box: {
            type: 'array',
            items: { type: 'number' },
            minItems: 4,
            maxItems: 4,
            description: '[ymin, xmin, ymax, xmax] normalized to 0-1000',
          },
        },
        required: ['name', 'portionLabel', 'quantity', 'grams', 'kcal', 'protein', 'carbs', 'fat', 'confidence', 'box'],
      },
    },
  },
  required: ['items'],
} as const

export const LABEL_PROMPT = `This is a photo of the nutrition information table on a packaged food (most likely Indian packaging).
Read it and return:
- productName: the product name if it is visible, otherwise an empty string.
- per100g: energy in kcal (if only kJ is printed, divide by 4.184), protein, total carbohydrate and total fat in grams — all PER 100 g (or per 100 ml).
  If the table only gives values per serving, convert them to per 100 g using the serving size.
- servingSize: the serving size printed on the pack as { "label": short unit such as "1 biscuit", "serving", "2 slices", "grams": weight of that serving in grams }, or null if none is printed.
- confidence: 0 to 1 — how sure you are the numbers were read correctly. Use 0 if this is not a nutrition table.`

export const LABEL_SCHEMA = {
  type: 'object',
  properties: {
    productName: { type: 'string' },
    per100g: {
      type: 'object',
      properties: {
        kcal: { type: 'number' },
        protein: { type: 'number' },
        carbs: { type: 'number' },
        fat: { type: 'number' },
      },
      required: ['kcal', 'protein', 'carbs', 'fat'],
    },
    servingSize: {
      type: ['object', 'null'],
      properties: {
        label: { type: 'string' },
        grams: { type: 'number' },
      },
      required: ['label', 'grams'],
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['productName', 'per100g', 'servingSize', 'confidence'],
} as const
