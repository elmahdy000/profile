#!/usr/bin/env python3
"""
validate_and_fix_bank.py
فحص كامل لبنك الأسئلة وإصلاح:
1. correctIndex خارج النطاق
2. الإجابة الصحيحة فاضية
3. correctAnswer مش محفوظ (يتضاف تلقائياً)
4. أسئلة مكررة
5. prompt فاضي
"""
import os, json, sys, re

# Try psycopg2 first, fallback to sqlite
DATABASE_URL = os.environ.get("DATABASE_URL", "")

if DATABASE_URL and "postgresql" in DATABASE_URL:
    import psycopg2
    import psycopg2.extras
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    DB_TYPE = "pg"
    print("✅ Connected to PostgreSQL")
else:
    import sqlite3
    conn = sqlite3.connect("local.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    DB_TYPE = "sqlite"
    print("✅ Connected to SQLite")

# ─────────────────────────────────────────
# جلب كل الأسئلة من بنك الأسئلة
# ─────────────────────────────────────────
cursor.execute("SELECT id, question, subject, stage, unit, lesson, difficulty FROM question_bank ORDER BY id")
rows = cursor.fetchall()
print(f"\n📊 إجمالي أسئلة بنك الأسئلة: {len(rows)}")

issues = []
fixes = []
seen_prompts = {}  # للكشف عن التكرار

for row in rows:
    row = dict(row)
    qid = row["id"]
    raw_q = row["question"]
    
    if isinstance(raw_q, str):
        try:
            q = json.loads(raw_q)
        except:
            issues.append({"id": qid, "type": "JSON_ERROR", "detail": "لا يمكن parse JSON"})
            continue
    else:
        q = raw_q if raw_q else {}

    if not q:
        issues.append({"id": qid, "type": "EMPTY_QUESTION", "detail": "السؤال فاضي"})
        continue

    prompt = q.get("prompt", "").strip()
    options = q.get("options", [])
    correct_index = q.get("correctIndex")
    correct_answer_saved = q.get("correctAnswer", "")
    explanation = q.get("explanation", "")

    needs_fix = False
    fix_info = []

    # ── 1. Prompt فاضي
    if not prompt:
        issues.append({"id": qid, "type": "EMPTY_PROMPT", "detail": "نص السؤال فاضي"})
        continue

    # ── 2. Options فاضية أو مش list
    if not isinstance(options, list) or len(options) < 2:
        issues.append({"id": qid, "type": "BAD_OPTIONS", "detail": f"عدد الخيارات: {len(options) if isinstance(options, list) else 'not list'}"})
        continue

    # ── 3. correctIndex غلط
    if not isinstance(correct_index, int) or correct_index < 0 or correct_index >= len(options):
        issues.append({"id": qid, "type": "BAD_CORRECT_INDEX",
                       "detail": f"correctIndex={correct_index}, options.length={len(options)}"})
        continue

    correct_answer_text = options[correct_index].strip() if options[correct_index] else ""

    # ── 4. الإجابة الصحيحة فاضية
    if not correct_answer_text:
        issues.append({"id": qid, "type": "EMPTY_CORRECT_ANSWER",
                       "detail": f"options[{correct_index}] = فاضي"})
        continue

    # ── 5. correctAnswer مش محفوظ أو غلط → نضيفه/نصلحه
    if not correct_answer_saved or correct_answer_saved.strip() != correct_answer_text:
        old_val = correct_answer_saved or "(فاضي)"
        fix_info.append(f"correctAnswer: '{old_val}' → '{correct_answer_text}'")
        q["correctAnswer"] = correct_answer_text
        needs_fix = True

    # ── 6. كشف تكرار Prompts
    prompt_key = re.sub(r'\s+', ' ', prompt.lower())[:200]
    if prompt_key in seen_prompts:
        issues.append({"id": qid, "type": "DUPLICATE_PROMPT",
                       "detail": f"مكرر مع ID {seen_prompts[prompt_key]}"})
    else:
        seen_prompts[prompt_key] = qid

    if needs_fix:
        fixes.append({"id": qid, "question": q, "fixes": fix_info})

# ─────────────────────────────────────────
# طباعة التقرير
# ─────────────────────────────────────────
print(f"\n{'='*60}")
print(f"📋 تقرير الفحص:")
print(f"{'='*60}")
print(f"  ✅ أسئلة سليمة: {len(rows) - len(issues) - len(fixes)}")
print(f"  🔧 أسئلة تحتاج تصحيح correctAnswer: {len(fixes)}")
print(f"  ❌ أسئلة فيها مشاكل: {len(issues)}")
print(f"{'='*60}")

if issues:
    print(f"\n❌ المشاكل ({len(issues)} سؤال):")
    by_type = {}
    for issue in issues:
        t = issue["type"]
        by_type.setdefault(t, []).append(issue)
    for t, items in by_type.items():
        print(f"\n  [{t}] ({len(items)} سؤال):")
        for item in items[:10]:  # أول 10 فقط
            print(f"    - ID {item['id']}: {item['detail']}")
        if len(items) > 10:
            print(f"    ... و{len(items)-10} آخرين")

if fixes:
    print(f"\n🔧 التصحيحات المقترحة ({len(fixes)} سؤال):")
    for f in fixes[:20]:
        print(f"  - ID {f['id']}: {', '.join(f['fixes'])}")
    if len(fixes) > 20:
        print(f"  ... و{len(fixes)-20} آخرين")

# ─────────────────────────────────────────
# تطبيق التصحيحات
# ─────────────────────────────────────────
if fixes:
    print(f"\n🚀 تطبيق {len(fixes)} تصحيح على قاعدة البيانات...")
    fixed_count = 0
    error_count = 0
    
    for f in fixes:
        try:
            q_json = json.dumps(f["question"], ensure_ascii=False)
            if DB_TYPE == "pg":
                cursor.execute(
                    "UPDATE question_bank SET question = %s::jsonb WHERE id = %s",
                    (q_json, f["id"])
                )
            else:
                cursor.execute(
                    "UPDATE question_bank SET question = ? WHERE id = ?",
                    (q_json, f["id"])
                )
            fixed_count += 1
        except Exception as e:
            error_count += 1
            print(f"  ❌ فشل تصحيح ID {f['id']}: {e}")
    
    conn.commit()
    print(f"\n✅ تم تصحيح {fixed_count} سؤال بنجاح")
    if error_count:
        print(f"⚠️  فشل {error_count} سؤال")
else:
    print("\n✅ لا يوجد تصحيحات مطلوبة في correctAnswer")

# ─────────────────────────────────────────
# فحص quizzesTable أيضاً
# ─────────────────────────────────────────
print(f"\n{'='*60}")
print(f"🔍 فحص جدول الاختبارات (quizzes)...")
print(f"{'='*60}")

cursor.execute("SELECT id, title, questions FROM quizzes ORDER BY id")
quiz_rows = cursor.fetchall()
print(f"📊 إجمالي الاختبارات: {len(quiz_rows)}")

quiz_fixes = []
quiz_issues = []

for row in quiz_rows:
    row = dict(row)
    qzid = row["id"]
    title = row["title"]
    raw_qs = row["questions"]
    
    if isinstance(raw_qs, str):
        try:
            questions = json.loads(raw_qs)
        except:
            quiz_issues.append({"id": qzid, "title": title, "type": "JSON_ERROR"})
            continue
    else:
        questions = raw_qs or []

    if not isinstance(questions, list):
        continue

    updated_questions = []
    needs_fix = False

    for i, q in enumerate(questions):
        if not isinstance(q, dict):
            updated_questions.append(q)
            continue
        
        options = q.get("options", [])
        cidx = q.get("correctIndex")
        saved_ca = q.get("correctAnswer", "")
        
        if not isinstance(options, list) or not isinstance(cidx, int):
            updated_questions.append(q)
            continue
        
        if cidx < 0 or cidx >= len(options):
            updated_questions.append(q)
            continue
        
        correct_text = options[cidx].strip() if options[cidx] else ""
        if correct_text and (not saved_ca or saved_ca.strip() != correct_text):
            q = {**q, "correctAnswer": correct_text}
            needs_fix = True
        
        updated_questions.append(q)
    
    if needs_fix:
        quiz_fixes.append({"id": qzid, "title": title, "questions": updated_questions})

print(f"  🔧 اختبارات تحتاج تحديث correctAnswer: {len(quiz_fixes)}")
print(f"  ❌ اختبارات فيها مشاكل: {len(quiz_issues)}")

if quiz_fixes:
    print(f"\n🚀 تطبيق تصحيحات على {len(quiz_fixes)} اختبار...")
    fixed_count = 0
    for f in quiz_fixes:
        try:
            q_json = json.dumps(f["questions"], ensure_ascii=False)
            if DB_TYPE == "pg":
                cursor.execute(
                    "UPDATE quizzes SET questions = %s::jsonb WHERE id = %s",
                    (q_json, f["id"])
                )
            else:
                cursor.execute(
                    "UPDATE quizzes SET questions = ? WHERE id = ?",
                    (q_json, f["id"])
                )
            fixed_count += 1
        except Exception as e:
            print(f"  ❌ فشل تحديث quiz ID {f['id']}: {e}")
    
    conn.commit()
    print(f"✅ تم تحديث {fixed_count} اختبار بنجاح")
else:
    print("✅ كل الاختبارات correctAnswer فيها سليم")

conn.close()
print(f"\n{'='*60}")
print("🎉 انتهى الفحص والإصلاح")
print(f"{'='*60}")
