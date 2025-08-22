// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { CssVarHintPanel } from "./var-hint-panel";

const directoriesToIgnore = ["bower_components", "node_modules", "www", "platforms", "dist", ".git", ".idea", "build", "server"];

const cssVars = new Map();
let contextCopy: any;
let updateCommand = false;

const isCssFile = (fileName: string) => fileName.includes("css") || fileName.includes("scss") || fileName.includes("less");

async function getAllVariable(urlPath: string): Promise<any> {
  let reader: any = null;
  const pathDir = path.join(urlPath);
  const currentDirectory = fs.readdirSync(pathDir, { withFileTypes: true });

  currentDirectory.forEach(async (item) => {
    if (item.isDirectory() && !directoriesToIgnore.includes(item.name)) {
      getAllVariable(path.join(pathDir, item.name));
    }
    if (isCssFile(item.name)) {
      const filePath = path.join(pathDir, item.name);
      reader = fs.createReadStream(filePath);
      reader.on("data", (chunk: string) => {
        updateCssVarFromChunk(chunk.toString(), filePath, item.name);
      });
    }
  });
}

function updateCssVarFromChunk(chunk: string, filePath: string, fileName: string) {
  const cssVarsItems: vscode.CompletionItem[] = [];
  const lines = chunk.split(/\r?\n/);
  lines.forEach((line) => {
    const lineTrim = line.trim();
    if (lineTrim.length && lineTrim.startsWith("--")) {
      const [cssVar, val] = lineTrim.split(":");
      if (val && !cssVars.has(cssVar)) {
        const kind =
          val.trim().startsWith("#") || val.trim().startsWith("rgba") || val.trim().startsWith("hsl") || val.trim().startsWith("hsla") || val.trim().startsWith("rgb")
            ? 15
            : undefined;
        const hint = new vscode.CompletionItem(cssVar, kind);
        hint.detail = `${val}`;
        hint.documentation = new vscode.MarkdownString(`[${fileName}](${vscode.Uri.file(filePath)})`);
        cssVarsItems.push(hint);
        cssVars.set(cssVar, { val, file: vscode.Uri.file(filePath) });
      }
    }
  });
  const auto = vscode.languages.registerCompletionItemProvider(["css", "scss", "postcss"], {
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

  const run = async () => {
    if (vscode.workspace.workspaceFolders?.length) {
      vscode.workspace.workspaceFolders.forEach(async (workspace) => {
        await getAllVariable(workspace.uri.path);
      });
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
    vscode.commands.registerCommand("varHint.updatePanel", async () => {
      await run();
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
      const data: any = cssVars.get(name);
      if (!data) {
        return;
      }
      const value = data.val.trim().replace(/;$/, "");
      const md = new vscode.MarkdownString();
      md.appendMarkdown(`**${name}**: ${value}`);
      if (/^#([0-9a-fA-F]{3,8})$/.test(value) || /^rgba?\(/.test(value) || /^hsla?\(/.test(value)) {
        const color = encodeURIComponent(value);
        md.appendMarkdown(
          `\n\n![color](data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12'><rect width='12' height='12' fill='${color}' stroke='black'/></svg>)`
        );
      }
      return new vscode.Hover(md);
    },
  });
  contextCopy.subscriptions.push(hover);

  run();
  vscode.workspace.onDidSaveTextDocument(async (e: vscode.TextDocument) => {
    if (isCssFile(e.fileName)) {
      const text = e.getText();
      const filePath = e.uri.path;
      const fileName = path.basename(e.fileName);
      await updateCssVarFromChunk(text, filePath, fileName);
    }
  });
}

// this method is called when your extension is deactivated
export function deactivate() {}
