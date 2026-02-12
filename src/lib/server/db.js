import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');
const ITEMS_FILE = path.join(DATA_DIR, 'pyramid_items.json');

let initialized = false;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Datum (YYYY-MM-DD) zu numerischer ID konvertieren */
function dateToId(dateStr) {
	return Number(dateStr.replace(/-/g, ''));
}

/** Numerische ID zu Datum (YYYY-MM-DD) konvertieren */
function idToDate(id) {
	const str = String(id);
	return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
}

/** Dateipfad für Tages-JSON generieren */
function getDayFilePath(date) {
	return path.join(DATA_DIR, `${date}_portions.json`);
}

/** Alle pyramid items laden */
async function loadItems() {
	try {
		const data = await fs.readFile(ITEMS_FILE, 'utf-8');
		return JSON.parse(data);
	} catch {
		return [];
	}
}

/** Pyramid items speichern */
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
			{ id: 2, label: 'Huelsenfruechte, Fleisch, Fisch, Ei', recommended_portions: 1, tier: 2, item_order: 1 },
			{ id: 3, label: 'Oele und Fette', recommended_portions: 2, tier: 2, item_order: 2 },
			{ id: 4, label: 'Milch und Milchprodukte', recommended_portions: 2, tier: 3, item_order: 1 },
			{ id: 5, label: 'Nuesse und Saaten', recommended_portions: 1, tier: 3, item_order: 2 },
			{ id: 6, label: 'Brot, Getreide, Beilagen', recommended_portions: 4, tier: 4, item_order: 1 },
			{ id: 7, label: 'Obst und Gemuese', recommended_portions: 5, tier: 5, item_order: 1 },
			{ id: 8, label: 'Getraenke', recommended_portions: 6, tier: 6, item_order: 1 }
		];
		await saveItems(seedItems);
	}

	initialized = true;
}

// ============================================================================
// PYRAMID ITEMS
// ============================================================================

/** @returns {Promise<Array>} */
export async function getAllItems() {
	return await loadItems();
}

/**
 * @param {number} id
 * @returns {Promise<object|null>}
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

	// Auch aus allen Tages-Dateien entfernen
	const files = await fs.readdir(DATA_DIR);
	for (const file of files) {
		if (file.endsWith('_portions.json')) {
			const filePath = path.join(DATA_DIR, file);
			const data = await fs.readFile(filePath, 'utf-8');
			const dayData = JSON.parse(data);
			if (dayData.portions && id in dayData.portions) {
				delete dayData.portions[id];
				await fs.writeFile(filePath, JSON.stringify(dayData, null, 2), 'utf-8');
			}
		}
	}
}

// ============================================================================
// DAYS
// ============================================================================

/** @returns {Promise<Array<{id:number,entry_date:string}>>} */
export async function getAllDays() {
	const files = await fs.readdir(DATA_DIR);
	const days = [];

	for (const file of files) {
		if (file.endsWith('_portions.json')) {
			const date = file.split('_')[0];
			days.push({
				id: dateToId(date),
				entry_date: date
			});
		}
	}

	return days.sort((a, b) => b.id - a.id);
}

/**
 * @param {number} id
 * @returns {Promise<{id:number,entry_date:string}|null>}
 */
export async function getDayById(id) {
	const date = idToDate(id);
	const filePath = getDayFilePath(date);

	try {
		await fs.access(filePath);
		return { id, entry_date: date };
	} catch {
		return null;
	}
}

/**
 * @param {string} date
 * @returns {Promise<number>}
 */
export async function upsertDay(date) {
	const dayId = dateToId(date);
	const filePath = getDayFilePath(date);

	try {
		await fs.access(filePath);
	} catch {
		const items = await loadItems();
		const dayData = {
			id: dayId,
			entry_date: date,
			portions: {}
		};

		items.forEach(item => {
			dayData.portions[item.id] = 0;
		});

		await fs.writeFile(filePath, JSON.stringify(dayData, null, 2), 'utf-8');
	}

	return dayId;
}

/**
 * @param {number} id
 * @param {string} newDate
 * @returns {Promise<void>}
 */
export async function updateDay(id, newDate) {
	const oldDate = idToDate(id);
	const oldPath = getDayFilePath(oldDate);
	const newPath = getDayFilePath(newDate);
	const newId = dateToId(newDate);

	const data = await fs.readFile(oldPath, 'utf-8');
	const dayData = JSON.parse(data);
	dayData.id = newId;
	dayData.entry_date = newDate;

	await fs.writeFile(newPath, JSON.stringify(dayData, null, 2), 'utf-8');
	await fs.unlink(oldPath);
}

/**
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteDay(id) {
	const date = idToDate(id);
	const filePath = getDayFilePath(date);
	try {
		await fs.unlink(filePath);
	} catch {
		// Datei existiert nicht, ignorieren
	}
}

// ============================================================================
// PORTIONS
// ============================================================================

/**
 * @param {number} dayId
 * @returns {Promise<void>}
 */
export async function ensurePortionRows(dayId) {
	const date = idToDate(dayId);
	const filePath = getDayFilePath(date);
	const items = await loadItems();

	try {
		const data = await fs.readFile(filePath, 'utf-8');
		const dayData = JSON.parse(data);

		let modified = false;
		items.forEach(item => {
			if (!(item.id in dayData.portions)) {
				dayData.portions[item.id] = 0;
				modified = true;
			}
		});

		if (modified) {
			await fs.writeFile(filePath, JSON.stringify(dayData, null, 2), 'utf-8');
		}
	} catch {
		await upsertDay(date);
	}
}

/**
 * @param {number} dayId
 * @returns {Promise<Array<{id:number,label:string,recommended_portions:number,tier:number,item_order:number,portions:number}>>}
 */
export async function getPortionsForDay(dayId) {
	const date = idToDate(dayId);
	const filePath = getDayFilePath(date);
	const items = await loadItems();

	let dayData;
	try {
		const data = await fs.readFile(filePath, 'utf-8');
		dayData = JSON.parse(data);
	} catch {
		dayData = { portions: {} };
	}

	return items.map(item => ({
		...item,
		portions: dayData.portions[item.id] || 0
	}));
}

/**
 * @param {number} dayId
 * @param {number} itemId
 * @param {number} delta
 * @returns {Promise<number>}
 */
export async function incrementPortion(dayId, itemId, delta) {
	const date = idToDate(dayId);
	const filePath = getDayFilePath(date);

	let dayData;
	try {
		const data = await fs.readFile(filePath, 'utf-8');
		dayData = JSON.parse(data);
	} catch {
		await upsertDay(date);
		const newData = await fs.readFile(filePath, 'utf-8');
		dayData = JSON.parse(newData);
	}

	const current = dayData.portions[itemId] || 0;
	const newValue = Math.max(current + delta, 0);
	dayData.portions[itemId] = newValue;

	await fs.writeFile(filePath, JSON.stringify(dayData, null, 2), 'utf-8');
	return newValue;
}

/**
 * @param {number} dayId
 * @param {number} itemId
 * @param {number} portions
 * @returns {Promise<number>}
 */
export async function setPortion(dayId, itemId, portions) {
	const date = idToDate(dayId);
	const filePath = getDayFilePath(date);

	let dayData;
	try {
		const data = await fs.readFile(filePath, 'utf-8');
		dayData = JSON.parse(data);
	} catch {
		await upsertDay(date);
		const newData = await fs.readFile(filePath, 'utf-8');
		dayData = JSON.parse(newData);
	}

	dayData.portions[itemId] = portions;
	await fs.writeFile(filePath, JSON.stringify(dayData, null, 2), 'utf-8');
	return portions;
}
