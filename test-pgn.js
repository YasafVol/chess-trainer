const fs = require('fs');
const pgn = fs.readFileSync('spec/samples/sample-games.pgn', 'utf8');

// Simulate normalization
function normalizePgnInput(pgn) {
    if (!pgn) return '';
    let normalized = pgn
        .replace(/\uFEFF/g, '')
        .replace(/\r\n?/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/;[^\n]*/g, '')
        .replace(/[ \f\v]+/g, ' ');
    
    const headerMatch = normalized.match(/^(\s*\[[^\]]+\]\s*\n)+/m);
    if (headerMatch) {
        const headerBlock = headerMatch[0];
        const rest = normalized.slice(headerBlock.length).replace(/^\s+/, '');
        normalized = `${headerBlock.trimEnd()}\n\n${rest}`;
    }
    
    return normalized
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        .trim();
}

const normalized = normalizePgnInput(pgn);
console.log('Normalized PGN (first 500 chars):');
console.log(normalized.substring(0, 500));
console.log('\n=== Checking line 16 ===');
const lines = normalized.split('\n');
console.log('Line 16:', lines[15]);
console.log('Line 17:', lines[16]);
