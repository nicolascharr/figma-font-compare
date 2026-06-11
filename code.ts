// FontCompare — logique backend Figma
// Compile avec : npx tsc  (typings : @figma/plugin-typings)

figma.showUI(__html__, { width: 780, height: 620, themeColors: true });

interface FamilyEntry {
  family: string;
  styles: string[];
}

interface SelectedFont {
  family: string;
  style: string;
}

interface Collection {
  id: string;
  name: string;
  fonts: SelectedFont[];
}

type UIMessage =
  | { type: 'init' }
  | { type: 'create-nodes'; text: string; fontSize: number; fonts: SelectedFont[] }
  | { type: 'save-collections'; collections: Collection[] };

// Regroupe la liste plate renvoyée par listAvailableFontsAsync
// (un Font par couple famille/style) en familles avec leurs styles.
async function collectFamilies(): Promise<FamilyEntry[]> {
  const fonts: Font[] = await figma.listAvailableFontsAsync();
  const byFamily = new Map<string, string[]>();

  for (const font of fonts) {
    const { family, style } = font.fontName;
    const styles = byFamily.get(family);
    if (styles) {
      if (styles.indexOf(style) === -1) styles.push(style);
    } else {
      byFamily.set(family, [style]);
    }
  }

  const families: FamilyEntry[] = [];
  byFamily.forEach((styles, family) => families.push({ family, styles }));
  families.sort((a, b) => a.family.localeCompare(b.family));
  return families;
}

async function createTextNodes(text: string, fontSize: number, fonts: SelectedFont[]): Promise<void> {
  const created: TextNode[] = [];
  const failed: string[] = [];

  const startX = figma.viewport.center.x;
  let y = figma.viewport.center.y;
  const gap = Math.max(24, Math.round(fontSize * 0.75));

  for (let i = 0; i < fonts.length; i++) {
    const fontName: FontName = { family: fonts[i].family, style: fonts[i].style };

    try {
      await figma.loadFontAsync(fontName);
    } catch (e) {
      failed.push(`${fontName.family} (${fontName.style})`);
      figma.ui.postMessage({ type: 'progress', done: i + 1, total: fonts.length });
      continue;
    }

    const node = figma.createText();
    // fontName d'abord : characters/fontSize exigent que la police COURANTE
    // du nœud soit chargée, et on vient justement de charger celle-ci.
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
    figma.notify(`✓ ${created.length} police${created.length > 1 ? 's' : ''} ajoutée${created.length > 1 ? 's' : ''} au canvas`);
  } else {
    figma.notify(
      `${created.length} ajoutée(s) · ${failed.length} introuvable(s) : ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '…' : ''}`,
      { error: true, timeout: 5000 }
    );
  }

  figma.ui.postMessage({ type: 'create-done', created: created.length, failed: failed.length });
}

figma.ui.onmessage = async (msg: UIMessage) => {
  if (msg.type === 'init') {
    // clientStorage : persistant à travers tous les fichiers Figma,
    // propre à l'utilisateur et au plugin, local à la machine.
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
      figma.notify('Aucune police sélectionnée', { error: true });
      return;
    }
    await createTextNodes(msg.text, msg.fontSize, msg.fonts);
  }
};
