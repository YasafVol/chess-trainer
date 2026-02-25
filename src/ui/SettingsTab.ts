/**
 * Settings Tab for Chess Trainer Plugin
 */

import { App, PluginSettingTab, Setting, Plugin } from 'obsidian';
import { ChessTrainerSettings } from '../types/settings';

const BOARD_SIZE_OPTIONS: Array<{ value: string; label: string }> = [
	{ value: 'auto', label: 'Fit note width (auto)' },
	{ value: '540', label: '540 px (compact)' },
	{ value: '600', label: '600 px' },
	{ value: '660', label: '660 px' },
	{ value: '720', label: '720 px' },
	{ value: '780', label: '780 px' },
	{ value: '840', label: '840 px' },
	{ value: '900', label: '900 px' },
	{ value: '960', label: '960 px' },
	{ value: '1020', label: '1020 px' },
	{ value: '1080', label: '1080 px (XL)' },
	{ value: '1200', label: '1200 px (max)' },
];

const MOVE_WINDOW_HEIGHT_OPTIONS: Array<{ value: string; label: string }> = [
	{ value: '140', label: '140 px (compact)' },
	{ value: '280', label: '280 px (medium)' },
	{ value: '450', label: '450 px (large)' },
	{ value: '600', label: '600 px (extra large)' },
];

export class ChessTrainerSettingsTab extends PluginSettingTab {
	plugin: Plugin & { settings: ChessTrainerSettings; saveSettings: () => Promise<void> };

	constructor(app: App, plugin: Plugin & { settings: ChessTrainerSettings; saveSettings: () => Promise<void> }) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Chess Trainer Settings' });

		// Analysis settings section
		containerEl.createEl('h3', { text: 'Analysis settings' });

		new Setting(containerEl)
			.setName('Enable analysis')
			.setDesc('Enable automatic game analysis using Stockfish companion service')
			.addToggle((toggle: any) => {
				toggle
					.setValue(this.plugin.settings.analysisEnabled)
					.onChange(async (value: boolean) => {
						this.plugin.settings.analysisEnabled = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Service URL')
			.setDesc('URL of the Stockfish companion service (default: http://localhost:9898)')
			.addText((text: any) => {
				text
					.setPlaceholder('http://localhost:9898')
					.setValue(this.plugin.settings.serviceUrl)
					.onChange(async (value: string) => {
						this.plugin.settings.serviceUrl = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Default depth')
			.setDesc('Default analysis depth (1-30, higher = more accurate but slower)')
			.addSlider((slider: any) => {
				slider
					.setLimits(1, 30, 1)
					.setValue(this.plugin.settings.defaultDepth)
					.setDynamicTooltip()
					.onChange(async (value: number) => {
						this.plugin.settings.defaultDepth = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Default multi-PV')
			.setDesc('Number of principal variations to analyze (1-10, higher = more alternatives)')
			.addSlider((slider: any) => {
				slider
					.setLimits(1, 10, 1)
					.setValue(this.plugin.settings.defaultMultiPV)
					.setDynamicTooltip()
					.onChange(async (value: number) => {
						this.plugin.settings.defaultMultiPV = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Default movetime (ms)')
			.setDesc('Default time limit in milliseconds (0 = use depth instead)')
			.addText((text: any) => {
				text
					.setPlaceholder('0')
					.setValue(this.plugin.settings.defaultMovetimeMs.toString())
					.onChange(async (value: string) => {
						const numValue = parseInt(value, 10);
						if (!isNaN(numValue) && numValue >= 0) {
							this.plugin.settings.defaultMovetimeMs = numValue;
							await this.plugin.saveSettings();
						}
					});
			});

		// Engine strength settings
		containerEl.createEl('h3', { text: 'Engine strength' });

		new Setting(containerEl)
			.setName('Limit engine strength')
			.setDesc('Limit Stockfish strength for training purposes (default: 2400 Elo)')
			.addToggle((toggle: any) => {
				toggle
					.setValue(this.plugin.settings.limitStrength)
					.onChange(async (value: boolean) => {
						this.plugin.settings.limitStrength = value;
						await this.plugin.saveSettings();
						this.display(); // Refresh to enable/disable dependent settings
					});
			});

		new Setting(containerEl)
			.setName('Engine Elo rating')
			.setDesc('Target Elo rating when strength is limited (1000-3200)')
			.addSlider((slider: any) => {
				slider
					.setLimits(1000, 3200, 50)
					.setValue(this.plugin.settings.defaultEngineElo)
					.setDynamicTooltip()
					.setDisabled(!this.plugin.settings.limitStrength)
					.onChange(async (value: number) => {
						this.plugin.settings.defaultEngineElo = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Engine skill level')
			.setDesc('Skill level when using skill-based limiting (0-20, lower = weaker)')
			.addSlider((slider: any) => {
				slider
					.setLimits(0, 20, 1)
					.setValue(this.plugin.settings.defaultEngineSkill)
					.setDynamicTooltip()
					.setDisabled(!this.plugin.settings.limitStrength)
					.onChange(async (value: number) => {
						this.plugin.settings.defaultEngineSkill = value;
						await this.plugin.saveSettings();
					});
			});

		// Evaluation breakdown visibility settings
		containerEl.createEl('h3', { text: 'Evaluation breakdown display' });

		const breakdownCategories = [
			{ key: 'material' as const, label: 'Material' },
			{ key: 'pawns' as const, label: 'Pawns' },
			{ key: 'kingSafety' as const, label: 'King safety' },
			{ key: 'mobility' as const, label: 'Mobility' },
			{ key: 'space' as const, label: 'Space' },
			{ key: 'threats' as const, label: 'Threats' },
		];

		for (const category of breakdownCategories) {
			new Setting(containerEl)
				.setName(`Show ${category.label}`)
				.setDesc(`Display ${category.label.toLowerCase()} component in evaluation breakdown`)
				.addToggle((toggle: any) => {
					toggle
						.setValue(this.plugin.settings.showEvalBreakdown[category.key])
						.onChange(async (value: boolean) => {
							this.plugin.settings.showEvalBreakdown[category.key] = value;
							await this.plugin.saveSettings();
						});
				});
		}
		containerEl.createEl('h3', { text: 'Board display' });

		new Setting(containerEl)
			.setName('Board size')
			.setDesc('Set the width and height of the rendered board in pixels')
			.addDropdown((dropdown: any) => {
				BOARD_SIZE_OPTIONS.forEach((option) => {
					dropdown.addOption(option.value, option.label);
				});
				const currentValue = this.plugin.settings.boardSizePx && this.plugin.settings.boardSizePx > 0
					? this.plugin.settings.boardSizePx.toString()
					: 'auto';
				dropdown.setValue(currentValue);
				dropdown.onChange(async (value: string) => {
					if (value === 'auto') {
						this.plugin.settings.boardSizePx = 0;
					} else {
						const parsedValue = parseInt(value, 10);
						if (!Number.isNaN(parsedValue) && parsedValue > 0) {
							this.plugin.settings.boardSizePx = parsedValue;
						}
					}
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Move window height')
			.setDesc('Set the height of the move viewer window in pixels')
			.addDropdown((dropdown: any) => {
				MOVE_WINDOW_HEIGHT_OPTIONS.forEach((option) => {
					dropdown.addOption(option.value, option.label);
				});
				const currentValue = this.plugin.settings.moveWindowHeightPx.toString();
				dropdown.setValue(currentValue);
				dropdown.onChange(async (value: string) => {
					const parsedValue = parseInt(value, 10);
					if (!Number.isNaN(parsedValue) && parsedValue > 0) {
						this.plugin.settings.moveWindowHeightPx = parsedValue;
						await this.plugin.saveSettings();
					}
				});
			});

		// Instructions
		containerEl.createEl('h3', { text: 'Setup instructions' });
		const instructionsEl = containerEl.createEl('div');
		instructionsEl.innerHTML = `
			<p>To use game analysis, you need to run the Stockfish companion service:</p>
			<ol>
				<li>Install Stockfish binary (see <code>stockfish-service/README.md</code>)</li>
				<li>Navigate to the <code>stockfish-service</code> directory</li>
				<li>Run <code>npm install</code> and <code>npm start</code></li>
				<li>Ensure the service URL matches the port shown above</li>
			</ol>
			<p>For more details, see the companion service README.</p>
		`;
	}
}
