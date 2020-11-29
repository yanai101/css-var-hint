// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';



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

let cssVars: Array<{cssVar: string, val: string}> = []

async function getAllVariable(urlPath:string): Promise<Array<{cssVar: string, val: string}>>{	
	let reader:any = null;
	let done = false;
	const pathDir = await path.join(urlPath)
	const currentDirectory = fs.readdirSync(pathDir, { withFileTypes: true });
		while (currentDirectory.length > 0) {
				const item:any = currentDirectory.pop();
				if(item.isDirectory() && !directoriesToIgnore.includes(item.name)){
					getAllVariable(path.join(pathDir, item.name));
								
				}
				if(item.name.includes('css') || item.name.includes('scss')){
					reader = fs.createReadStream(path.join(pathDir, item.name)); 
					reader.on('data', async function (chunk:string) { 
						await getCssVarFromChunk(chunk.toString()); 
					});
				}
		}

		
		return new Promise((resolve, reject) =>{
			reader && reader.on('end', () => { 
				if(currentDirectory.length === 0){
					resolve(cssVars)
				}
			}); 
		})
 
	
}

function getCssVarFromChunk(chunk:string){
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
	
	const run = async() => {
    console.log('YANAI',vscode.workspace.rootPath)
    const data: any = await getAllVariable(vscode.workspace.rootPath as string);

		const cssVarsItems: vscode.CompletionItem[] = data.map((item:{cssVar: string}) => new vscode.CompletionItem(item.cssVar))
		const auto = vscode.languages.registerCompletionItemProvider(['css','scss'], {
		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
			return cssVarsItems
		}
		})
	
		context.subscriptions.push(auto);

	}

	run();
}


// this method is called when your extension is deactivated
export function deactivate() {}
