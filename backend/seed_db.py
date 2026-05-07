"""Verify studio.db tables are present and accessible."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "studio.db")


def verify(conn):
    cur = conn.cursor()
    print("\n=== Table Verification ===")
    tables = [
        "users", "use_cases", "documents", "chunks", "rag_configs",
        "agent_runs", "agent_trace_steps", "retrieved_chunks",
        "golden_questions", "evaluation_runs", "evaluation_results", "reports",
    ]
    all_ok = True
    for t in tables:
        try:
            cur.execute(f'SELECT COUNT(*) FROM "{t}"')
            count = cur.fetchone()[0]
            print(f"  [OK]    {t:<30} {count} row(s)")
        except Exception as e:
            print(f"  [ERROR] {t:<30} {e}")
            all_ok = False
    print()
    print("All tables verified." if all_ok else "WARNING: Some tables are missing.")
    return all_ok


if __name__ == "__main__":
    print(f"DB: {os.path.abspath(DB_PATH)}")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    verify(conn)
    conn.close()
