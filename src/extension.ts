import * as vscode from 'vscode';

class SliderDocument implements vscode.CustomDocument {
  constructor(public readonly uri: vscode.Uri) {}

  dispose(): void {
    // Dispose of any resources the document uses
  }
}

type SliderVals = {
  [key: string]: number;
};

class SliderEditorProvider implements vscode.CustomEditorProvider<SliderDocument> {
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new SliderEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(SliderEditorProvider.viewType, provider, {
      supportsMultipleEditorsPerDocument: false,
    });
    return providerRegistration;
  }

  private static readonly viewType = 'mySliderEditor';

  private sliderVals: SliderVals = {};

  constructor(private readonly context: vscode.ExtensionContext) {}

  async openCustomDocument(uri: vscode.Uri, openContext: { backupId?: string }, token: vscode.CancellationToken): Promise<SliderDocument> {
    return new SliderDocument(uri);
  }

  async resolveCustomEditor(document: SliderDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
    // Ensure webview can run scripts
    webviewPanel.webview.options = {
      enableScripts: true
    };
  
    const content = await this.getFileContent(document.uri);
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, content);
  
    webviewPanel.webview.onDidReceiveMessage(async message => {
      switch (message.command) {
        case 'valueChanged':
          await this.handleValueChange(document, message.key, message.value);
          return;
      }
    }, undefined, this.context.subscriptions);
  }

  private async getFileContent(uri: vscode.Uri): Promise<string> {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder('utf-8').decode(bytes);
  }

  private getHtmlForWebview(webview: vscode.Webview, documentText: string): string {
    const jsonObject = JSON.parse(documentText);
    this.sliderVals = jsonObject;
    let slidersHtml = Object.entries(jsonObject).map(([key, value]) =>
      `<label for="${key}">${key}: </label>
       <input type="range" id="${key}" name="${key}" min="1" max="100" value="${value}" class="slider">
       <span id="${key}-value">${value}</span><br/>`
    ).join('');

    return `<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <title>Slider Editor</title>
            </head>
            <body>
              ${slidersHtml}
              <script>
                document.querySelectorAll('.slider').forEach(slider => {
                  slider.addEventListener('input', () => {
                    const vscode = acquireVsCodeApi();
                    vscode.postMessage({
                      command: 'valueChanged',
                      key: slider.name,
                      value: slider.value
                    });
                    document.getElementById(slider.name + '-value').textContent = slider.value;
                  });
                });
              </script>
            </body>
            </html>`;
  }

  private async handleValueChange(document: SliderDocument, key: string, value: string): Promise<void> {
    // const fileContent = await this.getFileContent(document.uri);
    // const json = JSON.parse(fileContent);
    // json[key] = parseInt(value, 10);
    // const encoder = new TextEncoder();
    // await vscode.workspace.fs.writeFile(document.uri, encoder.encode(JSON.stringify(json, null, 2)));
    this.sliderVals[key] = parseInt(value, 10);
  }

  onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<SliderDocument>>().event;

  private async writeContentToFile(uri: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      cancellation.onCancellationRequested(() => reject(new Error('Operation cancelled')));
      const encoder = new TextEncoder();
      const content = JSON.stringify(this.sliderVals, null, 2);
      vscode.workspace.fs.writeFile(uri, encoder.encode(content))
        .then(() => resolve(), reject);
    });
  }
  
  
  saveCustomDocument(document: SliderDocument, cancellation: vscode.CancellationToken): Promise<void> {
    return this.writeContentToFile(document.uri, cancellation);
  }
  
  saveCustomDocumentAs(document: SliderDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
    return this.writeContentToFile(destination, cancellation);
  }

  revertCustomDocument(document: SliderDocument, cancellation: vscode.CancellationToken): Promise<void> {
    // Implement reverting the document to its last saved state
    return Promise.resolve();
  }

  backupCustomDocument(document: SliderDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Promise<vscode.CustomDocumentBackup> {
    // Implement creating a backup of the custom document
    return Promise.resolve({
      id: context.destination.fsPath,
      delete: () => Promise.resolve(),
    });
  }
}

export function activate(context: vscode.ExtensionContext) {
  SliderEditorProvider.register(context);
}

export function deactivate() {}
