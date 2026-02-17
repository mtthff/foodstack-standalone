<script>
	import { onMount } from "svelte";
	import { base } from "$app/paths";

	let dateValue = "";
	let todayValue = "";
	let dayId = null;
	let portions = [];
	let loading = true;
	let errorMessage = "";
	let toast = { show: false, message: "", type: "success" };
	let savingItemId = null;
	let deleteModal = { show: false, item: null };
	let longPressTimer = null;
	let longPressTriggered = false;

	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

	function parseDateValue(value) {
		if (!dateRegex.test(value)) {
			return null;
		}
		const [year, month, day] = value.split("-").map(Number);
		return new Date(year, month - 1, day);
	}

	function formatDateValue(date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	function formatDisplayDate(value) {
		const date = parseDateValue(value);
		if (!date) {
			return "";
		}
		const day = String(date.getDate()).padStart(2, "0");
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const year = String(date.getFullYear()).slice(-2);
		return `${day}.${month}.${year}`;
	}

	function changeDay(delta) {
		const baseDate = parseDateValue(dateValue);
		if (!baseDate) {
			return;
		}
		baseDate.setDate(baseDate.getDate() + delta);
		const nextValue = formatDateValue(baseDate);
		if (delta > 0 && todayValue && nextValue > todayValue) {
			return;
		}
		dateValue = nextValue;
		loadDay(nextValue);
	}

	function showToast(message, type = "success") {
		toast = { show: true, message, type };
		setTimeout(() => {
			toast = { ...toast, show: false };
		}, 2800);
	}

	async function fetchJson(url, options = {}) {
		const response = await fetch(url, {
			headers: { "Content-Type": "application/json" },
			...options,
		});

		const payload = await response.json();
		if (!payload.success) {
			throw new Error(payload.message || "Unbekannter Fehler.");
		}
		return payload.data;
	}

	async function loadDay(date) {
		if (!dateRegex.test(date)) {
			errorMessage = "Bitte ein gueltiges Datum angeben.";
			return;
		}

		loading = true;
		errorMessage = "";
		try {
			const data = await fetchJson(`${base}/api/days`, {
				method: "POST",
				body: JSON.stringify({ date }),
			});

			dayId = data.day.id;
			portions = data.portions;
		} catch (error) {
			errorMessage = error.message;
		} finally {
			loading = false;
		}
	}

	async function adjustPortion(itemId, delta) {
		if (!dayId) {
			return;
		}

		savingItemId = itemId;
		try {
			const data = await fetchJson(`${base}/api/days/${dayId}/portions`, {
				method: "POST",
				body: JSON.stringify({ itemId, delta }),
			});

			portions = portions.map((item) => (item.id === itemId ? { ...item, portions: data.portions } : item));
		} catch (error) {
			showToast(error.message, "danger");
		} finally {
			savingItemId = null;
		}
	}

	function portionStatus(item) {
		const diff = item.portions - item.recommended_portions;
		if (diff === 0) {
			return { label: "OK", tone: "success" };
		}
		if (diff > 0) {
			return { label: `+${diff}`, tone: "primary" };
		}
		return { label: `${diff}`, tone: "warning" };
	}

	function tierWidth(tier) {
		// Tier 3 bekommt einen Extra-Boost für mehr Pyramiden-Optik
		const tierNum = Number(tier);
		if (tierNum === 3) {
			return "90%";
		}
		return `${52 + tierNum * 8}%`;
	}

	function formatLabel(label) {
		return label.replace(/ue/g, "ü").replace(/Ue/g, "Ü").replace(/oe/g, "ö").replace(/Oe/g, "Ö").replace(/ae/g, "ä").replace(/Ae/g, "Ä");
	}

	function getIconPath(label) {
		const mapping = {
			Extras: "extras",
			"Huelsenfruechte, Fleisch, Fisch, Ei": "huelsenfruechte-fleisch-fisch-ei",
			"Oele und Fette": "oele-und-fette",
			"Milch und Milchprodukte": "milch-und-milchprodukte",
			"Nuesse und Saaten": "nuesse-und-saaten",
			"Brot, Getreide, Beilagen": "brot-getreide-beilagen",
			"Obst und Gemuese": "obst-und-gemuese",
			Getraenke: "getraenke",
		};
		const filename = mapping[label] || label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
		return `${base}/food-icons/${filename}.png`;
	}

	function buildSlots(items) {
		return items.flatMap((item) =>
			Array.from({ length: item.recommended_portions }, (_, index) => {
				const isLast = index === item.recommended_portions - 1;
				const excess = item.portions > item.recommended_portions ? item.portions - item.recommended_portions : 0;
				return {
					key: `${item.id}-${index}`,
					item,
					index,
					filled: index < item.portions,
					isLast,
					excess: isLast ? excess : 0,
				};
			}),
		);
	}

	function handleMouseDown(item) {
		longPressTriggered = false;
		longPressTimer = setTimeout(() => {
			longPressTriggered = true;
			if (item.portions > 0) {
				deleteModal = { show: true, item };
			}
		}, 600);
	}

	function handleMouseUp() {
		if (longPressTimer && !longPressTriggered) {
			clearTimeout(longPressTimer);
		}
		longPressTimer = null;
	}

	function handleClick(item) {
		if (!longPressTriggered) {
			adjustPortion(item.id, 1);
		}
		longPressTriggered = false;
	}

	function confirmDelete() {
		if (deleteModal.item) {
			adjustPortion(deleteModal.item.id, -1);
			deleteModal = { show: false, item: null };
		}
	}

	function cancelDelete() {
		deleteModal = { show: false, item: null };
	}

	function getLegendInfo(label) {
		const info = {
			Extras: "Zucker, Süßigkeiten, Salzstangen, Alkohol - maximal 1 Portion pro Tag. Gelegentlich genießen, nicht täglich. Keine Empfehlung, lieber weglassen.",
			"Huelsenfruechte, Fleisch, Fisch, Ei":
				"Fleisch 300-600g/Woche, Fisch 80-150g/Woche, Eier 2-3/Woche, Hülsenfrüchte (Bohnen, Linsen, Erbsen, Kichererbsen, Sojabohnen, Lupinen, Erdnüsse) regelmäßig.",
			"Oele und Fette": "1-2 EL Öl pro Tag, Butter/Margarine sparsam nutzen. Bevorzugt pflanzliche Öle (z.B. Rapsöl) und Nüsse",
			"Milch und Milchprodukte": "Milch, Joghurt, Käse - täglich verzehren, fettarme Varianten bevorzugen. Mind. 3 Portionen täglich",
			"Nuesse und Saaten":
				"25g/Tag (Handvoll), z.B. Mandeln, Walnüsse, Haselnüsse, Cashewnüsse, Pistazien, Pekannüsse, Macadamianüsse, Paranüsse, Pinienkerne, Sonnenblumenkerne, Kürbiskerne, Sesam, Leinsamen, Chiasamen, Hanfsamen, Mohn, Schwarzkümmel, Flohsamen, Senfsamen. Gute Fettquelle, sättigend",
			"Brot, Getreide, Beilagen": "Vollkornprodukte bevorzugen - Brot, Nudeln, Reis. Mind. 3 Portionen täglich",
			"Obst und Gemuese": "Min. 5 Portionen täglich (3× Gemüse, 2× Obst)",
			Getraenke: "Wasser, Tee hauptsächlich - min. 1,5-2L pro Tag, zuckerhaltige Getränke vermeiden, maximal 1 Glas Fruchtsaft/Tag",
		};
		return info[label] || label;
	}

	$: tiers = portions.reduce((acc, item) => {
		const key = item.tier;
		if (!acc[key]) {
			acc[key] = [];
		}
		acc[key].push(item);
		return acc;
	}, {});

	$: orderedTiers = Object.keys(tiers)
		.map(Number)
		.sort((a, b) => a - b)
		.map((tier) => ({ tier, items: tiers[tier] }));

	onMount(() => {
		const today = new Date();
		todayValue = formatDateValue(today);
		dateValue = todayValue;
		loadDay(dateValue);
	});
</script>

<div class="page-wrap">
	<div class="container py-4">
		<header class="mb-4">
			<p class="text-uppercase small fw-semibold text-secondary mb-2">Foodstack</p>
			<h1 class="display-6 fw-bold">Deine Ernährungspyramide</h1>
			<p class="text-secondary">Erfasse deine Portionen pro Tag. Jeder Klick addiert eine Portion.</p>
		</header>

		{#if errorMessage}
			<div class="alert alert-danger">{errorMessage}</div>
		{/if}

		{#if loading}
			<div class="text-center py-5">
				<div class="spinner-border text-primary" role="status"></div>
				<p class="text-secondary mt-3">Pyramide wird vorbereitet...</p>
			</div>
		{:else}
			<div class="date-nav" aria-label="Datum wechseln">
				<button class="date-nav-btn" on:click={() => changeDay(-1)} aria-label="Vorheriger Tag"> &lt; </button>
				<div class="date-nav-date">{formatDisplayDate(dateValue)}</div>
				{#if dateValue && todayValue && dateValue < todayValue}
					<button class="date-nav-btn" on:click={() => changeDay(1)} aria-label="Naechster Tag"> &gt; </button>
				{:else}
					<span class="date-nav-spacer" aria-hidden="true"></span>
				{/if}
			</div>
			<div class="pyramid">
				{#each orderedTiers as group}
					<div class="tier" style={`width: ${tierWidth(group.tier)}`}>
						<div class="tier-grid">
							{#each buildSlots(group.items) as slot (slot.key)}
								<button
									class={`portion-card ${slot.filled ? "filled" : "empty"}`}
									on:mousedown={() => handleMouseDown(slot.item)}
									on:mouseup={handleMouseUp}
									on:mouseleave={handleMouseUp}
									on:touchstart={() => handleMouseDown(slot.item)}
									on:touchend={handleMouseUp}
									on:click={() => handleClick(slot.item)}
									disabled={savingItemId === slot.item.id}
									title={`${formatLabel(slot.item.label)}: ${slot.item.portions}/${slot.item.recommended_portions}`}
								>
									<img src={getIconPath(slot.item.label)} alt={slot.item.label} class="portion-icon" />
									{#if slot.filled}
										<button
											class="delete-btn"
											on:click={(e) => {
												e.preventDefault();
												e.stopPropagation();
												deleteModal = { show: true, item: slot.item };
											}}
											title="Löschen"
										>
											<svg
												class="delete-icon"
												viewBox="0 0 24 24"
												aria-hidden="true"
												focusable="false"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path d="M3 6h18" />
												<path d="M8 6V4h8v2" />
												<path d="M6 6l1 14h10l1-14" />
												<path d="M10 10v6" />
												<path d="M14 10v6" />
											</svg>
										</button>
									{/if}
									{#if slot.isLast && slot.excess > 0}
										<span class="excess-badge">+{slot.excess}</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
			<hr />
			<div class="legend">
				<h6 class="legend-title">Legende & Empfehlungen:</h6>
				<div class="legend-items">
					{#each [...new Map(portions.map((item) => [item.label, item])).values()] as item}
						<div class="legend-row">
							<img src={getIconPath(item.label)} alt={item.label} class="legend-icon-row" />
							<div class="legend-content">
								<h6 class="legend-category">{formatLabel(item.label)}</h6>
								<p class="legend-description">{getLegendInfo(item.label)}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

{#if toast.show}
	<div class="toast-container position-fixed bottom-0 end-0 p-3">
		<div class={`toast show text-bg-${toast.type}`} role="status">
			<div class="toast-body">{toast.message}</div>
		</div>
	</div>
{/if}

{#if deleteModal.show}
	<div class="modal-backdrop" on:click={cancelDelete}></div>
	<div class="modal-dialog">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">Portion entfernen?</h5>
			</div>
			<div class="modal-body">
				<p>Möchtest du eine Portion <strong>{formatLabel(deleteModal.item?.label)}</strong> entfernen?</p>
				<p class="text-secondary small">Aktuell: {deleteModal.item?.portions} Portionen</p>
			</div>
			<div class="modal-footer">
				<button class="btn btn-secondary" on:click={cancelDelete}>Abbrechen</button>
				<button class="btn btn-danger" on:click={confirmDelete}>Entfernen</button>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		background: linear-gradient(180deg, #f7f3e9 0%, #f2efe7 55%, #ffffff 100%);
		font-family:
			system-ui,
			-apple-system,
			"Segoe UI",
			"Roboto",
			"Helvetica Neue",
			Arial,
			sans-serif;
	}

	.page-wrap {
		min-height: 100vh;
	}

	.pyramid {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		align-items: center;
	}

	.date-nav {
		display: grid;
		grid-template-columns: 2.5rem 1fr 2.5rem;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		margin: 0 auto 1.5rem;
		max-width: 320px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid rgba(0, 0, 0, 0.08);
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
	}

	.date-nav-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 999px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		background: #ffffff;
		color: #1b1b1b;
		font-weight: 700;
		font-size: 1.1rem;
		transition:
			transform 120ms ease,
			box-shadow 120ms ease;
	}

	.date-nav-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
	}

	.date-nav-date {
		text-align: center;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: #2a2a2a;
	}

	.date-nav-spacer {
		display: block;
		width: 2.25rem;
		height: 2.25rem;
	}

	.tier {
		max-width: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		transition: width 200ms ease;
	}

	.tier-grid {
		width: 100%;
		display: flex;
		flex-wrap: nowrap;
		gap: 1rem;
		justify-content: center;
	}

	.portion-card {
		position: relative;
		flex: 0 0 110px;
		height: 110px;
		border-radius: 0.9rem;
		border: 1px dashed #c9c9c9;
		background: #f2f2f2;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
		transition:
			transform 150ms ease,
			background 150ms ease;
		cursor: pointer;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.portion-card:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 12px 35px rgba(0, 0, 0, 0.1);
	}

	.portion-card:active:not(:disabled) {
		transform: translateY(0);
	}

	.portion-card:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.portion-card.filled {
		background: linear-gradient(135deg, #f6d59a, #f1b758);
		border-color: #e5a74b;
	}

	.portion-card.filled:hover:not(:disabled) {
		background: linear-gradient(135deg, #f8d9a8, #f3c068);
	}

	.portion-card.empty {
		opacity: 0.7;
	}

	.portion-icon {
		width: 100%;
		height: 100%;
		object-fit: contain;
		padding: 8px;
		opacity: 0.85;
		transition: opacity 150ms ease;
	}

	.portion-card.filled .portion-icon {
		opacity: 1;
	}

	.portion-card.empty .portion-icon {
		opacity: 0.35;
	}

	.legend {
		margin-top: 3rem;
		width: 100%;
		max-width: 900px;
		padding: 2rem 1rem;
		background: rgba(255, 255, 255, 0.4);
		border-radius: 1rem;
	}

	.legend-title {
		text-align: center;
		font-size: 1rem;
		font-weight: 600;
		color: #4a3c2f;
		margin-bottom: 2rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.legend-items {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.legend-row {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}

	.legend-row:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.legend-icon-row {
		width: 100px;
		height: 100px;
		object-fit: contain;
		flex-shrink: 0;
	}

	.legend-content {
		flex: 1;
	}

	.legend-category {
		font-size: 0.95rem;
		font-weight: 600;
		color: #4a3c2f;
		margin: 0 0 0.5rem 0;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.legend-description {
		font-size: 0.85rem;
		color: #666666;
		margin: 0;
		line-height: 1.5;
	}

	.excess-badge {
		position: absolute;
		bottom: 8px;
		right: 10px;
		font-size: 1.5rem;
		font-weight: bold;
		color: #000000;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.delete-btn {
		position: absolute;
		top: 6px;
		right: 6px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #dc2626;
		color: white;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		padding: 0;
		--webkit-appearance: none;
		appearance: none;
		transition:
			background 150ms ease,
			transform 100ms ease;
		z-index: 10;
	}

	.delete-icon {
		width: 18px;
		height: 18px;
		fill: none;
		stroke: currentColor;
	}

	.delete-btn:hover {
		background: #b91c1c;
		transform: scale(1.15);
	}

	.delete-btn:active {
		transform: scale(0.95);
	}

	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		z-index: 1040;
		animation: fadeIn 0.15s ease;
	}

	.modal-dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 1050;
		width: 90%;
		max-width: 400px;
		animation: slideIn 0.2s ease;
	}

	.modal-content {
		background: white;
		border-radius: 0.85rem;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
		overflow: hidden;
	}

	.modal-header {
		padding: 1.25rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.modal-body {
		padding: 1.25rem;
	}

	.modal-body p {
		margin-bottom: 0.5rem;
	}

	.modal-body p:last-child {
		margin-bottom: 0;
	}

	.modal-footer {
		padding: 1rem 1.25rem;
		border-top: 1px solid #e5e7eb;
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.btn {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		border: none;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary {
		background: #e5e7eb;
		color: #374151;
	}

	.btn-secondary:hover {
		background: #d1d5db;
	}

	.btn-danger {
		background: #dc2626;
		color: white;
	}

	.btn-danger:hover {
		background: #b91c1c;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideIn {
		from {
			transform: translate(-50%, -60%);
			opacity: 0;
		}
		to {
			transform: translate(-50%, -50%);
			opacity: 1;
		}
	}

	@media (max-width: 767px) {
		.tier {
			width: 100% !important;
		}

		.tier-grid {
			gap: 0.4rem;
		}

		.portion-card {
			flex: 0 0 75px;
			height: 75px;
		}

		.portion-icon {
			padding: 5px;
		}

		.excess-badge {
			font-size: 1rem;
		}

		.legend-icon-row {
			width: 32px;
			height: 32px;
		}

		.legend-category {
			font-size: 0.8rem;
		}

		.legend-description {
			font-size: 0.75rem;
		}
	}

	@media (max-width: 412px) {
		.tier:nth-child(n + 4) {
			width: 100% !important;
		}

		.tier:nth-child(n + 4) .portion-card {
			flex: 1 1 auto;
			height: auto;
			aspect-ratio: 1;
		}

		.tier-grid {
			gap: 0.3rem;
		}

		.portion-icon {
			padding: 3px;
		}

		.excess-badge {
			font-size: 0.75rem;
			bottom: 4px;
			right: 6px;
		}

		.container {
			padding-left: 0.5rem;
			padding-right: 0.5rem;
		}
	}

	.toast {
		border-radius: 0.75rem;
	}
</style>
