"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const var_hint_panel_1 = require("./var-hint-panel");
const directoriesToIgnore = ["bower_components", "node_modules", "www", "platforms", "dist", ".git", ".idea", "build", "server"];
const cssVars = new Map();
let contextCopy;
let updateCommand = false;
const isCssFile = (fileName) => fileName.includes("css") || fileName.includes("scss") || fileName.includes("less");
function getAllVariable(urlPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const pathDir = path.join(urlPath);
        const currentDirectory = fs.readdirSync(pathDir, { withFileTypes: true });
        currentDirectory.forEach((item) => {
            if (item.isDirectory() && !directoriesToIgnore.includes(item.name)) {
                getAllVariable(path.join(pathDir, item.name));
            }
            if (isCssFile(item.name)) {
                const filePath = path.join(pathDir, item.name);
                const content = fs.readFileSync(filePath, "utf8");
                updateCssVarFromChunk(content, filePath, item.name);
            }
        });
    });
}
function updateCssVarFromChunk(chunk, filePath, fileName) {
    const cssVarsItems = [];
    const lines = chunk.split(/\r?\n/);
    lines.forEach((line, index) => {
        const lineTrim = line.trim();
        if (lineTrim.length && lineTrim.startsWith("--")) {
            const [cssVar, val] = lineTrim.split(":");
            if (val) {
                const kind = val.trim().startsWith("#") || val.trim().startsWith("rgba") || val.trim().startsWith("hsl") || val.trim().startsWith("hsla") || val.trim().startsWith("rgb")
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
    const auto = vscode.languages.registerCompletionItemProvider(["css", "scss", "postcss"], {
        provideCompletionItems(document, position, token) {
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
function activate(context) {
    contextCopy = context;
    const run = () => __awaiter(this, void 0, void 0, function* () {
        var _a;
        if ((_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a.length) {
            vscode.workspace.workspaceFolders.forEach((workspace) => __awaiter(this, void 0, void 0, function* () {
                yield getAllVariable(workspace.uri.path);
            }));
        }
    });
    const dispatch = vscode.commands.registerCommand("css-var-hint.refresh", () => {
        updateCommand = true;
        run();
    });
    contextCopy.subscriptions.push(vscode.commands.registerCommand("varHint.showPanel", () => {
        var_hint_panel_1.CssVarHintPanel.createOrShow(context.extensionUri, cssVars);
    }));
    contextCopy.subscriptions.push(vscode.commands.registerCommand("varHint.updatePanel", () => __awaiter(this, void 0, void 0, function* () {
        yield run();
        var_hint_panel_1.CssVarHintPanel.createOrShow(context.extensionUri, cssVars);
    })));
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
            md.appendMarkdown(`[${name}](${link.toString()}): ${value}`);
            if (/^#([0-9a-fA-F]{3,8})$/.test(value) || /^rgba?\(/.test(value) || /^hsla?\(/.test(value)) {
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
    vscode.workspace.onDidSaveTextDocument((e) => __awaiter(this, void 0, void 0, function* () {
        if (isCssFile(e.fileName)) {
            const text = e.getText();
            const filePath = e.uri.path;
            const fileName = path.basename(e.fileName);
            yield updateCssVarFromChunk(text, filePath, fileName);
        }
    }));
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map