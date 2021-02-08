import * as vscode from "vscode";
import { getNonce } from "./utils";

export class CssVarHintPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: CssVarHintPanel | undefined;

  public static readonly viewType = "catCoding";
  static _needRefresh = false;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  static _cssVars: any;

  public static createOrShow(extensionUri: vscode.Uri, cssVars?: any) {
    this._cssVars = cssVars || null;
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    // If we already have a panel, show it.
    if (CssVarHintPanel.currentPanel) {
      CssVarHintPanel.currentPanel._panel.reveal(column);
      if (this._needRefresh) {
        this._needRefresh = false;
        CssVarHintPanel.currentPanel._panel.webview.postMessage({ type: "update", value: Array.from(CssVarHintPanel._cssVars) });
      }
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(CssVarHintPanel.viewType, "Css var hint", column || vscode.ViewColumn.One, {
      // Enable javascript in the webview
      enableScripts: true,
      // And restrict the webview to only loading content from our extension's `media` directory.
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, "media"),
        // vscode.Uri.joinPath(extensionUri, "out/compiled"),
      ],
    });

    CssVarHintPanel.currentPanel = new CssVarHintPanel(panel, extensionUri);
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    CssVarHintPanel.currentPanel = new CssVarHintPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      (e) => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables
    );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "alert":
            vscode.window.showErrorMessage(message.text);
            return;
          case "info":
            vscode.window.showInformationMessage(message.text);
            return;
          case "refresh":
            CssVarHintPanel._needRefresh = true;
            vscode.commands.executeCommand("varHint.updatePanel");
            return;
          case "openFile":
            const file = vscode.Uri.parse(message.text);
            vscode.commands.executeCommand("vscode.open", file);

            return;
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    CssVarHintPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;

    this._panel.webview.html = this._getHtmlForWebview(webview, CssVarHintPanel._cssVars);
    setTimeout(() => {
      this._panel.webview.postMessage({ type: "update", value: Array.from(CssVarHintPanel._cssVars) });
    }, 2000);
  }

  private _getHtmlForWebview(webview: vscode.Webview, cssVars?: any) {
    // Local path to main script run in the webview
    const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, "media", "main.js");

    // And the uri we use to load this script in the webview
    const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

    // Local path to css styles
    const styleResetPath = vscode.Uri.joinPath(this._extensionUri, "media", "reset.css");
    const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css");

    // Uri to load styles into webview
    const stylesResetUri = webview.asWebviewUri(styleResetPath);
    const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${stylesResetUri}" rel="stylesheet">
				<link href="${stylesMainUri}" rel="stylesheet">
        <title>Var Hint List </title>
			</head>
			<body>
				<h1 id="lines-of-code-counter">Css Var Hint List</h1>
				<p><button id="varHint:updateList">Update</button></p>
        <div id="varHint:varList"></div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}
