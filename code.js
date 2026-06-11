"use strict";
// Font Stack — Figma backend logic
// Build with: npx tsc  (typings: @figma/plugin-typings)
figma.showUI(__html__, { width: 780, height: 620, themeColors: true });
// Groups the flat list returned by listAvailableFontsAsync
// (one Font per family/style pair) into families with their styles.
async function collectFamilies() {
    const fonts = await figma.listAvailableFontsAsync();
    const byFamily = new Map();
    for (const font of fonts) {
        const { family, style } = font.fontName;
        const styles = byFamily.get(family);
        if (styles) {
            if (styles.indexOf(style) === -1)
                styles.push(style);
        }
        else {
            byFamily.set(family, [style]);
        }
    }
    const families = [];
    byFamily.forEach((styles, family) => families.push({ family, styles }));
    families.sort((a, b) => a.family.localeCompare(b.family));
    return families;
}
async function createTextNodes(text, fontSize, fonts) {
    const created = [];
    const failed = [];
    const startX = figma.viewport.center.x;
    let y = figma.viewport.center.y;
    const gap = Math.max(24, Math.round(fontSize * 0.75));
    for (let i = 0; i < fonts.length; i++) {
        const fontName = { family: fonts[i].family, style: fonts[i].style };
        try {
            await figma.loadFontAsync(fontName);
        }
        catch (e) {
            failed.push(`${fontName.family} (${fontName.style})`);
            figma.ui.postMessage({ type: 'progress', done: i + 1, total: fonts.length });
            continue;
        }
        const node = figma.createText();
        // fontName first: characters/fontSize require the node's CURRENT font
        // to be loaded, and that is precisely the one just loaded above.
        node.fontName = fontName;
        node.characters = text || fontName.family;
        node.fontSize = fontSize;
        node.name = `${fontName.family} ${fontName.style}`;
        node.x = startX;
        node.y = y;
        figma.currentPage.appendChild(node);
        y += node.height + gap;
        created.push(node);
        figma.ui.postMessage({ type: 'progress', done: i + 1, total: fonts.length });
    }
    if (created.length > 0) {
        figma.currentPage.selection = created;
        figma.viewport.scrollAndZoomIntoView(created);
    }
    if (failed.length === 0) {
        figma.notify(`✓ ${created.length} font${created.length > 1 ? 's' : ''} added to canvas`);
    }
    else {
        figma.notify(`${created.length} added · ${failed.length} unavailable: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '…' : ''}`, { error: true, timeout: 5000 });
    }
    figma.ui.postMessage({ type: 'create-done', created: created.length, failed: failed.length });
}
figma.ui.onmessage = async (msg) => {
    if (msg.type === 'init') {
        // clientStorage: persists across all Figma files, scoped to the
        // user and the plugin, local to the machine.
        const [families, collections] = await Promise.all([
            collectFamilies(),
            figma.clientStorage.getAsync('collections')
        ]);
        figma.ui.postMessage({ type: 'fonts', families });
        figma.ui.postMessage({ type: 'collections', collections: collections || null });
        return;
    }
    if (msg.type === 'save-collections') {
        await figma.clientStorage.setAsync('collections', msg.collections);
        return;
    }
    if (msg.type === 'create-nodes') {
        if (msg.fonts.length === 0) {
            figma.notify('No fonts selected', { error: true });
            return;
        }
        await createTextNodes(msg.text, msg.fontSize, msg.fonts);
    }
};
