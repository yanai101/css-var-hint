// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as csstree from 'css-tree';



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

let cssVars = []

async function getAllVariable(urlPath){
	// console.log(workspace.rootPath)
	const pathDir = await path.join(urlPath)
	const currentDirectory = fs.readdirSync(pathDir, { withFileTypes: true });
	// currentDirectory.forEach(item => {
	// 	if(item.isDirectory() && !directoriesToIgnore.includes(item.name)){
	// 		getAllVariable(path.join(pathDir, item.name));
						
	// 	}
	// 	if(item.name.includes('css') || item.name.includes('scss')){
	// 		const reader = fs.createReadStream(path.join(pathDir, item.name)); 
	// 		reader.on('data', function (chunk) { 
	// 			getCssVarFromChunk(chunk.toString(),context); 
	// 		}); 
	// 	}
	// });
		while (currentDirectory.length > 0) {
				const item = currentDirectory.pop();
				if(item.isDirectory() && !directoriesToIgnore.includes(item.name)){
					getAllVariable(path.join(pathDir, item.name));
								
				}
				if(item.name.includes('css') || item.name.includes('scss')){
					const reader = fs.createReadStream(path.join(pathDir, item.name)); 
					reader.on('data', async function (chunk) { 
						await getCssVarFromChunk(chunk.toString()); 
						cb();
					}); 
				}
			
		}
		
	
}

function getCssVarFromChunk(chunk:string){
	// TODO check AST for CSS variables : https://github.com/csstree/csstree
	// const ast = csstree.parse(chunk);
	// console.log(ast);
	const lines = chunk.split(/\r?\n/);
	lines.forEach(line => {
		const lineTrim = line.trim();
	     if(lineTrim.length && lineTrim.startsWith('--')){
			 const [cssVar, val]= lineTrim.split(":")
			cssVars.push({cssVar, val})
		 }
	})
	return ;
}



export function activate(context: vscode.ExtensionContext) {


	console.log('Congratulations, your extension "css-var-hint" is now active!');
	let disposable = vscode.commands.registerCommand('css-var-hint.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from css var hint!');
	});
	
	getAllVariable(vscode.workspace.rootPath);
	
	console.log(cssVars)

	const complitions = cssVars.map(item=>{
		new vscode.CompletionItem(`${item.var}`)
	})
	
	
	const auto = vscode.languages.registerCompletionItemProvider(['css','scss'], {
		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
			return [complitions];
		}
	})

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


// this method is called when your extension is deactivated
export function deactivate() {}
