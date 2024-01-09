// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  let rainbowDecorator = new RainbowDecorator();

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor) {
        rainbowDecorator.updateDecorations(editor);
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (
        vscode.window.activeTextEditor &&
        event.document === vscode.window.activeTextEditor.document
      ) {
        rainbowDecorator.updateDecorations(vscode.window.activeTextEditor);
      }
    },
    null,
    context.subscriptions
  );
}

interface FoundKeyword {
  keyword: string;
  range: vscode.Range;
}

class RainbowDecorator {
  private decorationType: vscode.TextEditorDecorationType[] = [];

  constructor() {
    for (let i = 1; i <= 7; i++) {
      this.decorationType.push(
        vscode.window.createTextEditorDecorationType({
          color: `hsl(${i * 60}, 100%, 80%)`,
        })
      );
    }
  }

  public updateDecorations(editor: vscode.TextEditor) {
    if (
      !editor?.document ||
      !["pascal", "objectpascal", "delphi"].includes(editor.document.languageId)
    ) {
      return;
    }

    const decorations: vscode.DecorationOptions[][] = [];

    let stack: number[] = [];
    let currentLevel = 0;

    for (let i = 0; i < editor.document.lineCount; i++) {
      const line = editor.document.lineAt(i);

      // TODO Fix potential bug when there is multiple begin and end in the same line
      const foundKeyword = this.findKeyword(line, [
        "begin",
        "end",
        "try",
        "except",
        "finally",
      ]);

      if (foundKeyword === null) {
        continue;
      }

      switch (foundKeyword.keyword) {
        case "begin":
        case "try":
          stack.push(stack.length);
          currentLevel = stack.length - 1;
          break;
        case "end":
          currentLevel = stack.pop() ?? 0;
          break;
        default:
          currentLevel = stack.length - 1 >= 0 ? stack.length - 1 : 0;
      }

      const decoration = {
        range: foundKeyword.range,
        hoverMessage: `Block Level: ${currentLevel}`,
      };

      decorations[currentLevel] = decorations[currentLevel] || [];
      decorations[currentLevel].push(decoration);
    }

    for (let i = 0; i < this.decorationType.length; i++) {
      editor.setDecorations(this.decorationType[i], decorations[i] || []);
    }
  }

  private findKeyword(
    line: vscode.TextLine,
    keywords: string[]
  ): FoundKeyword | null {
    for (const keyword of keywords) {
      let start = line.text.search(`(?<!//.*)(?<!{.*)\\b${keyword}\\b(?!})`);
      if (start > -1) {
        return {
          keyword: keyword,
          range: new vscode.Range(
            new vscode.Position(line.lineNumber, start),
            new vscode.Position(line.lineNumber, start + keyword.length)
          ),
        };
      }
    }

    return null;
  }
}
