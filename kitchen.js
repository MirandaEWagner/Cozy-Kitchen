const catalog = {
  fridge: [
    ['mushrooms', 'Mushrooms', '🍄', 'var(--blue)'],
    ['carrot', 'Carrot', '🥕', '#ff9957'],
    ['broccoli', 'Broccoli', '🥦', '#85cb68'],
    ['onion', 'Onion', '🧅', '#d6a0eb'],
    ['tomato', 'Tomato', '🍅', '#ee655b'],
    ['milk', 'Milk', '🥛', '#f3efce'],
    ['juice', 'Juice', '🧃', '#ef84b7']
  ],
  pantry: [
    ['rice', 'Rice', '🍚', 'var(--blue)'],
    ['beans', 'Beans', '🫘', '#ba755a'],
    ['bread', 'Bread', '🍞', '#f3bd78'],
    ['flour', 'Flour', '🌾', '#d5cb9a'],
    ['sugar', 'Sugar', '🧊', '#99e2dc'],
    ['spices', 'Spices', '🌶️', '#d77c43']
  ]
};

function evaluate(selected, method) {
  const rice = selected.has('rice');
  const mushrooms = selected.has('mushrooms');
  const stove = method === 'stove';
  const sweet = selected.has('sugar') || selected.has('juice');
  const extras = selected.size - Number(rice) - Number(mushrooms);
  const exact = rice && mushrooms && stove && extras === 0;
  const score = exact ? 100 : Math.max(5, Math.min(89,
    8 + (rice ? 30 : 0) + (mushrooms ? 30 : 0) + (stove ? 14 : 0) -
    extras * 5 - (sweet ? 17 : 0)
  ));
  const hints = [];
  if (!stove) hints.push('I usually like things cooked on the stovetop.');
  if (sweet) hints.push('I was hoping for something savory.');
  if (!hints.length) {
    if (exact) hints.push('Mushroom risotto! You figured me out.');
    else if (rice && mushrooms) hints.push('Those two go together. Could we keep it simple?');
    else if (rice) hints.push('A little something earthy would go well with those grains.');
    else if (mushrooms) hints.push('That smells woodsy. I’d love a soft grain with it.');
    else hints.push('Something earthy and a little creamy sounds lovely.');
  }
  return { score, hint: hints.join(' ') };
}

const items = new Map(Object.values(catalog).flat().map(item => [item[0], item]));
const selected = new Set();
let shelf = 'fridge';
const byId = id => document.getElementById(id);
const ingredients = byId('ingredients');
const guest = document.querySelector('.guest');
const meter = byId('meter');
const progress = byId('satisfaction');
const hint = byId('hint');
const shelfButtons = document.querySelectorAll('[data-shelf]');

const journalKey = 'moonlit-kitchen-journal-v1';
const reactionColors = { Green: '#a8d88a', Amber: '#edbf75', Red: '#ed8377' };
let attempts = [];
try {
  const saved = JSON.parse(localStorage.getItem(journalKey));
  if (Array.isArray(saved)) attempts = saved;
} catch {
  // The journal still works during this visit if storage is unavailable.
}

function recipeName(choice, method, score) {
  const has = id => choice.includes(id);
  const vegetables = ['carrot', 'broccoli', 'onion', 'tomato', 'mushrooms'];
  if (score === 100) return 'Mushroom Risotto';
  if (has('rice') && has('spices') && vegetables.some(has)) return 'Curry';
  if (has('tomato') && has('flour')) return 'Spaghetti';
  if (has('sugar') && has('flour')) return method === 'oven' ? 'Sugar Cookies' : 'Sweet Griddle Cakes';
  if (has('rice') && has('mushrooms')) return method === 'oven' ? 'Mushroom Rice Bake' : 'Mushroom Rice Skillet';
  if (has('beans') && has('rice')) return 'Beans and Rice';
  if (has('tomato') && has('bread')) return 'Tomato Toast';
  if (has('milk') && has('rice')) return 'Rice Pudding';
  const names = choice.map(id => items.get(id)[1]);
  return names.join(' & ') + (method === 'oven' ? ' Bake' : ' Skillet');
}

function renderJournal() {
  byId('journal-empty').hidden = attempts.length > 0;
  const solved = attempts.some(entry => entry.score === 100);
  byId('glow-hint').hidden = solved || attempts.length < 5;
  byId('journal-list').replaceChildren(...attempts.map(entry => {
    const row = document.createElement('li');
    const name = document.createElement('strong');
    const detail = document.createElement('small');
    const reaction = document.createElement('span');
    name.textContent = entry.name;
    detail.textContent = entry.ingredients.join(', ') + ' · ' + entry.method;
    reaction.className = 'journal-reaction';
    reaction.style.color = reactionColors[entry.color];
    reaction.textContent = '● ' + entry.color + ' · ' + entry.score + '%';
    row.append(name, reaction, detail);
    return row;
  }));
}

function renderShelf() {
  for (const button of shelfButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.shelf === shelf));
  }
  ingredients.replaceChildren(...catalog[shelf].map(([id, name, icon, glow]) => {
    const button = document.createElement('button');
    button.className = 'ingredient';
    button.dataset.item = id;
    button.style.setProperty('--glow', glow);
    button.setAttribute('aria-pressed', String(selected.has(id)));
    const symbol = document.createElement('span');
    symbol.className = 'icon';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = icon;
    button.append(symbol, name);
    button.addEventListener('click', () => {
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      updateDish();
    });
    return button;
  }));
}

function updateDish() {
  for (const button of ingredients.children) {
    button.setAttribute('aria-pressed', String(selected.has(button.dataset.item)));
  }
  const chips = [...selected].map(id => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = items.get(id)[1];
    return chip;
  });
  byId('selection').replaceChildren(...(chips.length ? chips : ['Choose ingredients from either shelf.']));
  byId('serve').disabled = !selected.size;
  byId('clear').disabled = !selected.size;
  meter.hidden = true;
  guest.dataset.mood = 'waiting';
  hint.textContent = selected.size ? '“Let me know when it’s ready.”' : '“Could you make me something warm?”';
}

for (const button of shelfButtons) {
  button.addEventListener('click', () => {
    shelf = button.dataset.shelf;
    renderShelf();
  });
}
document.querySelectorAll('[name="method"]').forEach(input => input.addEventListener('change', updateDish));
byId('serve').addEventListener('click', () => {
  const method = document.querySelector('[name="method"]:checked').value;
  const result = evaluate(selected, method);
  const color = result.score === 100 ? 'Green' : result.score >= 45 ? 'Amber' : 'Red';
  const choice = [...selected].sort();
  attempts.unshift({
    name: recipeName(choice, method, result.score),
    ingredients: choice.map(id => items.get(id)[1]),
    method: method === 'stove' ? 'Stovetop' : 'Oven',
    score: result.score,
    color
  });
  try {
    localStorage.setItem(journalKey, JSON.stringify(attempts));
  } catch {
    // Keep the current journal in memory.
  }
  renderJournal();
  progress.value = result.score;
  progress.style.setProperty('--fill', reactionColors[color]);
  byId('score').value = result.score + '%';
  meter.hidden = false;
  hint.textContent = '“' + result.hint + '”';
  guest.dataset.mood = result.score === 100 ? 'delighted' : result.score < 45 ? 'disappointed' : 'curious';
});
byId('clear').addEventListener('click', () => {
  selected.clear();
  updateDish();
  ingredients.firstElementChild.focus();
});
byId('reset').addEventListener('click', () => {
  selected.clear();
  shelf = 'fridge';
  document.querySelector('[value="stove"]').checked = true;
  renderShelf();
  updateDish();
});
renderShelf();
updateDish();
renderJournal();
