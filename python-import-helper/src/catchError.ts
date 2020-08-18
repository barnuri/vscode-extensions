import { window } from 'vscode';

function catchError(fn: (...args: any[]) => any) {
    return async function(...args: any[]) {
        try {
            const result = await fn(...args);
            return result;
        } catch (e) {
            console.error(e);
            window.showErrorMessage(e);
            throw e;
        }
    };
}

export default catchError;
