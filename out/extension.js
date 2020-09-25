"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "css-var-hint" is now active!');
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('css-var-hint.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from css var hint!');
    });
    const auto = vscode.languages.registerCompletionItemProvider('css', {
        provideCompletionItems(document, position, token) {
            return [new vscode.CompletionItem("Hello")];
        }
    });
    const auto2 = vscode.languages.registerCompletionItemProvider('scss', {
        provideCompletionItems(document, position, token) {
            return [new vscode.CompletionItem("Hello"), new vscode.("Helloaaa")];
        }
    });
    // https://css-tricks.com/what-i-learned-by-building-my-own-vs-code-extension/
    //context.subscriptions.push(disposable);
    context.subscriptions.push(auto);
    context.subscriptions.push(auto2);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map