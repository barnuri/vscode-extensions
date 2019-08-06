import * as vscode from 'vscode';
import { TreeTask } from './TreeTask';

export class TaskProvider implements vscode.TreeDataProvider<TreeTask> {
    public async getChildren(task?: TreeTask): Promise<TreeTask[]> {
        let tasks = await vscode.tasks.fetchTasks().then(function(value) {
            return value;
        });

        let treeTasks: TreeTask[] = [];

        if (tasks.length !== 0) {
            for (var i = 0; i < tasks.length; i++) {
                treeTasks[i] = new TreeTask(tasks[i].definition.type, tasks[i].name, vscode.TreeItemCollapsibleState.None, {
                    command: 'taskOutline.executeTask',
                    title: 'Execute',
                    arguments: [tasks[i]],
                });
            }
        }
        return treeTasks;
    }
    getTreeItem(task: TreeTask): vscode.TreeItem {
        return task;
    }
}
