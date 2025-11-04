/**
 * Settings Tab for Chess Trainer Plugin
 */

import { App, PluginSettingTab, Setting, Plugin } from 'obsidian';
import { ChessTrainerSettings } from '../types/settings';

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

		// Analysis Settings Section
		containerEl.createEl('h3', { text: 'Analysis Settings' });

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

		// Instructions
		containerEl.createEl('h3', { text: 'Setup Instructions' });
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

