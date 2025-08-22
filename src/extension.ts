// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { CssVarHintPanel } from "./var-hint-panel";

const directoriesToIgnore = ["bower_components", "node_modules", "www", "platforms", "dist", ".git", ".idea", "build", "server"];

interface CssVarInfo {
  val: string;
  file: vscode.Uri;
  line: number;
}

const cssVars = new Map<string, CssVarInfo>();
let contextCopy: any;
let updateCommand = false;

const cssExtensions = new Set([".css", ".scss", ".sass", ".less", ".pcss", ".postcss", ".sss"]);
const isCssFile = (fileName: string) => cssExtensions.has(path.extname(fileName));

function getAllVariable(urlPath: string): void {
  const pathDir = path.join(urlPath);
  const currentDirectory = fs.readdirSync(pathDir, { withFileTypes: true });

  for (const item of currentDirectory) {
    if (item.isDirectory() && !directoriesToIgnore.includes(item.name)) {
      getAllVariable(path.join(pathDir, item.name));
    }
    if (isCssFile(item.name)) {
      const filePath = path.join(pathDir, item.name);
      const content = fs.readFileSync(filePath, "utf8");
      updateCssVarFromChunk(content, filePath, item.name);
    }
  }
}

function updateCssVarFromChunk(chunk: string, filePath: string, fileName: string) {
  const cssVarsItems: vscode.CompletionItem[] = [];
  const lines = chunk.split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineTrim = line.trim();
    if (lineTrim.length && lineTrim.startsWith("--")) {
      const [cssVar, val] = lineTrim.split(":");
      if (val) {
        const kind =
          val.trim().startsWith("#") || val.trim().startsWith("rgba") || val.trim().startsWith("hsl") || val.trim().startsWith("hsla") || val.trim().startsWith("rgb")
            ? 15
            : undefined;
        const hint = new vscode.CompletionItem(cssVar, kind);
        hint.detail = `${val}`;
        hint.documentation = new vscode.MarkdownString(`[${fileName}](${vscode.Uri.file(filePath)})`);
        cssVarsItems.push(hint);
        cssVars.set(cssVar, { val, file: vscode.Uri.file(filePath), line: index });
      }
    }
  });
  const auto = vscode.languages.registerCompletionItemProvider(["css", "scss", "sass", "less", "postcss"], {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
      return cssVarsItems;
    },
  });

  contextCopy.subscriptions.push(auto);
  if (cssVars.size > 0 && updateCommand) {
    vscode.window.showInformationMessage(`Update ${cssVars.size} CSS variables`);
    updateCommand = false;
  }
  return true;
}

export function activate(context: vscode.ExtensionContext) {
  contextCopy = context;

  const run = () => {
    if (vscode.workspace.workspaceFolders?.length) {
      for (const workspace of vscode.workspace.workspaceFolders) {
        getAllVariable(workspace.uri.fsPath);
      }
    }
  };

  const dispatch = vscode.commands.registerCommand("css-var-hint.refresh", () => {
    updateCommand = true;
    run();
  });

  contextCopy.subscriptions.push(
    vscode.commands.registerCommand("varHint.showPanel", () => {
      CssVarHintPanel.createOrShow(context.extensionUri, cssVars);
    })
  );

  contextCopy.subscriptions.push(
    vscode.commands.registerCommand("varHint.updatePanel", () => {
      run();
      CssVarHintPanel.createOrShow(context.extensionUri, cssVars);
    })
  );

  contextCopy.subscriptions.push(dispatch);

  const hover = vscode.languages.registerHoverProvider(["css", "scss", "less", "postcss"], {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position, /--[\w-]+/);
      if (!range) {
        return;
      }
      const name = document.getText(range);
      const data = cssVars.get(name);
      if (!data) {
        return;
      }
      const value = data.val.trim().replace(/;$/, "");
      const md = new vscode.MarkdownString();
      md.isTrusted = true;
      const link = data.file.with({ fragment: `L${data.line + 1}` });
      md.appendMarkdown(`[${name}](${link.toString()})`);
      md.appendText(`: ${value}`);
      if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value) || /^rgba?\(/.test(value) || /^hsla?\(/.test(value)) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><rect width="12" height="12" fill="${value}" stroke="black"/></svg>`;
        const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
        md.appendMarkdown(`\n\n![color](${dataUrl})`);
      }
      return new vscode.Hover(md);
    },
  });
  contextCopy.subscriptions.push(hover);

  const definition = vscode.languages.registerDefinitionProvider(["css", "scss", "less", "postcss"], {
    provideDefinition(document, position) {
      const range = document.getWordRangeAtPosition(position, /--[\w-]+/);
      if (!range) {
        return;
      }
      const name = document.getText(range);
      const data = cssVars.get(name);
      if (!data) {
        return;
      }
      return new vscode.Location(data.file, new vscode.Position(data.line, 0));
    },
  });
  contextCopy.subscriptions.push(definition);

  run();
  vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
    if (isCssFile(e.fileName)) {
      const text = e.getText();
      const filePath = e.uri.fsPath;
      const fileName = path.basename(e.fileName);
      updateCssVarFromChunk(text, filePath, fileName);
    }
  });
}

// this method is called when your extension is deactivated
export function deactivate() {}
