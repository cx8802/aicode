import { resolve, relative, isAbsolute } from 'path';

const workspace = 'test-file-tools';
const filePath = 'test-file-tools/test.txt';

const absoluteWorkspace = isAbsolute(workspace) ? workspace : resolve(workspace);
const absolutePath = isAbsolute(filePath) ? filePath : resolve(absoluteWorkspace, filePath);
const relativePath = relative(absoluteWorkspace, absolutePath);

console.log('workspace:', workspace);
console.log('filePath:', filePath);
console.log('absoluteWorkspace:', absoluteWorkspace);
console.log('absolutePath:', absolutePath);
console.log('relativePath:', relativePath);
console.log('startsWith..:', relativePath.startsWith('..'));
