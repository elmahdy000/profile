import psycopg2

try:
    conn = psycopg2.connect("postgresql://postgres:pass1234@localhost:5432/profile")
    cur = conn.cursor()
    cur.execute("SELECT id, name, phone, parent_phone, school_name, center_name, appointment_slot FROM students ORDER BY id DESC LIMIT 5;")
    rows = cur.fetchall()
    print("Local DB students:")
    for r in rows:
        print(r)
    conn.close()
except Exception as e:
    print("Local DB error:", e)
