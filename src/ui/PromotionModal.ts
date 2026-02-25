import { App, Modal } from 'obsidian';

export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export class PromotionModal extends Modal {
	private resolveChoice: ((value: PromotionPiece) => void) | null = null;
	private settled = false;
	private fallback: PromotionPiece = 'q';
	private readonly options: PromotionPiece[];

	constructor(app: App, color: 'w' | 'b', options: PromotionPiece[]) {
		super(app);
		this.options = options.length ? Array.from(new Set(options)) : ['q', 'r', 'b', 'n'];
		this.titleEl.textContent = color === 'w' ? 'Promote white pawn' : 'Promote black pawn';
	}

	openWithPromise(defaultChoice: PromotionPiece = 'q'): Promise<PromotionPiece> {
		this.fallback = defaultChoice;
		return new Promise<PromotionPiece>((resolve) => {
			this.resolveChoice = (value: PromotionPiece) => {
				this.settled = true;
				resolve(value);
			};
			this.open();
		});
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass('ct-promotion-modal');

		const description = contentEl.createEl('p', {
			text: 'Choose the piece to promote to:'
		});
		description.addClass('ct-promotion-description');

		const grid = contentEl.createDiv('ct-promotion-options');

		const labels: Record<PromotionPiece, string> = {
			q: 'Queen',
			r: 'Rook',
			b: 'Bishop',
			n: 'Knight'
		};

		for (const option of this.options) {
			const button = grid.createEl('button', { cls: 'ct-promotion-option', text: labels[option] ?? option.toUpperCase() });
			button.addEventListener('click', () => {
				if (this.resolveChoice) {
					this.resolveChoice(option);
				}
				this.close();
			});
		}

		const cancel = contentEl.createEl('button', { cls: 'ct-promotion-cancel', text: 'Cancel (queen)' });
		cancel.addEventListener('click', () => {
			this.close();
		});
	}

	onClose(): void {
		if (!this.settled && this.resolveChoice) {
			this.resolveChoice(this.fallback);
		}
		this.resolveChoice = null;
		this.settled = false;
		this.contentEl.empty();
	}
}

