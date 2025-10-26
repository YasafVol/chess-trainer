# Obsidian Modal Reference (from https://docs.obsidian.md/Plugins/User+interface/Modals)

Key points for implementing modals inside Obsidian plugins:

- Extend `Modal` from the Obsidian API rather than creating standalone DOM overlays. Instantiate with `new MyModal(app)` and open via `.open()`.
- Override `onOpen()` to populate `this.contentEl` with your UI. Obsidian automatically inserts the modal shell and handles background dimming, focus management, and escape-to-close.
- Override `onClose()` to clean up any listeners or timers and call `this.contentEl.empty()` if you injected custom elements.
- Use `this.titleEl` for headings if you want the built-in modal header, or add headers manually to `contentEl`.
- Leverage Obsidian theme variables (`var(--background-primary)`, `var(--interactive-accent)`, etc.) so the modal respects user themes.
- Use the provided buttons/layout helpers or standard HTML elements; Obsidian ensures keyboard accessibility.

This plugin should rely on the Modal class instead of duplicating modal scaffolding so we inherit Obsidian's lifecycle, accessibility, and styling.
