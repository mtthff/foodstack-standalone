import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

/** @typedef {{ id:number, label:string, recommended_portions:number, tier:number, item_order:number }} PyramidItem */
/** @typedef {{ id:number, entry_date:string, portions:Record<number, number> }} DayData */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');
const ITEMS_FILE = path.join(DATA_DIR, 'pyramid_items.json');
const CURRENT_DAY_FILE = path.join(DATA_DIR, 'current.json');

let initialized = false;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Datum (YYYY-MM-DD) zu numerischer ID konvertieren */
/** @param {string} dateStr */
function dateToId(dateStr) {
	return Number(dateStr.replace(/-/g, ''));
}

/** Numerische ID zu Datum (YYYY-MM-DD) konvertieren */
/** @param {number} id */
function idToDate(id) {
	const str = String(id);
	return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
}

/** Alle pyramid items laden */
async function loadItems() {
	try {
		const data = await fs.readFile(ITEMS_FILE, 'utf-8');
		return /** @type {PyramidItem[]} */ (JSON.parse(data));
	} catch {
		/** @type {PyramidItem[]} */
		return [];
	}
}

/** Pyramid items speichern */
/** @param {PyramidItem[]} items */
async function saveItems(items) {
	await fs.mkdir(DATA_DIR, { recursive: true });
	await fs.writeFile(ITEMS_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * @returns {Promise<void>}
 */
export async function initDb() {
	if (initialized) {
		return;
	}

	await fs.mkdir(DATA_DIR, { recursive: true });

	const items = await loadItems();
	if (items.length === 0) {
		const seedItems = [
			{ id: 1, label: 'Extras', recommended_portions: 1, tier: 1, item_order: 1 },
			{ id: 2, label: 'Hülsenfrüchte, Fleisch, Fisch, Ei', recommended_portions: 1, tier: 2, item_order: 1 },
			{ id: 3, label: 'Öle und Fette', recommended_portions: 2, tier: 2, item_order: 2 },
			{ id: 4, label: 'Milch und Milchprodukte', recommended_portions: 2, tier: 3, item_order: 1 },
			{ id: 5, label: 'Nüsse und Saaten', recommended_portions: 1, tier: 3, item_order: 2 },
			{ id: 6, label: 'Brot, Getreide, Beilagen', recommended_portions: 4, tier: 4, item_order: 1 },
			{ id: 7, label: 'Obst und Gemüse', recommended_portions: 5, tier: 5, item_order: 1 },
			{ id: 8, label: 'Getränke', recommended_portions: 6, tier: 6, item_order: 1 }
		];
		await saveItems(seedItems);
	}

	initialized = true;
}

// ============================================================================
// PYRAMID ITEMS
// ============================================================================

/** @returns {Promise<PyramidItem[]>} */
export async function getAllItems() {
	return await loadItems();
}

/**
 * @param {number} id
 * @returns {Promise<PyramidItem|null>}
 */
export async function getItemById(id) {
	const items = await loadItems();
	return items.find(item => item.id === id) || null;
}

/**
 * @param {string} label
 * @param {number} recommendedPortions
 * @param {number} tier
 * @param {number} itemOrder
 * @returns {Promise<number>}
 */
export async function createItem(label, recommendedPortions, tier, itemOrder) {
	const items = await loadItems();
	const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
	/** @type {PyramidItem} */
	const newItem = {
		id: newId,
		label,
		recommended_portions: recommendedPortions,
		tier,
		item_order: itemOrder
	};
	items.push(newItem);
	await saveItems(items);
	return newId;
}

/**
 * @param {number} id
 * @param {string} label
 * @param {number} recommendedPortions
 * @param {number} tier
 * @param {number} itemOrder
 * @returns {Promise<void>}
 */
export async function updateItem(id, label, recommendedPortions, tier, itemOrder) {
	const items = await loadItems();
	const index = items.findIndex(item => item.id === id);
	if (index === -1) return;

	items[index] = {
		id,
		label,
		recommended_portions: recommendedPortions,
		tier,
		item_order: itemOrder
	};
	await saveItems(items);
}

/**
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteItem(id) {
	const items = await loadItems();
	const filtered = items.filter(item => item.id !== id);
	await saveItems(filtered);
}

// ============================================================================
// DAYS
// ============================================================================

/** Lädt die aktuelle Tagesdatei oder gibt null zurück */
async function loadCurrentDay() {
	try {
		const data = await fs.readFile(CURRENT_DAY_FILE, 'utf-8');
		return /** @type {DayData} */ (JSON.parse(data));
	} catch {
		return null;
	}
}

/** Speichert die aktuelle Tagesdatei */
/** @param {DayData} dayData */
async function saveCurrentDay(dayData) {
	await fs.mkdir(DATA_DIR, { recursive: true });
	await fs.writeFile(CURRENT_DAY_FILE, JSON.stringify(dayData, null, 2), 'utf-8');
}

/**
 * @param {string} date
 * @returns {Promise<number>}
 */
export async function upsertDay(date) {
	const dayId = dateToId(date);
	const items = await loadItems();
	const currentDay = await loadCurrentDay();

	/** @type {DayData} */
	let dayData;

	// Wenn es einen gespeicherten Tag gibt und das Datum gleich ist, behalte die Daten
	if (currentDay && currentDay.id === dayId) {
		// Datum ist gleich - behalte die Daten, aber stelle sicher alle Items vorhanden sind
		dayData = currentDay;
		// Füge neue Items hinzu, falls es welche gibt
		items.forEach(item => {
			if (!(item.id in dayData.portions)) {
				dayData.portions[item.id] = 0;
			}
		});
	} else {
		// Neues Datum oder erste Nutzung - setze alles auf 0
		dayData = {
			id: dayId,
			entry_date: date,
			portions: {}
		};
		items.forEach(item => {
			dayData.portions[item.id] = 0;
		});
	}

	await saveCurrentDay(dayData);
	return dayId;
}

// ============================================================================
// PORTIONS
// ============================================================================

/**
 * @param {number} dayId
 * @returns {Promise<Array<{id:number,label:string,recommended_portions:number,tier:number,item_order:number,portions:number}>>}
 */
export async function getPortionsForDay(dayId) {
	const items = await loadItems();
	const currentDay = await loadCurrentDay();

	// Wenn der gespeicherte Tag nicht dem angeforderten Tag entspricht,
	// gebe 0 Portionen für alle Items zurück (neuer Tag)
	if (!currentDay || currentDay.id !== dayId) {
		return items.map(item => ({
			...item,
			portions: 0
		}));
	}

	return items.map(item => ({
		...item,
		portions: currentDay.portions[item.id] || 0
	}));
}

/**
 * @param {number} dayId
 * @param {number} itemId
 * @param {number} delta
 * @returns {Promise<number>}
 */
export async function incrementPortion(dayId, itemId, delta) {
	const items = await loadItems();
	let currentDay = await loadCurrentDay();

	// Wenn der aktuelle Tag anders ist, initialisiere mit neuem Tag
	if (!currentDay || currentDay.id !== dayId) {
		const date = idToDate(dayId);
		/** @type {DayData} */
		const newDay = {
			id: dayId,
			entry_date: date,
			portions: {}
		};
		items.forEach(item => {
			newDay.portions[item.id] = 0;
		});
		currentDay = newDay;
	}

	const current = currentDay.portions[itemId] || 0;
	const newValue = Math.max(current + delta, 0);
	currentDay.portions[itemId] = newValue;

	await saveCurrentDay(currentDay);
	return newValue;
}

/**
 * @param {number} dayId
 * @param {number} itemId
 * @param {number} portions
 * @returns {Promise<number>}
 */
export async function setPortion(dayId, itemId, portions) {
	const items = await loadItems();
	let currentDay = await loadCurrentDay();

	// Wenn der aktuelle Tag anders ist, initialisiere mit neuem Tag
	if (!currentDay || currentDay.id !== dayId) {
		const date = idToDate(dayId);
		/** @type {DayData} */
		const newDay = {
			id: dayId,
			entry_date: date,
			portions: {}
		};
		items.forEach(item => {
			newDay.portions[item.id] = 0;
		});
		currentDay = newDay;
	}

	currentDay.portions[itemId] = portions;
	await saveCurrentDay(currentDay);
	return portions;
}
