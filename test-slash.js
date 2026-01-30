const rl = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter something: ', (answer) => {
  console.log(`You entered: "${answer}"`);
  console.log(`Char codes: ${answer.split('').map(c => c.charCodeAt(0))}`);
  console.log(`Trimmed: "${answer.trim()}"`);
  console.log(`Is slash: ${answer.trim() === '/'}`);
  rl.close();
});
