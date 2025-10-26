// Type declarations for Obsidian API
// This file provides basic type information for Obsidian plugin API

declare module 'obsidian' {
	export interface App {
		vault: Vault;
		workspace: Workspace;
	}

	export interface Vault {
		getAbstractFileByPath(path: string): TFile | null;
		create(path: string, content: string): Promise<TFile>;
		modify(file: TFile, content: string): Promise<void>;
		createFolder(path: string): Promise<void>;
	}

	export interface Workspace {
		getActiveViewOfType<T>(type: any): T | null;
	}

	export interface TFile {
		path: string;
	}

	export interface MarkdownPostProcessorContext {
		addCleanup(callback: () => void): void;
	}

	export class Plugin {
		app: App;
		addRibbonIcon(icon: string, title: string, callback: (evt: MouseEvent) => void): HTMLElement;
		addCommand(command: Command): void;
		registerMarkdownCodeBlockProcessor(language: string, handler: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => void): void;
		registerDomEvent(element: HTMLElement, event: string, callback: (evt: Event) => void): void;
		registerInterval(id: number): void;
		onload(): Promise<void>;
		onunload(): void;
		constructor(app: App);
	}

	export interface Command {
		id: string;
		name: string;
		callback?: () => void;
		hotkeys?: Hotkey[];
		checkCallback?: (checking: boolean) => boolean;
	}

	export interface Hotkey {
		modifiers: string[];
		key: string;
	}

	export class Modal {
		app: App;
		contentEl: HTMLElement;
		titleEl: HTMLElement;
		constructor(app: App);
		open(): void;
		close(): void;
		onOpen(): void;
		onClose(): void;
	}

	export interface Setting {
		addText(callback: (component: any) => void): Setting;
		addButton(callback: (component: any) => void): Setting;
	}

	export class Notice {
		constructor(message: string, duration?: number);
	}

	export function addIcon(id: string, svg: string): void;

	// Extended DOM interfaces for Obsidian's modified elements
	interface HTMLElement extends globalThis.HTMLElement {
		createEl<T extends keyof HTMLElementTagNameMap>(
			tag: T,
			options?: {
				text?: string;
				cls?: string;
				attr?: Record<string, string>;
			}
		): HTMLElementTagNameMap[T];
		createDiv(cls?: string): HTMLDivElement;
		createSpan(text?: string): HTMLSpanElement;
		empty(): void;
	}

	interface HTMLDivElement extends globalThis.HTMLDivElement {
		addClass(cls: string): void;
		removeClass(cls: string): void;
	}

	interface HTMLSpanElement extends globalThis.HTMLSpanElement {
		addClass(cls: string): void;
		removeClass(cls: string): void;
	}

	interface HTMLButtonElement extends globalThis.HTMLButtonElement {
		addClass(cls: string): void;
		removeClass(cls: string): void;
	}

	interface NodeListOf<TNode extends Node> {
		forEach(callbackfn: (value: TNode, key: number, parent: Node) => void): void;
	}
}
