import psycopg2
conn = psycopg2.connect("postgresql://postgres:pass1234@localhost:5432/profile")
c = conn.cursor()
c.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
print([r[0] for r in c.fetchall()])
conn.close()
