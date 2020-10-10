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
        // console.log(workspace.rootPath)
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
    // TODO check AST for CSS variables : https://github.com/csstree/csstree
    // const ast = csstree.parse(chunk);
    // console.log(ast);
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
    console.log('Congratulations, your extension "css-var-hint" is now active!');
    let disposable = vscode.commands.registerCommand('css-var-hint.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from css var hint!');
    });
    // console.log(cssVars)
    // const complitions = cssVars.map(item=>{
    // 	new vscode.CompletionItem(`${item.var}`)
    // })
    const run = () => __awaiter(this, void 0, void 0, function* () {
        const data = yield getAllVariable(vscode.workspace.rootPath);
        console.log('DATA', data);
        const cssVarsItems = data.map((item) => new vscode.CompletionItem(item.cssVar));
        console.log(cssVarsItems);
        const auto = vscode.languages.registerCompletionItemProvider(['css', 'scss'], {
            provideCompletionItems(document, position, token) {
                return cssVarsItems;
            }
        });
        context.subscriptions.push(auto);
    });
    run();
    // const auto = vscode.languages.registerCompletionItemProvider(['css','scss'], {
    // 	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
    // 		const cssVarsItems: vscode.CompletionItem[] = [];
    // 		getAllVariable(vscode.workspace.rootPath).then(data=>{
    // 			console.log('vars', cssVars)
    // 		});
    // 		//return [complitions];	
    // 	}
    // })
    context.subscriptions.push(auto);
    // const auto = vscode.languages.registerCompletionItemProvider(['css','scss'], {
    // 	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
    // 		return [new vscode.CompletionItem("Hello")];
    // 	}
    // })
    // const auto2 = vscode.languages.registerCompletionItemProvider('scss', {
    // 	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
    // 		return [new vscode.CompletionItem("Hello"),new vscode.("Helloaaa")];
    // 	}
    // })
    // https://css-tricks.com/what-i-learned-by-building-my-own-vs-code-extension/
    //context.subscriptions.push(disposable);
    // context.subscriptions.push(auto);
    // context.subscriptions.push(auto2);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map