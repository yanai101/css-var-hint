import * as vscode from "vscode";
import * as path from "path";
import { CssVarHintPanel } from "./var-hint-panel";

const directoriesToIgnore = ["bower_components", "node_modules", "www", "platforms", "dist", ".git", ".idea", "build", "server"];
interface CssVarInfo {
  value: string;
  file: vscode.Uri;
  line: number;
  fileName: string;
}

const cssVariables = new Map<string, CssVarInfo>();
const fileToVariables = new Map<string, Set<string>>();

const cssFileExtensions = ["css", "scss", "sass", "less", "pcss", "postcss", "sss"];
const cssLanguages = ["css", "scss", "sass", "less", "postcss"];

const isCssFile = (fileName: string) => {
  const extension = path.extname(fileName).toLowerCase().replace(/^\./, "");
  return cssFileExtensions.includes(extension);
};

const colorValueRegex = /^#(?:[0-9a-f]{3,8})$|^rgba?\(|^hsla?\(/i;

const includePattern = `**/*.{${cssFileExtensions.join(",")}}`;
const excludePattern = `{${directoriesToIgnore.map((dir) => `**/${dir}/**`).join(",")}}`;

function createMarkdownLink(name: string, info: CssVarInfo) {
  const link = info.file.with({ fragment: `L${info.line + 1}` }).toString();
  const markdown = new vscode.MarkdownString(`[${name}](${link})`);
  markdown.isTrusted = true;
  markdown.appendText(`: ${info.value}`);
  if (colorValueRegex.test(info.value)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><rect width="12" height="12" fill="${info.value}" stroke="black"/></svg>`;
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    markdown.appendMarkdown(`\n\n![color swatch](${dataUrl})`);
  }
  return markdown;
}

function createCompletionItem(name: string, info: CssVarInfo) {
  const kind = colorValueRegex.test(info.value) ? vscode.CompletionItemKind.Color : vscode.CompletionItemKind.Variable;
  const item = new vscode.CompletionItem(name, kind);
  item.detail = info.value;
  const link = info.file.with({ fragment: `L${info.line + 1}` }).toString();
  const markdown = new vscode.MarkdownString(`[${info.fileName}](${link})`);
  markdown.isTrusted = true;
  item.documentation = markdown;
  return item;
}

function extractVariablesFromText(text: string, uri: vscode.Uri): Map<string, CssVarInfo> {
  const variables = new Map<string, CssVarInfo>();
  const lines = text.split(/\r?\n/);
  const lineRegex = /--([\w-]+)\s*:\s*([^;]+);?/g;

  lines.forEach((line, index) => {
    let match: RegExpExecArray | null;
    while ((match = lineRegex.exec(line))) {
      const name = `--${match[1]}`;
      const value = match[2].trim().replace(/\s*!important$/i, "");
      if (!value) {
        continue;
      }
      variables.set(name, {
        value,
        file: uri,
        line: index,
        fileName: path.basename(uri.fsPath),
      });
    }
    lineRegex.lastIndex = 0;
  });

  return variables;
}

function removeVariablesForFile(uri: vscode.Uri) {
  const key = uri.toString();
  const variables = fileToVariables.get(key);
  if (!variables) {
    return;
  }
  for (const name of variables) {
    cssVariables.delete(name);
  }
  fileToVariables.delete(key);
  markPanelForRefresh();
}

function markPanelForRefresh() {
  CssVarHintPanel._needRefresh = true;
}

function updateVariablesForFile(uri: vscode.Uri, text: string) {
  removeVariablesForFile(uri);
  const variables = extractVariablesFromText(text, uri);
  const names = new Set<string>();
  for (const [name, info] of variables) {
    cssVariables.set(name, info);
    names.add(name);
  }
  if (names.size) {
    fileToVariables.set(uri.toString(), names);
  }
  markPanelForRefresh();
}

async function readFile(uri: vscode.Uri) {
  const buffer = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(buffer).toString("utf8");
}

async function refreshWorkspace() {
  cssVariables.clear();
  fileToVariables.clear();
  const files = await vscode.workspace.findFiles(includePattern, excludePattern);
  await Promise.all(
    files.map(async (file) => {
      try {
        const text = await readFile(file);
        updateVariablesForFile(file, text);
      } catch (error) {
        console.error(`css-var-hint: failed to read ${file.fsPath}`, error);
      }
    })
  );
  markPanelForRefresh();
  return cssVariables.size;
}

export async function activate(context: vscode.ExtensionContext) {
  const completionProvider = vscode.languages.registerCompletionItemProvider(cssLanguages, {
    provideCompletionItems() {
      return Array.from(cssVariables.entries()).map(([name, info]) => createCompletionItem(name, info));
    },
  });

  context.subscriptions.push(completionProvider);

  const hover = vscode.languages.registerHoverProvider(cssLanguages, {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position, /--[\w-]+/);
      if (!range) {
        return;
      }
      const name = document.getText(range);
      const info = cssVariables.get(name);
      if (!info) {
        return;
      }
      return new vscode.Hover(createMarkdownLink(name, info));
    },
  });

  context.subscriptions.push(hover);

  const definition = vscode.languages.registerDefinitionProvider(cssLanguages, {
    provideDefinition(document, position) {
      const range = document.getWordRangeAtPosition(position, /--[\w-]+/);
      if (!range) {
        return;
      }
      const name = document.getText(range);
      const info = cssVariables.get(name);
      if (!info) {
        return;
      }
      return new vscode.Location(info.file, new vscode.Position(info.line, 0));
    },
  });

  context.subscriptions.push(definition);

  async function runFullRefresh(showMessage: boolean) {
    const total = await refreshWorkspace();
    if (showMessage) {
      void vscode.window.showInformationMessage(`Indexed ${total} CSS variables`);
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("css-var-hint.refresh", async () => {
      await runFullRefresh(true);
      CssVarHintPanel.createOrShow(context.extensionUri, cssVariables);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("varHint.showPanel", () => {
      CssVarHintPanel.createOrShow(context.extensionUri, cssVariables);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("varHint.updatePanel", async () => {
      await runFullRefresh(false);
      CssVarHintPanel.createOrShow(context.extensionUri, cssVariables);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (!isCssFile(document.fileName)) {
        return;
      }
      updateVariablesForFile(document.uri, document.getText());
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCreateFiles(async (event) => {
      await Promise.all(
        event.files
          .filter((file) => isCssFile(file.fsPath))
          .map(async (file) => {
            try {
              const text = await readFile(file);
              updateVariablesForFile(file, text);
            } catch (error) {
              console.error(`css-var-hint: failed to process created file ${file.fsPath}`, error);
            }
          })
      );
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidRenameFiles(async (event) => {
      await Promise.all(
        event.files.map(async ({ oldUri, newUri }) => {
          removeVariablesForFile(oldUri);
          if (!isCssFile(newUri.fsPath)) {
            return;
          }
          try {
            const text = await readFile(newUri);
            updateVariablesForFile(newUri, text);
          } catch (error) {
            console.error(`css-var-hint: failed to process renamed file ${newUri.fsPath}`, error);
          }
        })
      );
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidDeleteFiles((event) => {
      for (const file of event.files) {
        removeVariablesForFile(file);
      }
    })
  );

  await runFullRefresh(false);
}

export function deactivate() {
  cssVariables.clear();
  fileToVariables.clear();
}
