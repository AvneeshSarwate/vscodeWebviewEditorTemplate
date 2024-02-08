import * as vscode from 'vscode';

class SliderEditorProvider implements vscode.CustomEditorProvider {
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new SliderEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(SliderEditorProvider.viewType, provider);
    return providerRegistration;
  }

  private static readonly viewType = 'mySliderEditor';

  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveCustomEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document.getText());

    webviewPanel.webview.onDidReceiveMessage(e => this.handleMessage(e, document), null, this.context.subscriptions);
  }

  private getHtmlForWebview(webview: vscode.Webview, documentText: string): string {
    const jsonObject = JSON.parse(documentText);
    let slidersHtml = '';
    for (const [key, value] of Object.entries(jsonObject)) {
      slidersHtml += `
        <label for="${key}">${key}: </label>
        <input type="range" id="${key}" name="${key}" min="1" max="100" value="${value}" class="slider">
        <span id="${key}-value">${value}</span><br/>
      `;
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Piano Roll Editor</title>
        <style>
          .slider {
            width: 100%;
          }
        </style>
      </head>
      <body>
        ${slidersHtml}
        <script>
          const vscode = acquireVsCodeApi();
          document.querySelectorAll('.slider').forEach(slider => {
            slider.oninput = function() {
              document.getElementById(this.name + '-value').textContent = this.value;
              vscode.postMessage({
                command: 'valueChanged',
                key: this.name,
                value: this.value
              });
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  private handleMessage(message: any, document: vscode.TextDocument): void {
    switch (message.command) {
      case 'valueChanged':
        this.updateValue(document, message.key, message.value);
        break;
    }
  }

  private updateValue(document: vscode.TextDocument, key: string, value: string): void {
    const json = JSON.parse(document.getText());
    json[key] = Number(value);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), JSON.stringify(json, null, 2));
    vscode.workspace.applyEdit(edit);
  }
}

export function activate(context: vscode.ExtensionContext) {
  SliderEditorProvider.register(context);
}

export function deactivate() {}
