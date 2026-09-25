import psycopg2
conn = psycopg2.connect("postgresql://postgres:pass1234@localhost:5432/profile")
c = conn.cursor()
c.execute("SELECT COUNT(*) FROM quiz_attempts")
print("quiz_attempts:", c.fetchone())
c.execute("SELECT COUNT(*) FROM quizzes")
print("quizzes:", c.fetchone())

# Check questions column structure
c.execute("SELECT id, title, questions FROM quizzes LIMIT 1")
row = c.fetchone()
if row:
    import json
    qs = row[2]
    print("First quiz:", row[0], row[1])
    print("Questions type:", type(qs))
    if isinstance(qs, list) and qs:
        print("First Q keys:", list(qs[0].keys()) if isinstance(qs[0], dict) else qs[0])
conn.close()
