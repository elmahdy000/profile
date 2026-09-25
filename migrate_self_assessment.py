import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(title, sql):
    print(f"=== {title} ===")
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile"')
    stdin.write(sql)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(out)
    if err: print("ERR:", err)

q("ADD COLUMNS TO self_assessment_entitlements", """
ALTER TABLE self_assessment_entitlements 
ADD COLUMN IF NOT EXISTS activation_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS receipt_status VARCHAR(20) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_self_assessment_code ON self_assessment_entitlements (activation_code);
CREATE INDEX IF NOT EXISTS idx_self_assessment_sessions_phone ON self_assessment_sessions (phone);
""")

q("VERIFY COLUMNS", """
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'self_assessment_entitlements';
""")

c.close()
