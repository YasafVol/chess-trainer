/**
 * PGN Import Modal with real-time validation
 * Provides UI for importing chess games in PGN format
 */

import { App, Modal } from 'obsidian';
import { validatePgn, PgnValidationResult } from '../services/pgnValidator';
import { logInfo, logError } from '../util/logger';

export interface ImportModalOptions {
	title?: string;
	placeholder?: string;
	allowMultiple?: boolean;
}

export class ImportModal extends Modal {
	private pgnInput: HTMLTextAreaElement;
	private submitButton: HTMLButtonElement;
	private validationResult: PgnValidationResult | null = null;
	private onSubmit: (pgn: string) => void;
	private options: ImportModalOptions;

	constructor(app: App, onSubmit: (pgn: string) => void, options: ImportModalOptions = {}) {
		super(app);
		this.onSubmit = onSubmit;
		this.options = {
			title: 'Import PGN',
			placeholder: 'Paste your chess game in PGN format here...',
			allowMultiple: false,
			...options
		};
	}

	onOpen(): void {
		this.renderContent();
		logInfo('Import modal opened');
	}

	onClose(): void {
		this.contentEl.empty();
		logInfo('Import modal closed');
	}

	private renderContent(): void {
		this.contentEl.empty();

		// Modal header
		const header = this.contentEl.createEl('h2', { text: this.options.title! });

		// Description
		this.contentEl.createEl('p', {
			text: 'Paste a chess game in Portable Game Notation (PGN) format. The game should include player names and moves.'
		});

		// Input container
		const inputContainer = this.contentEl.createDiv();
		
		// PGN textarea
		this.pgnInput = document.createElement('textarea');
		this.pgnInput.rows = 10;
		this.pgnInput.spellcheck = false;
		this.pgnInput.placeholder = this.options.placeholder!;
		this.pgnInput.style.width = '100%';
		this.pgnInput.style.minHeight = '150px';
		this.pgnInput.style.padding = '10px';
		this.pgnInput.style.border = 'none';
		this.pgnInput.style.borderRadius = '4px';
		this.pgnInput.style.backgroundColor = 'var(--background-secondary)';
		this.pgnInput.style.color = 'var(--text-normal)';
		this.pgnInput.style.fontFamily = 'monospace';
		
		inputContainer.appendChild(this.pgnInput);

		// Button container
		const buttonContainer = document.createElement('div');
		buttonContainer.style.marginTop = '20px';
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '10px';

		// Submit button
		this.submitButton = document.createElement('button');
		this.submitButton.textContent = 'Import';
		this.submitButton.className = 'ct-submit-button';
		this.submitButton.style.padding = '10px 20px';
		this.submitButton.addEventListener('click', () => {
			this.handleSubmit();
		});

		// Cancel button
		const cancelButton = document.createElement('button');
		cancelButton.textContent = 'Cancel';
		cancelButton.className = 'ct-cancel-button';
		cancelButton.style.padding = '10px 20px';


		cancelButton.addEventListener('click', () => {
			this.close();
		});

		buttonContainer.appendChild(this.submitButton);
		buttonContainer.appendChild(cancelButton);
		// Add all elements to content
		this.contentEl.appendChild(inputContainer);
		// Validation status container - always reserve space to prevent layout jumps
		const statusContainer = document.createElement('div');
		statusContainer.style.minHeight = '24px';
		statusContainer.style.marginTop = '8px';
		statusContainer.style.marginBottom = '8px';
		const statusIcon = document.createElement('span');
		statusIcon.className = 'validation-icon';
		const statusText = document.createElement('span');
		statusText.className = 'validation-text';
		statusContainer.appendChild(statusIcon);
		statusContainer.appendChild(statusText);

		this.contentEl.appendChild(statusContainer);
		this.contentEl.appendChild(buttonContainer);

		// Real-time validation
		let validationTimeout: number;
		this.pgnInput.addEventListener('input', () => {
			if (validationTimeout) {
				clearTimeout(validationTimeout);
			}
			validationTimeout = window.setTimeout(() => {
				this.validatePgnInput(statusIcon, statusText);
			}, 300);
		});

		// Initial validation now that submit button exists
		this.validatePgnInput(statusIcon, statusText);

		// Focus on input
		this.pgnInput.focus();
	}

	/**
	 * Validate: current PGN input and update UI
	 */
	private validatePgnInput(statusIcon: HTMLSpanElement, statusText: HTMLSpanElement): void {
		const pgn = this.pgnInput.value.trim();
		
		if (!pgn) {
			this.validationResult = null;
			this.updateValidationStatus(statusIcon, statusText, 'empty', '');
			this.updateSubmitButton(false);
			return;
		}

		this.validationResult = validatePgn(pgn);
		
		if (this.validationResult.isValid) {
			this.updateValidationStatus(statusIcon, statusText, 'valid', 'Valid PGN');
			if (this.validationResult.warnings && this.validationResult.warnings.length > 0) {
				// Add warnings
				const existingWarnings = statusText.parentElement?.querySelectorAll('.warning-item');
				if (existingWarnings) {
					existingWarnings.forEach(warning => warning.remove());
				}
				
				const warningContainer = document.createElement('div');
				this.validationResult.warnings.forEach(warning => {
					const warningDiv = document.createElement('div');
					warningDiv.textContent = `⚠️ ${warning}`;
					warningDiv.className = 'warning-item';
					warningDiv.style.marginTop = '5px';
					warningDiv.style.fontSize = '0.9em';
					warningDiv.style.color = 'var(--text-warning)';
					warningContainer.appendChild(warningDiv);
				});
				statusText.parentElement?.appendChild(warningContainer);
			}
			this.updateSubmitButton(true);
		} else {
			const errorMessage = this.validationResult.error?.message || 'Invalid PGN';
			this.updateValidationStatus(statusIcon, statusText, 'error', errorMessage);
			this.updateSubmitButton(false);
		}
	}

	/**
	 * Update validation status display
	 */
	private updateValidationStatus(
		icon: HTMLSpanElement, 
		text: HTMLSpanElement, 
		status: 'empty' | 'valid' | 'error' | 'validating',
		message: string
	): void {
		// Remove existing classes
		icon.className = 'validation-icon';
		text.className = 'validation-text';
		
		// Remove existing warnings
		const existingWarnings = text.parentElement?.querySelectorAll('.warning-item');
		if (existingWarnings) {
			existingWarnings.forEach(warning => warning.remove());
		}

		// Always show container (reserves space), but hide content when empty
		const hasMessage = Boolean(message);
		if (text.parentElement) {
			// Container always visible to reserve space
			text.parentElement.style.visibility = hasMessage ? 'visible' : 'hidden';
		}

		switch (status) {
			case 'empty':
				icon.textContent = '📝';
				icon.style.color = 'var(--text-muted)';
				text.textContent = message;
				text.style.color = 'var(--text-muted)';
				break;
			case 'valid':
				icon.textContent = '✅';
				icon.style.color = 'var(--text-success)';
				text.textContent = message;
				text.style.color = 'var(--text-success)';
				break;
			case 'error':
				icon.textContent = '❌';
				icon.style.color = 'var(--text-error)';
				text.textContent = message;
				text.style.color = 'var(--text-error)';
				break;
			case 'validating':
				icon.textContent = '⏳';
				icon.style.color = 'var(--text-muted)';
				text.textContent = 'Validating...';
				text.style.color = 'var(--text-muted)';
				break;
		}
	}

	/**
	 * Update submit button state
	 */
	private updateSubmitButton(enabled: boolean): void {
		this.submitButton.disabled = !enabled;
		
		if (enabled) {
			this.submitButton.style.backgroundColor = 'var(--interactive-accent)';
			this.submitButton.style.color = 'white';
			this.submitButton.style.cursor = 'pointer';
		} else {
			this.submitButton.style.backgroundColor = 'var(--background-secondary)';
			this.submitButton.style.color = 'var(--text-normal)';
			this.submitButton.style.opacity = '0.6';
			this.submitButton.style.cursor = 'not-allowed';
		}
	}

	/**
	 * Handle form submission
	 */
	private handleSubmit(): void {
		const pgn = this.pgnInput.value.trim();
		
		if (!pgn) {
			logError('No PGN provided for import');
			return;
		}

		if (!this.validationResult?.isValid) {
			logError('Attempted to submit invalid PGN');
			// Shake modal to indicate error
			this.contentEl.style.animation = 'shake 0.5s';
			setTimeout(() => {
				this.contentEl.style.animation = '';
			}, 500);
			return;
		}

		logInfo(`Submitting PGN for import (${pgn.length} characters)`);
		
		try {
			this.onSubmit(pgn);
			this.close();
		} catch (error) {
			logError('Failed to process PGN import', error);
			// Keep modal open on error
		}
	}

	/**
	 * Get: current PGN value
	 */
	public getPgn(): string {
		return this.pgnInput.value.trim();
	}

	/**
	 * Set PGN value programmatically
	 */
	public setPgn(pgn: string): void {
		this.pgnInput.value = pgn;
		const statusIcon = this.contentEl.querySelector('.validation-icon') as HTMLSpanElement;
		const statusText = this.contentEl.querySelector('.validation-text') as HTMLSpanElement;
		this.validatePgnInput(statusIcon, statusText);
	}

	/**
	 * Get validation result
	 */
	public getValidationResult(): PgnValidationResult | null {
		return this.validationResult;
	}
}

/**
 * Quick import function for programmatic use
 * @param app - Obsidian App instance
 * @param pgn - PGN string to import
 * @returns Promise that resolves when import is complete
 */
export function quickImport(app: any, pgn: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const modal = new ImportModal(app, (importedPgn) => {
			resolve(importedPgn);
		});
		
		// Set: PGN and auto-submit if valid
		modal.setPgn(pgn);
		const validationResult = modal.getValidationResult();
		
		if (validationResult?.isValid) {
			setTimeout(() => {
				resolve(pgn);
				modal.close();
			}, 100);
		} else {
			modal.open();
			// Reject if user closes modal without valid input
			const originalClose = modal.close.bind(modal);
			modal.close = () => {
				reject(new Error('Import cancelled'));
				originalClose();
			};
		}
	});
}
