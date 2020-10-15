"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const directoriesToIgnore = [
    "bower_components",
    "node_modules",
    "www",
    "platforms",
    "dist",
    ".git",
    ".idea",
    "build",
    "server"
];
let cssVars = [];
function getAllVariable(urlPath) {
    return __awaiter(this, void 0, void 0, function* () {
        let reader = null;
        let done = false;
        const pathDir = yield path.join(urlPath);
        const currentDirectory = fs.readdirSync(pathDir, { withFileTypes: true });
        while (currentDirectory.length > 0) {
            const item = currentDirectory.pop();
            if (item.isDirectory() && !directoriesToIgnore.includes(item.name)) {
                getAllVariable(path.join(pathDir, item.name));
            }
            if (item.name.includes('css') || item.name.includes('scss')) {
                reader = fs.createReadStream(path.join(pathDir, item.name));
                reader.on('data', function (chunk) {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield getCssVarFromChunk(chunk.toString());
                    });
                });
            }
        }
        return new Promise((resolve, reject) => {
            reader.on('end', () => {
                if (currentDirectory.length === 0) {
                    resolve(cssVars);
                }
            });
        });
    });
}
function getCssVarFromChunk(chunk) {
    const lines = chunk.split(/\r?\n/);
    lines.forEach(line => {
        const lineTrim = line.trim();
        if (lineTrim.length && lineTrim.startsWith('--')) {
            const [cssVar, val] = lineTrim.split(":");
            cssVars.push({ cssVar, val });
        }
    });
    return;
}
function activate(context) {
    const run = () => __awaiter(this, void 0, void 0, function* () {
        const data = yield getAllVariable(vscode.workspace.rootPath);
        const cssVarsItems = data.map((item) => new vscode.CompletionItem(item.cssVar));
        const auto = vscode.languages.registerCompletionItemProvider(['css', 'scss'], {
            provideCompletionItems(document, position, token) {
                return cssVarsItems;
            }
        });
        context.subscriptions.push(auto);
    });
    run();
    context.subscriptions.push(auto);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map