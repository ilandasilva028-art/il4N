"""Durable state (SQLite, WAL) for the clip factory.

Clip lifecycle:
  DISCOVERED -> CANDIDATE -> ANALYZED -> RENDERING -> VALIDATED -> READY -> SENT
  side exits: REJECTED (score too low / duplicate), FAILED (after retries)
DISCOVERED = moment logged for a source we may not download (rights = discovered).
"""
import difflib, json, os, sqlite3, time

STATES = ["DISCOVERED", "CANDIDATE", "ANALYZED", "RENDERING", "VALIDATED", "READY", "SENT",
          "REJECTED", "FAILED"]
SCHEMA = """
CREATE TABLE IF NOT EXISTS sources(
  id INTEGER PRIMARY KEY, platform TEXT, creator TEXT, source_id TEXT, url TEXT, title TEXT,
  rights TEXT, meta TEXT, discovered_at REAL, UNIQUE(platform, source_id));
CREATE TABLE IF NOT EXISTS clips(
  id INTEGER PRIMARY KEY, platform TEXT, creator TEXT, source_ref TEXT, url TEXT, rights TEXT,
  trigger_ts REAL, win_start REAL, win_end REAL, src_path TEXT, src_offset REAL,
  state TEXT, signals TEXT, score REAL, score_detail TEXT, transcript TEXT,
  cut_start REAL, cut_end REAL, hook TEXT, out_dir TEXT, error TEXT,
  attempts INTEGER DEFAULT 0, created REAL, updated REAL, sent_at REAL);
CREATE INDEX IF NOT EXISTS clips_state ON clips(state);
CREATE TABLE IF NOT EXISTS errors(id INTEGER PRIMARY KEY, ts REAL, component TEXT, message TEXT);
CREATE TABLE IF NOT EXISTS heartbeats(name TEXT PRIMARY KEY, ts REAL, pid INTEGER, info TEXT);
"""


class DB:
    def __init__(self, path):
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        self.c = sqlite3.connect(path, timeout=30, isolation_level=None)
        self.c.row_factory = sqlite3.Row
        self.c.execute("PRAGMA journal_mode=WAL")
        self.c.execute("PRAGMA synchronous=NORMAL")
        self.c.executescript(SCHEMA)
        self.migrate()

    MIGRATIONS = [
        # v1: studio / dashboard
        """ALTER TABLE clips ADD COLUMN approved INTEGER;
           ALTER TABLE clips ADD COLUMN review_note TEXT;
           ALTER TABLE clips ADD COLUMN title TEXT;
           ALTER TABLE clips ADD COLUMN render_params TEXT;
           ALTER TABLE clips ADD COLUMN phase TEXT;
           ALTER TABLE clips ADD COLUMN progress REAL;
           ALTER TABLE clips ADD COLUMN started REAL;
           ALTER TABLE clips ADD COLUMN finished REAL;
           ALTER TABLE clips ADD COLUMN cancel_requested INTEGER DEFAULT 0;
           CREATE TABLE IF NOT EXISTS delivery_history(id INTEGER PRIMARY KEY, clip_id INTEGER, ts REAL,
             action TEXT, detail TEXT);
           CREATE TABLE IF NOT EXISTS system_events(id INTEGER PRIMARY KEY, ts REAL, level TEXT,
             component TEXT, message TEXT);""",
    ]

    def migrate(self):
        v = self.c.execute("PRAGMA user_version").fetchone()[0]
        for i, sql in enumerate(self.MIGRATIONS[v:], start=v + 1):
            self.c.execute("BEGIN")
            try:
                for stmt in [x.strip() for x in sql.split(";") if x.strip()]:
                    try:
                        self.c.execute(stmt)
                    except sqlite3.OperationalError as e:      # column already there (re-run)
                        if "duplicate column" not in str(e):
                            raise
                self.c.execute(f"PRAGMA user_version={i}")
                self.c.execute("COMMIT")
            except Exception:
                self.c.execute("ROLLBACK")
                raise

    def event(self, component, message, level="info"):
        self.c.execute("INSERT INTO system_events(ts,level,component,message) VALUES(?,?,?,?)",
                       (time.time(), level, component, str(message)[:1000]))

    def delivery(self, clip_id, action, detail=""):
        self.c.execute("INSERT INTO delivery_history(clip_id,ts,action,detail) VALUES(?,?,?,?)",
                       (clip_id, time.time(), action, str(detail)[:1000]))

    # ---------- clips ----------
    def find_overlap(self, platform, creator, source_ref, ts, margin):
        return self.c.execute(
            "SELECT * FROM clips WHERE platform=? AND creator=? AND source_ref=? "
            "AND ABS(trigger_ts-?) < ? AND state NOT IN ('FAILED') ORDER BY id LIMIT 1",
            (platform, creator, source_ref, ts, margin)).fetchone()

    def add_clip(self, platform, creator, source_ref, url, rights, trigger_ts, signals,
                 state, margin=60, **fields):
        """Insert a moment unless it overlaps an existing one (then merge the signals). Returns id or None."""
        dup = self.find_overlap(platform, creator, source_ref, trigger_ts, margin)
        if dup:
            sig = json.loads(dup["signals"] or "[]") + [signals]
            self.c.execute("UPDATE clips SET signals=?, updated=? WHERE id=?",
                           (json.dumps(sig, ensure_ascii=False), time.time(), dup["id"]))
            return None
        now = time.time()
        cols = dict(platform=platform, creator=creator, source_ref=source_ref, url=url, rights=rights,
                    trigger_ts=trigger_ts, signals=json.dumps([signals], ensure_ascii=False),
                    state=state, created=now, updated=now, **fields)
        q = f"INSERT INTO clips({','.join(cols)}) VALUES({','.join('?' * len(cols))})"
        return self.c.execute(q, list(cols.values())).lastrowid

    def set(self, clip_id, state=None, **fields):
        if state:
            assert state in STATES, state
            fields["state"] = state
        fields["updated"] = time.time()
        sets = ",".join(f"{k}=?" for k in fields)
        self.c.execute(f"UPDATE clips SET {sets} WHERE id=?", [*fields.values(), clip_id])

    def get(self, clip_id):
        return self.c.execute("SELECT * FROM clips WHERE id=?", (clip_id,)).fetchone()

    def by_state(self, *states):
        q = f"SELECT * FROM clips WHERE state IN ({','.join('?' * len(states))}) ORDER BY id"
        return self.c.execute(q, states).fetchall()

    def counts(self):
        return {r[0]: r[1] for r in self.c.execute("SELECT state, COUNT(*) FROM clips GROUP BY state")}

    def similar_transcript(self, creator, text, threshold=0.8, exclude_id=None):
        """True if a finished clip of this creator says almost the same thing (duplicate moment)."""
        if not text or len(text) < 20:
            return False
        rows = self.c.execute(
            "SELECT id, transcript FROM clips WHERE creator=? AND state IN ('VALIDATED','READY','SENT')",
            (creator,)).fetchall()
        for r in rows:
            if r["id"] != exclude_id and r["transcript"] and \
                    difflib.SequenceMatcher(None, text, r["transcript"]).ratio() >= threshold:
                return True
        return False

    def recent_hooks(self, creator, n=10):
        return [r[0] for r in self.c.execute(
            "SELECT hook FROM clips WHERE creator=? AND hook IS NOT NULL ORDER BY id DESC LIMIT ?",
            (creator, n))]

    # ---------- sources / errors / heartbeats ----------
    def add_source(self, platform, creator, source_id, url, title, rights, meta=None):
        try:
            self.c.execute("INSERT INTO sources(platform,creator,source_id,url,title,rights,meta,discovered_at)"
                           " VALUES(?,?,?,?,?,?,?,?)", (platform, creator, source_id, url, title, rights,
                                                        json.dumps(meta or {}, ensure_ascii=False), time.time()))
            return True
        except sqlite3.IntegrityError:
            return False                      # already known

    def error(self, component, message):
        self.c.execute("INSERT INTO errors(ts,component,message) VALUES(?,?,?)",
                       (time.time(), component, str(message)[:2000]))
        try:
            self.event(component, str(message)[:300], "error")
        except sqlite3.OperationalError:
            pass

    def last_errors(self, n=10):
        return self.c.execute("SELECT * FROM errors ORDER BY id DESC LIMIT ?", (n,)).fetchall()

    def beat(self, name, info=""):
        self.c.execute("INSERT OR REPLACE INTO heartbeats(name,ts,pid,info) VALUES(?,?,?,?)",
                       (name, time.time(), os.getpid(), info))

    def beats(self):
        return self.c.execute("SELECT * FROM heartbeats ORDER BY name").fetchall()
