const fs = require('fs');

const parserFile = fs.readFileSync('scratch/test_full_fixed_parser.js', 'utf8');
const start = parserFile.indexOf('function cleanOptionString(');
const end = parserFile.indexOf('// TEST 1:');
eval(parserFile.slice(start, end));

// Test 1: Multi-line question prompt & Multi-line explanation
const test1 = `
سؤال 1:
في ظل التطور التكنولوجي المعاصر
والتحول الرقمي السريع في مختلف القطاعات
ما هو العامل الأساسي لنجاح التحول الرقمي؟
أ) تدريب الكوادر البشرية
ب) شراء الأجهزة فقط
ج) تجاهل الأمان الرقمي
د) تقليل الميزانية
الإجابة الصحيحة: أ
التوضيح: العنصر البشري هو الركيزة الأساسية
لأي تحول رقمي ناجح، حيث يضمن استمرارية
التطوير والاستخدام الأمثل للتقنيات.
`;

const res1 = parseImportedQuestions(test1);
console.log('Test 1 Prompt lines:', res1.questions[0].prompt.split('\n').length);
console.log('Test 1 Prompt:', JSON.stringify(res1.questions[0].prompt));
console.log('Test 1 Explanation lines:', res1.questions[0].explanation.split('\n').length);
console.log('Test 1 Explanation:', JSON.stringify(res1.questions[0].explanation));
console.log('Test 1 Correct index:', res1.questions[0].correctIndex);

// Test 2: Multi-line options
const test2 = `
1. أي من التالي يعتبر من لغات البرمجة المفسرة؟
A) Python
وهي لغة سهلة الاستخدام وتعتمد على المفسر
B) C++
وهي لغة مجمعة عالية الأداء
Answer: A
`;

const res2 = parseImportedQuestions(test2);
console.log('\nTest 2 Options length:', res2.questions[0].options.length);
console.log('Test 2 Option A lines:', res2.questions[0].options[0].split('\n').length);
console.log('Test 2 Option A:', JSON.stringify(res2.questions[0].options[0]));
console.log('Test 2 Correct index:', res2.questions[0].correctIndex);

// Test 3: True / False question
const test3 = `
سؤال 3:
تعتبر الحوسبة السحابية نظاماً مغلقاً لا يعتمد على الإنترنت.
صواب / خطأ
الإجابة الصحيحة: خطأ
التوضيح: الحوسبة السحابية تعتمد بالكامل على شبكة الإنترنت.
`;

const res3 = parseImportedQuestions(test3);
console.log('\nTest 3 Options:', res3.questions[0].options);
console.log('Test 3 Correct index:', res3.questions[0].correctIndex);
console.log('Test 3 Explanation:', res3.questions[0].explanation);
