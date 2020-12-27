// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";

const directoriesToIgnore = ["bower_components", "node_modules", "www", "platforms", "dist", ".git", ".idea", "build", "server"];

const cssVars = new Map();
let contextCopy: any;
let updateCommand = false;

async function getAllVariable(urlPath: string): Promise<any> {
  let reader: any = null;
  const pathDir = path.join(urlPath);
  const currentDirectory = fs.readdirSync(pathDir, { withFileTypes: true });

  currentDirectory.forEach(async (item) => {
    if (item.isDirectory() && !directoriesToIgnore.includes(item.name)) {
      getAllVariable(path.join(pathDir, item.name));
    }
    if (item.name.includes("css") || item.name.includes("scss")) {
      const filePath = path.join(pathDir, item.name);
      reader = fs.createReadStream(filePath);
      reader.on("data", (chunk: string) => {
        updateCssVarFromChunk(chunk.toString(), filePath, item.name);
      });
    }
  });
}

function updateCssVarFromChunk(chunk: string, filePath:string, fileName:string) {
  const cssVarsItems: vscode.CompletionItem[] = [];
  const lines = chunk.split(/\r?\n/);
  lines.forEach((line) => {
    const lineTrim = line.trim();
    if (lineTrim.length && lineTrim.startsWith("--")) {
      const [cssVar, val] = lineTrim.split(":");
      if (val && !cssVars.has(cssVar)) {
        const kind = val.trim().startsWith("#") || val.trim().startsWith("rgba") || val.trim().startsWith("rgb") ? 15 : undefined;
        const hint = new vscode.CompletionItem(cssVar, kind);
        hint.detail = `${val}`;
        hint.documentation = new vscode.MarkdownString(`[${fileName}](${url.pathToFileURL(filePath)})`);
        cssVarsItems.push(hint);
        cssVars.set(cssVar, val);
      }
    }
  });
  const auto = vscode.languages.registerCompletionItemProvider(["css", "scss"], {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
      return cssVarsItems;
    },
  });

 
  contextCopy.subscriptions.push(auto);
  if(cssVars.size > 0 && updateCommand ){
    vscode.window.showInformationMessage(`Update ${cssVars.size} CSS variables`);
    updateCommand = false;
  }
  return true;
}

export function activate(context: vscode.ExtensionContext) {
  contextCopy = context;

  const run = async () => {
    if (vscode.workspace.rootPath) {
      const doneScan = await getAllVariable(vscode.workspace.rootPath as string);
    }
  };

  const dispatch = vscode.commands.registerCommand('css-var-hint.refresh', ()=>{
    updateCommand = true;
    run();
  })
  contextCopy.subscriptions.push(dispatch);

  run();
}

// this method is called when your extension is deactivated
export function deactivate() {}
