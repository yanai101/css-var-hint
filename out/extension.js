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
const url = require("url");
const var_hint_panel_1 = require("./var-hint-panel");
const directoriesToIgnore = ["bower_components", "node_modules", "www", "platforms", "dist", ".git", ".idea", "build", "server"];
const cssVars = new Map();
let contextCopy;
let updateCommand = false;
const isCssFile = (fileName) => fileName.includes("css") || fileName.includes("scss") || fileName.includes("less");
function getAllVariable(urlPath) {
    return __awaiter(this, void 0, void 0, function* () {
        let reader = null;
        const pathDir = path.join(urlPath);
        const currentDirectory = fs.readdirSync(pathDir, { withFileTypes: true });
        currentDirectory.forEach((item) => __awaiter(this, void 0, void 0, function* () {
            if (item.isDirectory() && !directoriesToIgnore.includes(item.name)) {
                getAllVariable(path.join(pathDir, item.name));
            }
            if (isCssFile(item.name)) {
                const filePath = path.join(pathDir, item.name);
                reader = fs.createReadStream(filePath);
                reader.on("data", (chunk) => {
                    updateCssVarFromChunk(chunk.toString(), filePath, item.name);
                });
            }
        }));
    });
}
function updateCssVarFromChunk(chunk, filePath, fileName) {
    const cssVarsItems = [];
    const lines = chunk.split(/\r?\n/);
    lines.forEach((line) => {
        const lineTrim = line.trim();
        if (lineTrim.length && lineTrim.startsWith("--")) {
            const [cssVar, val] = lineTrim.split(":");
            if (val && !cssVars.has(cssVar)) {
                const kind = val.trim().startsWith("#") || val.trim().startsWith("rgba") || val.trim().startsWith("hsl") || val.trim().startsWith("hsla") || val.trim().startsWith("rgb")
                    ? 15
                    : undefined;
                const hint = new vscode.CompletionItem(cssVar, kind);
                hint.detail = `${val}`;
                hint.documentation = new vscode.MarkdownString(`[${fileName}](${url.pathToFileURL(filePath)})`);
                cssVarsItems.push(hint);
                cssVars.set(cssVar, { val, file: url.pathToFileURL(filePath) });
            }
        }
    });
    const auto = vscode.languages.registerCompletionItemProvider(["css", "scss"], {
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