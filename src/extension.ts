import * as vscode from 'vscode';
import * as yeoman from 'yeoman-environment';

export function activate(context: vscode.ExtensionContext) {
	const channel = vscode.window.createOutputChannel('Yo Code');

	context.subscriptions.push(vscode.commands.registerCommand('new-workspace-vscode-extension.newExtension', async () => {
		try {
			let destination: vscode.Uri | undefined = undefined;
			const folders = vscode.workspace.workspaceFolders;
			let forceOpen = false;
			if (!folders || folders.length === 0) {
				destination = (await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false }))?.[0];
				forceOpen = true;
			} else if (folders.length === 1) {
				destination = vscode.workspace.workspaceFolders?.[0].uri;
			} else {
				destination = (await vscode.window.showQuickPick(folders.map(f => ({ label: f.name, uri: f.uri }))))?.uri;
			}

			if (!destination) { throw Error('No Destination selectred'); }

			channel.show();

			var env = yeoman.createEnv(undefined, { cwd: destination.fsPath }, {

				diff: (actual: string, expected: string) => {
					channel.appendLine('Actual');
					channel.appendLine(actual);
					channel.appendLine('Expected');
					channel.appendLine(expected);
					channel.show();
					return 'unknown';
				},

				prompt: async (questions: any) => {
					const answer = await Promise.all<any[]>(questions.map(async (question: any) => {
						if (question.type === 'list') {
							const answer = await vscode.window.showQuickPick(question.choices.map((q: any) => ({ ...q, label: q.name, id: q.value, type: q.value })));
							return answer;
						}
						else if (question.type === 'input') {
							const answer = await vscode.window.showInputBox({ title: question.message });
							return { [question.name]: answer };
						}
						else if (question.type === 'confirm') {
							const answer = await vscode.window.showInformationMessage(question.message, { modal: true }, 'Yes', 'No');
							return { [question.name]: answer === 'Yes' };
						}
						else {
							throw new Error('Unexpected question type');
						}
					}));

					if (answer.length === 1) { return answer[0]; }
					else { return answer; }
				},

				log: new Proxy(() => { }, {
					get: (t, p) => (...strs: string[]) => channel.appendLine(p.toString() + ': ' + strs.join(' | ')),
					apply: (t, _, args) => channel.appendLine(args.join(' - '))
				}),

			} as any);

			env.register(require.resolve('generator-code'), 'vscode:extension');
			await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Scaffolding Extension...' }, async () => {
				await (env.run as any)('vscode:extension',
					{
						destination: destination!.fsPath,
						quick: true,
					});
			});
			if (forceOpen) {
				await vscode.commands.executeCommand('vscode.openFolder', destination, { forceReuseWindow: true });
			}
		} catch (e) {
			console.error(e);
		}
	}));
}

export function deactivate() { }
