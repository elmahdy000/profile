import { readFileSync, writeFileSync } from 'fs';

const path = 'artifacts/dr-mahmoud/src/components/platform/tabs/StudentQuizGradesSheet.tsx';
let content = readFileSync(path, 'utf8');

// 1. Rename the percentage header (remove separate retry column header)
content = content.replace(
  `<th className="py-3.5 px-4 text-center">\u0627\u0644\u0646\u0633\u0628\u0629 \u0627\u0644\u0645\u0626\u0648\u064a\u0629</th>`,
  `<th className="py-3.5 px-4 text-center">\u0627\u0644\u0646\u0633\u0628\u0629 / \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631</th>`
);

// 2. Remove standalone retry column header
content = content.replace(
  /\r?\n[ \t]*<th className="py-3\.5 px-4 text-center">\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631<\/th>/,
  ''
);

// 3. Replace percentage td (old, no button) with combined percentage+button td
const oldPercentageTd = `                    <td className="py-3.5 px-4 text-center">
                       <span
                        className={\`inline-block font-extrabold text-sm px-2 py-0.5 rounded-full \${
                          item.percentage >= 85
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : item.percentage >= 60
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }\`}
                      >
                        {item.percentage}%
                      </span>
                    </td>`;

const newPercentageTd = `                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span
                          className={\`inline-block font-extrabold text-sm px-2.5 py-0.5 rounded-full \${
                            item.percentage >= 85
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : item.percentage >= 60
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }\`}
                        >
                          {item.percentage}%
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={grantingStudentId === item.studentId}
                          onClick={() => handleGrantExtraAttempt(item)}
                          className="h-6 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 dark:text-amber-400 dark:border-amber-700/50 whitespace-nowrap px-2 rounded-lg transition-colors"
                        >
                          {grantingStudentId === item.studentId ? "\u23f3 \u062c\u0627\u0631\u064a..." : "\u21ba \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631"}
                        </Button>
                        {Boolean(item.extraAttemptsGranted && item.extraAttemptsGranted > 0) && (
                          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                            +{item.extraAttemptsGranted} \ud83d\udfe2
                          </span>
                        )}
                      </div>
                    </td>`;

if (content.includes(oldPercentageTd)) {
  content = content.replace(oldPercentageTd, newPercentageTd);
  console.log('Replaced percentage td successfully');
} else {
  console.error('Could not find old percentage td!');
  process.exit(1);
}

// 4. Remove standalone retry td at end of row
const oldRetryTdStart = `                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={grantingStudentId === item.studentId}
                          onClick={() => handleGrantExtraAttempt(item)}
                          className="h-7 text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 whitespace-nowrap"
                        >
                          {grantingStudentId === item.studentId ? "\u062c\u0627\u0631\u064a \u0627\u0644\u0645\u0646\u062d..." : "\u2795 \u0645\u0646\u062d \u0645\u062d\u0627\u0648\u0644\u0629 \u0625\u0636\u0627\u0641\u064a\u0629"}
                        </Button>
                        {Boolean(item.extraAttemptsGranted && item.extraAttemptsGranted > 0) && (
                          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            +{item.extraAttemptsGranted} \u0645\u062d\u0627\u0648\u0644\u0629 \u0625\u0636\u0627\u0641\u064a\u0629 \ud83d\udfe2
                          </span>
                        )}
                      </div>
                    </td>`;

if (content.includes(oldRetryTdStart)) {
  content = content.replace(oldRetryTdStart, '');
  console.log('Removed standalone retry td successfully');
} else {
  console.error('Could not find standalone retry td!');
  process.exit(1);
}

writeFileSync(path, content, 'utf8');
console.log('File written. Total lines:', content.split('\n').length);
