console.log('Regex \\bما\\b on "ما":', /\bما\b/.test('ما'));
console.log('Regex \\bما\\b on " ما ":', /\bما\b/.test(' ما '));
console.log('Regex with [^\\p{L}\\p{N}] on " ما ":', /(?:^|[^\p{L}\p{N}])ما(?:[^\p{L}\p{N}]|$)/u.test(' ما '));
