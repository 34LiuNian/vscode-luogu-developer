import * as vscode from 'vscode';

import debug from '../utils/debug';
import Submit from './submit';
import About from './about';
import userInfo from './userinfo';
import Fate from './fate';
import selectLanguage from './selectLanguage';
import BenBen from './benben';
import lastRecord from './lastRecord';
import solution from './solution';
import contest from './contest';
import random from './random';
import paintboard from './paintboard';
import traininglist from './traininglist';
import traindetails from './traindetails';
const commands = [
  About,
  Submit,
  userInfo,
  Fate,
  selectLanguage,
  BenBen,
  lastRecord,
  solution,
  contest,
  random,
  paintboard,
  traininglist,
  traindetails
  // ,(await import('./search')).default
];
export { commands };

export function registerCommands(context: vscode.ExtensionContext) {
  for (const idx in commands) {
    const command = commands[idx];
    debug(`register command: ${command.onCommand}.`);
    context.subscriptions.push(
      vscode.commands.registerCommand(
        `luogu.${command.onCommand}`,
        command.handle
      )
    );
    if (command.onactivate) command.onactivate(context);
  }
  debug('All commands registered.');
}

export default registerCommands;
